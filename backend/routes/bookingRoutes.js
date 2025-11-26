const express = require('express');
const router = express.Router();
const { 
  createBooking, 
  getCustomerBookings, 
  getAgencyBookings, 
  getBooking, 
  confirmBooking, 
  markAsPickedUp, 
  markAsReturned, 
  completeBooking, 
  cancelBooking, 
  getAllBookings,
  getMyActiveBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// Customer routes
router.post('/', protect, authorize('customer'), createBooking);
router.get('/my-bookings', protect, authorize('customer'), getCustomerBookings);
router.get('/my-active', protect, authorize('customer'), getMyActiveBooking);

router.put('/:id/cancel', protect, authorize('customer'), cancelBooking);

// Agency routes
 router.get('/agency/my-bookings', protect, authorize('agency'), getAgencyBookings);
 router.put('/:id/confirm', protect, authorize('agency'), confirmBooking);
 router.put('/:id/picked-up', protect, authorize('agency'), markAsPickedUp);
 router.put('/:id/returned', protect, authorize('agency'), markAsReturned);

// Shared routes (both customer and agency)
router.get('/:id', protect, getBooking);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllBookings);
 router.put('/:id/complete', protect, authorize('admin','agency'), completeBooking);

module.exports = router;