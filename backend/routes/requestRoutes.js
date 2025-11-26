const express = require('express');
const router = express.Router();
const { 
  createRequest, 
  getCustomerRequests, 
  getAgencyRequests, 
  getRequest, 
  cancelRequest, 
  getAllRequests,
  complletreq,
  cancelAcceptedRequest
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');

// Customer routes
router.post('/', protect, authorize('customer'), createRequest);

// Agency routes and
// Admin routes
 router.get('/agency/available', protect, authorize('agency', 'admin'), getAllRequests);
router.get('/my_requests/customers/:customId', protect, authorize('customer'), getCustomerRequests);
 router.patch('/:id/complete', protect, authorize('agency'),complletreq)
 router.get('/:id', protect,authorize('agency','customer'), getRequest);
router.delete('/:id', protect, authorize('customer'), cancelRequest);


module.exports = router;