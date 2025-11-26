const Booking = require('../models/Booking');
const Proposal = require('../models/Proposal');
const Request = require('../models/Request');

exports.createBooking = async (req, res, next) => {
  try {
    const { proposalId } = req.body;

    // Récupérer la proposition et ses relations
    const proposal = await Proposal.findById(proposalId)
      .populate('request')
      .populate('agency', 'agencyName email phone address');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    // Vérifier l'autorisation
    if (proposal.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Préparer les données de réservation
    const startDate = new Date(proposal.availability.startDate);
    const endDate = new Date(proposal.availability.endDate);
    const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

    const bookingData = {
      customer: proposal.customer,
      agency: proposal.agency._id,
      request: proposal.request._id,
      proposal: proposal._id,
      car: { ...proposal.car },
      rentalPeriod: { startDate, endDate },
      numberOfDays,
      pricing: {
        pricePerDay: proposal.pricing.pricePerDay,
        totalPrice: proposal.pricing.totalPrice,
        platformFee: proposal.pricing.totalPrice * 0.10,
        agencyEarnings: proposal.pricing.totalPrice * 0.90
      },
      pickupDetails: {
        location: proposal.pickupLocation?.address || proposal.agency.address?.street || '',
        address: proposal.pickupLocation?.address || proposal.agency.address?.street || '',
        city: proposal.pickupLocation?.city || proposal.agency.address?.city || '',
        scheduledTime: startDate
      },
      bookingNumber: `KB-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`
    };

    const booking = new Booking(bookingData);
    await booking.save();

    // Mettre à jour le statut de la demande
    const request = await Request.findById(proposal.request);
    request.status = 'oncoming';
    request.acceptedProposal = proposal._id;
    await request.save();

    // Rejeter les autres propositions
    await Proposal.updateMany(
      { request: proposal.request, _id: { $ne: proposal._id }, status: "pending" },
      { status: "rejected" }
    );

    // 🔹 Socket.IO notification sécurisée
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${proposal.customer}`).emit('booking_created', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        agency: proposal.agency.agencyName,
        car: booking.car,
        rentalPeriod: booking.rentalPeriod
      });
    } else {
      console.warn('Socket.io instance not available for booking notification');
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: booking
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    next(error);
  }
};




// Get customer bookings
exports.getCustomerBookings = async (req, res, next) => {
  try {
    // Récupération des query params
    const { status, page = 1, limit = 10 } = req.query;

    // Conversion en nombres
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Création de la query
    const query = { customer: req.user._id };
    
    // Filtre par status si fourni (multi-values séparés par une virgule)
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = { $in: statuses };
    }

    // Récupération des bookings
    const bookings = await Booking.find(query)
      .populate('agency', 'agencyName email phone address rating')
      .populate('request')
      .populate('proposal')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Nombre total pour pagination
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Error in getCustomerBookings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getMyActiveBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      customer: req.user._id,
      status: { $ne: "Delivered" } // أي حاجة ماشي Delivered
    })
      .populate("agency", "agencyName phone email address")
      .populate("proposal")
      .populate("request")
      .sort({ createdAt: -1 });

    if (!booking) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });

  } catch (error) {
    next(error);
  }
};

// Get agency bookings
exports.getAgencyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { agency: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('customer', 'fullName email phone')
      .populate('request')
      .populate('proposal')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single booking
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'fullName email phone')
      .populate('agency', 'agencyName email phone address rating')
      .populate('request')
      .populate('proposal');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.customer._id.toString() !== req.user._id.toString() && 
        booking.agency._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Confirm booking (Agency confirms after customer arrives)
exports.confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
  

    if (booking.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be confirmed'
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Mark car as picked up (Agency)
exports.markAsPickedUp = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.agency.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the agency can mark car as picked up'
      });
    }

    if (booking.status !== 'confirmed' && booking.status !== 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status'
      });
    }

    booking.status = 'picked_up';
    booking.pickupDetails.actualTime = new Date();
    booking.payment.status = 'paid';
    booking.payment.paidAt = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Car marked as picked up. Payment received.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Mark car as returned (Agency)
exports.markAsReturned = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.agency.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the agency can mark car as returned'
      });
    }

    if (booking.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Car must be Delivered first'
      });
    }

    booking.status = 'returned';
    booking.returnDetails.actualTime = new Date();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Car marked as returned',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Complete booking (Admin or auto-complete after return)
// Complete booking (Admin or auto-complete after return)
exports.completeBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'Delivered';
    booking.payment.status = 'Delivered';
    booking.payment.DeliveredAt = new Date();
    await booking.save();

    await Request.findByIdAndUpdate(booking.request, { status: 'Delivered' });

    // 🔹 Emit socket event to customer
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${booking.customer}`).emit('booking_status_update', {
        bookingId: booking._id,
        status: 'Delivered'
      });
    } else {
      console.warn('Socket.io instance not available for booking_status_update');
    }

    res.status(200).json({
      success: true,
      message: 'Booking Delivered successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};



// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.customer.toString() !== req.user._id.toString() && 
        booking.agency.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    // Cannot cancel if already picked up
    if (['picked_up', 'returned', 'Delivered'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking that is already in progress or Delivered'
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      reason: reason || 'No reason provided'
    };
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings (Admin only)
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('customer', 'fullName email')
      .populate('agency', 'agencyName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
