require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Car = require('../models/Car');
const Bid = require('../models/Bid');
const Chat = require('../models/Chat');
const Reservation = require('../models/Reservation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@kreecar.com',
    password: 'Admin123!',
    phone: '+212-600-000001',
    role: 'admin',
    isActive: true
  },
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    password: 'Customer123!',
    phone: '+212-600-111111',
    role: 'customer',
    isActive: true
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@example.com',
    password: 'Customer123!',
    phone: '+212-600-222222',
    role: 'customer',
    isActive: true
  },
  {
    firstName: 'Premium',
    lastName: 'Rentals',
    email: 'contact@premiumrentals.ma',
    password: 'Agency123!',
    phone: '+212-522-333333',
    role: 'agency',
    agencyName: 'Premium Rentals Morocco',
    agencyDescription: 'Luxury car rental services in Casablanca with over 10 years of experience',
    verified: true,
    address: {
      street: '123 Boulevard Mohammed V',
      city: 'Casablanca',
      state: 'Casablanca-Settat',
      country: 'Morocco',
      zipCode: '20000'
    },
    rating: {
      average: 4.8,
      count: 156
    }
  },
  {
    firstName: 'Economy',
    lastName: 'Cars',
    email: 'info@economycars.ma',
    password: 'Agency123!',
    phone: '+212-537-444444',
    role: 'agency',
    agencyName: 'Economy Cars Rabat',
    agencyDescription: 'Affordable car rentals for budget-conscious travelers',
    verified: true,
    address: {
      street: '45 Avenue Hassan II',
      city: 'Rabat',
      state: 'Rabat-Sale-Kenitra',
      country: 'Morocco',
      zipCode: '10000'
    },
    rating: {
      average: 4.5,
      count: 89
    }
  },
  {
    firstName: 'Atlas',
    lastName: 'Auto',
    email: 'hello@atlasauto.ma',
    password: 'Agency123!',
    phone: '+212-524-555555',
    role: 'agency',
    agencyName: 'Atlas Auto Rental',
    agencyDescription: 'Complete car rental solutions in Marrakech',
    verified: true,
    address: {
      street: '78 Avenue Mohammed VI',
      city: 'Marrakech',
      state: 'Marrakech-Safi',
      country: 'Morocco',
      zipCode: '40000'
    },
    rating: {
      average: 4.7,
      count: 203
    }
  }
];

const sampleCars = [
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2024,
    category: 'Compact',
    images: ['/uploads/cars/toyota-corolla.jpg'],
    pricePerDay: 250,
    features: ['Bluetooth', 'USB Port', 'Backup Camera', 'Cruise Control'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 13000
    },
    location: {
      city: 'Casablanca',
      state: 'Casablanca-Settat',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Renault',
    model: 'Clio',
    year: 2024,
    category: 'Economy',
    images: ['/uploads/cars/renault-clio.jpg'],
    pricePerDay: 180,
    features: ['Bluetooth', 'USB Port'],
    specifications: {
      transmission: 'Manual',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 10000
    },
    location: {
      city: 'Rabat',
      state: 'Rabat-Sale-Kenitra',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Mercedes-Benz',
    model: 'E-Class',
    year: 2024,
    category: 'Luxury',
    images: ['/uploads/cars/mercedes-e-class.jpg'],
    pricePerDay: 800,
    features: ['Leather Seats', 'Navigation', 'Premium Sound', 'Sunroof', 'Advanced Safety'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 3000
    },
    location: {
      city: 'Casablanca',
      state: 'Casablanca-Settat',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Hyundai',
    model: 'Tucson',
    year: 2024,
    category: 'SUV',
    images: ['/uploads/cars/hyundai-tucson.jpg'],
    pricePerDay: 450,
    features: ['4WD', 'Bluetooth', 'Backup Camera', 'Apple CarPlay', 'Android Auto'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 8000
    },
    location: {
      city: 'Marrakech',
      state: 'Marrakech-Safi',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Dacia',
    model: 'Logan',
    year: 2023,
    category: 'Economy',
    images: ['/uploads/cars/dacia-logan.jpg'],
    pricePerDay: 150,
    features: ['USB Port', 'Power Windows'],
    specifications: {
      transmission: 'Manual',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 23000
    },
    location: {
      city: 'Rabat',
      state: 'Rabat-Sale-Kenitra',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'BMW',
    model: '5 Series',
    year: 2024,
    category: 'Luxury',
    images: ['/uploads/cars/bmw-5-series.jpg'],
    pricePerDay: 900,
    features: ['Leather Seats', 'Navigation', 'Premium Sound', 'Adaptive Cruise', 'Lane Assist'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 3000
    },
    location: {
      city: 'Casablanca',
      state: 'Casablanca-Settat',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Peugeot',
    model: '208',
    year: 2024,
    category: 'Compact',
    images: ['/uploads/cars/peugeot-208.jpg'],
    pricePerDay: 200,
    features: ['Bluetooth', 'Touchscreen', 'USB Port'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 12000
    },
    location: {
      city: 'Marrakech',
      state: 'Marrakech-Safi',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    category: 'Electric',
    images: ['/uploads/cars/tesla-model-3.jpg'],
    pricePerDay: 700,
    features: ['Autopilot', 'Premium Interior', 'Navigation', 'Glass Roof', 'Supercharging'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Electric',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 2000
    },
    location: {
      city: 'Casablanca',
      state: 'Casablanca-Settat',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    year: 2024,
    category: 'Compact',
    images: ['/uploads/cars/vw-golf.jpg'],
    pricePerDay: 280,
    features: ['Bluetooth', 'Digital Cockpit', 'Adaptive Cruise', 'Park Assist'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 5,
      doors: 4,
      airConditioning: true,
      mileage: 9000
    },
    location: {
      city: 'Rabat',
      state: 'Rabat-Sale-Kenitra',
      country: 'Morocco'
    },
    status: 'available'
  },
  {
    make: 'Ford',
    model: 'Explorer',
    year: 2024,
    category: 'SUV',
    images: ['/uploads/cars/ford-explorer.jpg'],
    pricePerDay: 550,
    features: ['7 Seats', '4WD', 'Navigation', 'Panoramic Roof', 'Advanced Safety'],
    specifications: {
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      seats: 7,
      doors: 4,
      airConditioning: true,
      mileage: 6000
    },
    location: {
      city: 'Marrakech',
      state: 'Marrakech-Safi',
      country: 'Morocco'
    },
    status: 'available'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Car.deleteMany({});
    await Bid.deleteMany({});
    await Chat.deleteMany({});
    await Reservation.deleteMany({});

    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`Created ${user.role}: ${user.email}`);
    }

    // Get agency users
    const agencies = createdUsers.filter(u => u.role === 'agency');

    // Create cars
    console.log('\nCreating cars...');
    const createdCars = [];
    for (let i = 0; i < sampleCars.length; i++) {
      const carData = {
        ...sampleCars[i],
        agency: agencies[i % agencies.length]._id
      };
      const car = await Car.create(carData);
      createdCars.push(car);
      console.log(`Created car: ${car.make} ${car.model} (${car.category})`);
    }

    console.log('\n=== Database Seeded Successfully ===');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${createdCars.length} cars`);
    console.log('\nTest Credentials:');
    console.log('Admin: admin@kreecar.com / Admin123!');
    console.log('Customer: john.smith@example.com / Customer123!');
    console.log('Agency: contact@premiumrentals.ma / Agency123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
