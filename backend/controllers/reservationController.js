const Reservation = require('../models/Reservation');
const Bid = require('../models/Bid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create reservation (after bid accepted)
exports.createReservation = async (req, res, next) => {
  try {
    const { bidId } = req.body;

    const bid = await Bid.findById(bidId)
      .populate('car')
      .populate('customer')
      .populate('agency');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    if (bid.status !== 'oncoming') {
      return res.status(400).json({
        success: false,
        message: 'Bid must be accepted before creating reservation'
      });
    }

    // Check if reservation already exists
    const existingReservation = await Reservation.findOne({ bid: bidId });
    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: 'Reservation already exists for this bid'
      });
    }

    // Calculate pricing
    const pricePerDay = bid.finalPrice;
    const totalPrice = pricePerDay * bid.numberOfDays;
    const platformFee = totalPrice * parseFloat(process.env.PLATFORM_COMMISSION_RATE || 0.15);
    const agencyEarnings = totalPrice - platformFee;

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        bidId: bid._id.toString(),
        customerId: bid.customer._id.toString(),
        agencyId: bid.agency._id.toString(),
        carId: bid.car._id.toString()
      },
      description: `Car Rental: ${bid.car.make} ${bid.car.model} for ${bid.numberOfDays} days`
    });

    // Create reservation
    const reservation = await Reservation.create({
      customer: bid.customer._id,
      agency: bid.agency._id,
      car: bid.car._id,
      bid: bid._id,
      rentalPeriod: bid.rentalPeriod,
      numberOfDays: bid.numberOfDays,
      pricing: {
        pricePerDay,
        totalPrice,
        platformFee,
        agencyEarnings
      },
      payment: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending'
      }
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('car', 'make model year images category')
      .populate('customer', 'firstName lastName email phone')
      .populate('agency', 'agencyName email phone address');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        reservation: populatedReservation,
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get customer reservations
exports.getCustomerReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ customer: req.user._id })
      .populate('car', 'make model year images category')
      .populate('agency', 'agencyName phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// Get agency reservations
exports.getAgencyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ agency: req.user._id })
      .populate('car', 'make model year images category')
      .populate('customer', 'firstName lastName phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// Get single reservation
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('car')
      .populate('customer', 'firstName lastName phone email')
      .populate('agency', 'agencyName phone email address');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check authorization
    const isCustomer = reservation.customer._id.toString() === req.user._id.toString();
    const isAgency = reservation.agency._id.toString() === req.user._id.toString();

    if (!isCustomer && !isAgency && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// Confirm payment (Stripe webhook handler)
exports.confirmPayment = async (req, res, next) => {
  try {
    const { reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    reservation.payment.status = 'held_in_escrow';
    reservation.payment.paidAt = new Date();
    reservation.status = 'confirmed';

    await reservation.save();

    // Emit socket event
    if (req.app.io) {
      req.app.io.to(`agency_${reservation.agency}`).emit('paymentConfirmed', {
        reservationId: reservation._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Check authorization
    const isCustomer = reservation.customer.toString() === req.user._id.toString();
    const isAgency = reservation.agency.toString() === req.user._id.toString();

    if (!isCustomer && !isAgency && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Process refund if payment was made
    let refundAmount = 0;
    if (reservation.payment.status === 'held_in_escrow' || reservation.payment.status === 'paid') {
      // Calculate refund based on cancellation policy
      const daysUntilStart = Math.ceil(
        (new Date(reservation.rentalPeriod.startDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilStart > 7) {
        refundAmount = reservation.pricing.totalPrice * 0.9; // 90% refund
      } else if (daysUntilStart > 3) {
        refundAmount = reservation.pricing.totalPrice * 0.5; // 50% refund
      }

      // Process Stripe refund
      if (refundAmount > 0 && reservation.payment.stripePaymentIntentId) {
        await stripe.refunds.create({
          payment_intent: reservation.payment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100)
        });
      }

      reservation.payment.status = 'refunded';
      reservation.payment.refundedAt = new Date();
    }

    reservation.status = 'cancelled';
    reservation.cancellation = {
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      reason,
      refundAmount
    };

    await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled',
      data: {
        reservation,
        refundAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update reservation status
exports.updateReservationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    reservation.status = status;

    // If Delivered, release payment to agency
    if (status === 'Delivered' && reservation.payment.status === 'held_in_escrow') {
      reservation.payment.status = 'released_to_agency';
      reservation.payment.releasedAt = new Date();
      
      // Here you would typically transfer funds to agency's Stripe Connect account
    }

    await reservation.save();

    res.status(200).json({
      success: true,
      message: 'Reservation status updated',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};
