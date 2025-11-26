const Car = require('../models/Car');

// Get all cars (with filters)
exports.getCars = async (req, res, next) => {
  try {
    const { category, city, minPrice, maxPrice, transmission, fuelType, seats, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };

    // Apply filters
    if (category) query.category = category;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
    }
    if (transmission) query['specifications.transmission'] = transmission;
    if (fuelType) query['specifications.fuelType'] = fuelType;
    if (seats) query['specifications.seats'] = Number(seats);

    const skip = (page - 1) * limit;

    const cars = await Car.find(query)
      .populate('agency', 'agencyName rating verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Car.countDocuments(query);

    res.status(200).json({
      success: true,
      data: cars,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single car
exports.getCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id)
      .populate('agency', 'agencyName agencyDescription rating verified phone email address');

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      data: car
    });
  } catch (error) {
    next(error);
  }
};

// Create car (Agency only)
exports.createCar = async (req, res, next) => {
  try {
    const carData = {
      ...req.body,
      agency: req.user._id
    };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      carData.images = req.files.map(file => `/uploads/cars/${file.filename}`);
    }

    const car = await Car.create(carData);

    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      data: car
    });
  } catch (error) {
    next(error);
  }
};

// Update car (Agency only)
exports.updateCar = async (req, res, next) => {
  try {
    let car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Check ownership
    if (car.agency.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this car'
      });
    }

    const updateData = { ...req.body };

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/cars/${file.filename}`);
      updateData.images = [...(car.images || []), ...newImages];
    }

    car = await Car.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Car updated successfully',
      data: car
    });
  } catch (error) {
    next(error);
  }
};

// Delete car (Agency only)
exports.deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    // Check ownership
    if (car.agency.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this car'
      });
    }

    // Soft delete
    car.isActive = false;
    await car.save();

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get agency cars
exports.getAgencyCars = async (req, res, next) => {
  try {
    const cars = await Car.find({ agency: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: cars
    });
  } catch (error) {
    next(error);
  }
};
