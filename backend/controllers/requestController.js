const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/notification.js');
const mongoose = require('mongoose'); 
const { addPointsForDelivery } = require('./scoreController');

// Create a new dream car request (Customer only)
exports.createRequest = async (req, res, next) => {
  try {
    const requestData = { ...req.body, customer: req.user._id };
    const request = await Request.create(requestData);

    // Only notify agencies if location.city is provided
    let notifiedCount = 0;
    if (request.location && request.location.city && request.location.city.trim()) {
      const agencies = await User.find({
        role: 'agency',
        verified: true,
        'location.city': new RegExp(request.location.city, 'i')
      }).select('_id agencyName email');

      request.notifiedAgencies = agencies.map(a => a._id);
      await request.save();

      for (const agency of agencies) {
        const notif = await Notification.create({
          recipient: agency._id,
          sender: req.user._id,
          type: 'request',
          message: `${req.user.firstName || 'An user'} has submitted a new request in ${request.location.city}.`,
          link: `/agency/requests/${request._id}`
        });
        if (req.io) {
          req.io.to(`user_${agency._id}`).emit('new_request', notif);
        }
      }
      notifiedCount = agencies.length;
    }

    res.status(201).json({
      success: true,
      message: 'Dream car request created successfully',
      data: request,
      notifiedAgencies: notifiedCount
    });

  } catch (error) {
    next(error);
  }
};
exports.getCustomerRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    let customId;
    if (req.params.customId) {
      customId = req.params.customId;
    } else {
      customId = req.user._id;
    }
    const customerObjectId = new mongoose.Types.ObjectId(customId);
    const query = { customer: customerObjectId };
    if (status) query.status = status;
    console.log('Query MongoDB:', query);
    const requests = await Request.find(query)
      .populate('customer', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Request.countDocuments(query);
    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getCustomerRequests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      stack: error.stack,
    });
  }
};





// Get single request details
exports.getRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('customer', 'fullName email phone')
      .populate('acceptedProposal');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }


    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};
exports.complletreq = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'Delivered';
    await request.save();
    await addPointsForDelivery(request.customer, req.user._id, req.io);

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};
// Cancel request (Customer only)
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check ownership
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    if ( request.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an accepted or Delivered request'
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all requests (Agency and admin only)
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const requests = await Request.find(query)
      .populate('customer', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      data: requests,
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
