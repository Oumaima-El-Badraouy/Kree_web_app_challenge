const User = require('../models/User');
const Request = require('../models/Request');
const Proposal = require('../models/Proposal');
const Booking = require('../models/Booking');

// Get platform statistics
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalAgencies = await User.countDocuments({ role: 'agency' });
    const verifiedAgencies = await User.countDocuments({ role: 'agency', verified: true });
        // New model statistics
    const totalRequests = await Request.countDocuments();
    const openRequests = await Request.countDocuments({ status: { $in: ['open', 'proposals_received'] } });
    const totalProposals = await Proposal.countDocuments();
    const pendingProposals = await Proposal.countDocuments({ status: 'pending' });
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: { $in: ['booked', 'confirmed', 'picked_up'] } });

    // Calculate revenue from Delivered bookings
    const DeliveredBookings = await Booking.find({ 'payment.status': 'Delivered' });
    const totalRevenue = DeliveredBookings.reduce((sum, b) => sum + b.pricing.platformFee, 0);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          agencies: totalAgencies,
          verifiedAgencies
        },
        requests: {
          total: totalRequests,
          open: openRequests
        },
        proposals: {
          total: totalProposals,
          pending: pendingProposals
        },
        bookings: {
          total: totalBookings,
          active: activeBookings
        },
        revenue: {
          total: totalRevenue,
          currency: 'MAD'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, verified, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (verified !== undefined) query.verified = verified === 'true';

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
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

// Verify agency
exports.verifyAgency = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    const user = await User.findById(userId);

    if (!user || user.role !== 'agency') {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }

    user.verified = verified;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Agency ${verified ? 'verified' : 'unverified'} successfully`,
      data: user.toPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate user
exports.deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings (admin view)
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('customer', 'fullName email')
      .populate('agency', 'agencyName email')
      .populate('request')
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
