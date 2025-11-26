const express = require('express');
const router = express.Router();
const { 
  createProposal, 
  getRequestProposals, 
  getAgencyProposals, 
  getCustomerProposals, 
  updateProposal, 
  withdrawProposal, 
  getAllProposals 
} = require('../controllers/proposalController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// // Agency routes
router.post('/:requestId', 
  protect, 
 authorize('agency'), 
  upload.array('carImages', 10), 
 createProposal
);
router.get('/agency/my-proposals', protect, authorize('agency'), getAgencyProposals);
router.put('/:id', protect, authorize('agency'), upload.array('carImages', 10), updateProposal);
router.delete('/:id', protect, authorize('agency'), withdrawProposal);

// Customer routes
router.get('/request/:requestId', protect, getRequestProposals);
router.get('/customer/my-proposals', protect, authorize('customer'), getCustomerProposals);

// Admin routes
 router.get('/admin/all', protect, authorize('admin'), getAllProposals);

module.exports = router;