const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createReview, getReviewsByCustomer } = require('../controllers/reviewController');

router.post('/', protect, authorize('customer'), createReview);
 router.get('/customer/:customerId', protect, authorize('agency', 'admin'), getReviewsByCustomer);
module.exports = router;
