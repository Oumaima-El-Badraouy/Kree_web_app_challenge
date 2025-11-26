const express = require('express');
const router = express.Router();
const {
  createReservation,
  getCustomerReservations,
  getAgencyReservations,
  getReservation,
  confirmPayment,
  cancelReservation,
  updateReservationStatus
} = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');

// Customer routes
router.post('/', protect, authorize('customer'), createReservation);
router.get('/customer', protect, authorize('customer'), getCustomerReservations);

 router.get('/agency', protect, authorize('agency'), getAgencyReservations);

// Shared routes
router.get('/:id', protect, getReservation);
router.post('/:reservationId/confirm-payment', confirmPayment);
router.post('/:id/cancel', protect, cancelReservation);
router.put('/:id/status', protect, authorize('agency', 'admin'), updateReservationStatus);

module.exports = router;
