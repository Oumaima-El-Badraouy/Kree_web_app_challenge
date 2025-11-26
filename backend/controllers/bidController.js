const Bid = require('../models/Bid');
const Car = require('../models/Car');
const Chat = require('../models/Chat');

// Create bid (Customer only)
exports.createBid = async (req, res, next) => {
  try {
    const { carId, customerProposedPrice, startDate, endDate, notes } = req.body;

    // Get car details
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (numberOfDays < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rental period'
      });
    }

    // Create bid
    const bid = await Bid.create({
      customer: req.user._id,
      car: carId,
      agency: car.agency,
      customerProposedPrice,
      rentalPeriod: {
        startDate: start,
        endDate: end
      },
      numberOfDays,
      notes
    });

    // Create chat for this bid
    await Chat.create({
      bid: bid._id,
      customer: req.user._id,
      agency: car.agency,
      car: carId,
      messages: []
    });

    const populatedBid = await Bid.findById(bid._id)
      .populate('car', 'make model year images category')
      .populate('agency', 'agencyName rating');

    // Emit socket event for new bid (handled in socket.js)
    if (req.app.io) {
      req.app.io.to(`agency_${car.agency}`).emit('newBid', populatedBid);
    }

    res.status(201).json({
      success: true,
      message: 'Bid submitted successfully',
      data: populatedBid
    });
  } catch (error) {
    next(error);
  }
};

// Get customer bids
exports.getCustomerBids = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { customer: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const bids = await Bid.find(query)
      .populate('car', 'make model year images category pricePerDay')
      .populate('agency', 'agencyName rating verified')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bids
    });
  } catch (error) {
    next(error);
  }
};

// Get agency bids
exports.getAgencyBids = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { agency: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const bids = await Bid.find(query)
      .populate('car', 'make model year images category pricePerDay')
      .populate('customer', 'firstName lastName phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bids
    });
  } catch (error) {
    next(error);
  }
};

// Counter offer (Agency only)
exports.counterOffer = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const { agencyCounterOffer, agencyNotes } = req.body;

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check ownership
    if (bid.agency.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (bid.status !== 'pending' && bid.status !== 'countered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot counter this bid'
      });
    }

    bid.agencyCounterOffer = agencyCounterOffer;
    bid.agencyNotes = agencyNotes;
    bid.status = 'countered';
    await bid.save();

    const populatedBid = await Bid.findById(bid._id)
      .populate('car', 'make model year images category')
      .populate('customer', 'firstName lastName');

    // Emit socket event
    if (req.app.io) {
      req.app.io.to(`customer_${bid.customer}`).emit('bidCountered', populatedBid);
    }

    res.status(200).json({
      success: true,
      message: 'Counter offer sent successfully',
      data: populatedBid
    });
  } catch (error) {
    next(error);
  }
};

// Accept bid
exports.acceptBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const { finalPrice } = req.body;

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization - customer can accept agency counter, agency can accept customer price
    const isCustomer = bid.customer.toString() === req.user._id.toString();
    const isAgency = bid.agency.toString() === req.user._id.toString();

    if (!isCustomer && !isAgency) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    bid.finalPrice = finalPrice || bid.agencyCounterOffer || bid.customerProposedPrice;
    bid.status = 'oncoming';
    await bid.save();

    const populatedBid = await Bid.findById(bid._id)
      .populate('car')
      .populate('customer')
      .populate('agency');

    // Emit socket event
    if (req.app.io) {
      const targetRoom = isCustomer ? `agency_${bid.agency}` : `customer_${bid.customer}`;
      req.app.io.to(targetRoom).emit('bidAccepted', populatedBid);
    }

    res.status(200).json({
      success: true,
      message: 'Bid accepted successfully',
      data: populatedBid
    });
  } catch (error) {
    next(error);
  }
};

// Reject bid
exports.rejectBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Both customer and agency can reject
    const isCustomer = bid.customer.toString() === req.user._id.toString();
    const isAgency = bid.agency.toString() === req.user._id.toString();

    if (!isCustomer && !isAgency) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    bid.status = 'rejected';
    await bid.save();

    // Emit socket event
    if (req.app.io) {
      const targetRoom = isCustomer ? `agency_${bid.agency}` : `customer_${bid.customer}`;
      req.app.io.to(targetRoom).emit('bidRejected', { bidId: bid._id });
    }

    res.status(200).json({
      success: true,
      message: 'Bid rejected'
    });
  } catch (error) {
    next(error);
  }
};

// Get bid details
exports.getBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.bidId)
      .populate('car')
      .populate('customer', 'firstName lastName phone email')
      .populate('agency', 'agencyName phone email address rating');

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check authorization
    const isCustomer = bid.customer._id.toString() === req.user._id.toString();
    const isAgency = bid.agency._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAgency && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      data: bid
    });
  } catch (error) {
    next(error);
  }
};
