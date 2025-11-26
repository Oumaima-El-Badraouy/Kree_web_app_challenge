const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const { protect } = require('../middleware/auth');

// Get customer score
router.get('/my', protect, async (req, res) => {
  try {
    const score = await Score.findOne({ customer: req.user._id }) || { points: 0 };
    res.json({ success: true, points: score.points });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
