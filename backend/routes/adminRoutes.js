const express = require('express');
const router = express.Router();
const { 
  getStats, 
  getUsers, 
  verifyAgency, 
  deactivateUser, 
  getAllBookings 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

// Platform statistics
router.get('/stats', getStats);

// User management
router.get('/users', getUsers);
router.put('/users/:userId/verify', verifyAgency);
router.put('/users/:userId/deactivate', deactivateUser);

// Booking management (admin view)
router.get('/bookings', getAllBookings);

module.exports = router;