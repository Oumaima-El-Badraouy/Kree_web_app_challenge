const express = require('express');
const router = express.Router();
const {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  getAgencyCars
} = require('../controllers/carController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getCars);
router.get('/:id', getCar);

// Protected routes (Agency only)
 router.post('/', protect, authorize('agency'), upload.array('carImages', 10), createCar);
 router.put('/:id', protect, authorize('agency', 'admin'), upload.array('carImages', 10), updateCar);
 router.delete('/:id', protect, authorize('agency', 'admin'), deleteCar);
 router.get('/agency/my-cars', protect, authorize('agency'), getAgencyCars);

module.exports = router;
