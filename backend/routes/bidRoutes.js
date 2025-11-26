const express = require('express');
const router = express.Router();
const {
  createBid,
  getCustomerBids,
  getAgencyBids,
  counterOffer,
  acceptBid,
  rejectBid,
  getBid
} = require('../controllers/bidController');
const { protect, authorize } = require('../middleware/auth');

// Customer routes
router.post('/', protect, authorize('customer'), createBid);
router.get('/customer', protect, authorize('customer'), getCustomerBids);

// Agency routes
 router.get('/agency', protect, authorize('agency'), getAgencyBids);
 router.post('/:bidId/counter', protect, authorize('agency'), counterOffer);

// Shared routes
router.get('/:bidId', protect, getBid);
router.post('/:bidId/accept', protect, acceptBid);
router.post('/:bidId/reject', protect, rejectBid);

module.exports = router;
