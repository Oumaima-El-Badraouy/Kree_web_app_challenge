const Proposal = require('../models/Proposal');
const Request = require('../models/Request');
const path = require('path');


exports.createProposal = async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestData = await Request.findById(requestId);

    if (!requestData) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Parse car, pricing, pickupLocation
    let car, pricing, pickupLocation;
    try {
      car = typeof req.body.car === 'string' ? JSON.parse(req.body.car) : req.body.car;
      pricing = typeof req.body.pricing === 'string' ? JSON.parse(req.body.pricing) : req.body.pricing;
      pickupLocation = typeof req.body.pickupLocation === 'string' ? JSON.parse(req.body.pickupLocation) : req.body.pickupLocation;
    } catch (parseError) {
      return res.status(400).json({ success: false, message: 'Invalid data format', error: parseError.message });
    }

    // Stocker images
    if (req.files && req.files.length > 0) {
      car.images = req.files.map(file => `/uploads/cars/${path.basename(file.path)}`);
    } else {
      car.images = car.images || [];
    }

    // Calcul du prix total
    let totalPrice = pricing.pricePerDay;
    if (requestData.rentalPeriod?.startDate && requestData.rentalPeriod?.endDate) {
      const startDate = new Date(requestData.rentalPeriod.startDate);
      const endDate = new Date(requestData.rentalPeriod.endDate);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
      totalPrice = pricing.pricePerDay * days;
    }

    const completePricing = {
      pricePerDay: Number(pricing.pricePerDay),
      totalPrice: Number(totalPrice),
    };

    const proposal = await Proposal.create({
      request: requestId,
      agency: req.user.id,
      customer: requestData.customer,
      car: {
        make: car.make?.trim(),
        model: car.model?.trim(),
        year: Number(car.year),
        category: car.category,
        images: car.images,
        specifications: car.specifications || {},
        features: car.features || [],
      },
      pricing: completePricing,
      pickupLocation: pickupLocation || {},
      agencyNotes: req.body.agencyNotes?.trim() || '',
      status: 'pending',
      submittedAt: new Date(),
      availability: {
        startDate: requestData.rentalPeriod?.startDate || new Date(),
        endDate: requestData.rentalPeriod?.endDate || new Date(Date.now() + 7*24*60*60*1000),
      },
    });

    // 🔹 Socket notification
  // 🔹 Socket notification
const io = req.app.get('io'); // Récupère l'instance socket depuis app

if (io) {
  console.log('🟢 Socket.IO instance found'); // ✅ Vérifie que l'instance existe
  console.log(`📡 Emitting newProposal to customer_${requestData.customer}`); // ✅ Room ciblée
  console.log('Proposal data:', {
    proposalId: proposal._id,
    requestId: requestId,
    agency: req.user.agencyName || 'An agency',
    agencyId: req.user.id,
  });

  io.to(`request_${requestId}`).emit("newProposal",{
    proposalId: proposal._id,
    requestId: requestId,
    agency: req.user.agencyName || 'An agency',
    agencyId: req.user.id,
    message: `${req.user.agencyName || 'An agency'} submitted a new proposal.`,
    car: proposal.car,
    pricing: proposal.pricing,
    pickupLocation: proposal.pickupLocation,
  });

  console.log('✅ newProposal event emitted');
} else {
  console.warn('⚠️ Socket.io instance is not available');
}


    res.json({ success: true, message: 'Proposal submitted successfully', data: proposal });

  } catch (error) {
    console.error('Proposal creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit proposal', error: error.message });
  }
};




// Get proposals for a request (Customer view)
exports.getRequestProposals = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check authorization
    if (request.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these proposals'
      });
    }

    const proposals = await Proposal.find({ 
  request: requestId,
  status: { $ne: 'withdrawn' }
})
.populate('agency', 'agencyName rating verified phone email address')
.sort({ createdAt: -1 })
.lean();


    res.status(200).json({
      success: true,
      data: proposals
    });
  } catch (error) {
    next(error);
  }
};
// Get agency's proposals
exports.getAgencyProposals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { agency: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const proposals = await Proposal.find(query)
      .populate('request')
      .populate('customer', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: proposals,
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

// Get proposals for a customer (Customer view - list all proposals related to the authenticated customer)
exports.getCustomerProposals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const proposals = await Proposal.find(query)
      .populate('agency', 'agencyName rating verified phone email address')
      .populate('request')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: proposals,
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

// Update proposal (Agency only - before acceptance)
exports.updateProposal = async (req, res, next) => {
  try {
    let proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check ownership
    if (proposal.agency.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this proposal'
      });
    }

    // Cannot update if already accepted/rejected
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a proposal that is no longer pending'
      });
    }

    const updateData = { ...req.body };

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/cars/${file.filename}`);
      updateData.car = {
        ...updateData.car,
        images: [...(proposal.car.images || []), ...newImages]
      };
    }

    proposal = await Proposal.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully',
      data: proposal
    });
  } catch (error) {
    next(error);
  }
};

// Withdraw proposal (Agency only)
exports.withdrawProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check ownership
    if (proposal.agency.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this proposal'
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only withdraw pending proposals'
      });
    }

    proposal.status = 'withdrawn';
    await proposal.save();

    // Update request proposals count
    const request = await Request.findById(proposal.request);
    if (request) {
      request.proposalsCount = Math.max(0, request.proposalsCount - 1);
      await request.save();
    }

    res.status(200).json({
      success: true,
      message: 'Proposal withdrawn successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all proposals (Admin only)
exports.getAllProposals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const proposals = await Proposal.find(query)
      .populate('agency', 'agencyName email')
      .populate('customer', 'fullName email')
      .populate('request')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: proposals,
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



exports.getCustomerProposals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const proposals = await Proposal.find(query)
      .populate('request')
      .populate('customer', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Proposal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: proposals,
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