const Review = require('../models/Review');
const Booking = require('../models/Booking');

exports.createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    // 1) Check booking exists
    const booking = await Booking.findById(bookingId)
      .populate('customer')
      .populate('agency');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let reviewData = {
      booking: booking._id,
      rating,
      comment
    };

    // 2) Role logic
    if (req.user.role === 'customer') {
      if (req.user._id.toString() !== booking.customer._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your booking' });
      }
      reviewData.customer = req.user._id;
      reviewData.agency = booking.agency;
    }

    else if (req.user.role === 'agency') {
      if (req.user._id.toString() !== booking.agency._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your booking' });
      }
      reviewData.agency = req.user._id;
      reviewData.customer = booking.customer;
    }

    else {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }

    // 3) Create review
    const review = await Review.create(reviewData);

    res.status(201).json({ success: true, data: review });

  } catch (err) {
    console.error("Error creating review:", err);
    next(err);
  }
};



exports.getReviewsByCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const reviews = await Review.find({ customer: customerId })
      .populate('agency', 'agencyName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
};
