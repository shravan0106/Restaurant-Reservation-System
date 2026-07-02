const express = require('express');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Maximum restaurant capacity (configurable)
const MAX_RESTAURANT_CAPACITY = 50;

// Table Assignment Algorithm
const findAvailableTable = async (guestCount, reservationDate, timeSlot) => {
  // Step 1: Find all available tables
  const allTables = await Table.find({ status: 'available' });
  
  // Step 2: Filter tables by capacity (capacity >= guests)
  const suitableTables = allTables.filter(table => table.capacity >= guestCount);
  
  if (suitableTables.length === 0) {
    return null;
  }
  
  // Step 3: Remove already booked tables for the same date and time
  const bookedTableIds = await Reservation.find({
    reservationDate,
    timeSlot,
    status: 'confirmed'
  }).distinct('table');
  
  const availableTables = suitableTables.filter(
    table => !bookedTableIds.includes(table._id.toString())
  );
  
  if (availableTables.length === 0) {
    return null;
  }
  
  // Step 4: Sort by smallest suitable capacity (optimal table assignment)
  availableTables.sort((a, b) => a.capacity - b.capacity);
  
  // Step 5: Assign first table
  return availableTables[0];
};

// Get user's reservations
router.get('/', auth, async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .populate('table', 'tableNumber capacity')
      .sort({ reservationDate: -1, createdAt: -1 });
    
    res.json({ reservations });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check availability for a date range
router.get('/availability', async (req, res) => {
  try {
    const { startDate, endDate, guestCount } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const availability = {};

    // Get all available tables
    const allTables = await Table.find({ status: 'available' });
    
    // Check each date in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasAvailableTables = await checkDateAvailability(currentDate, guestCount, allTables);
      availability[dateStr] = hasAvailableTables;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({ availability });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to check if any table is available for a given date
const checkDateAvailability = async (date, guestCount, allTables) => {
  const timeSlots = ['11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];
  
  // Check if any time slot has availability
  for (const timeSlot of timeSlots) {
    const suitableTables = allTables.filter(table => 
      !guestCount || table.capacity >= parseInt(guestCount)
    );
    
    if (suitableTables.length === 0) continue;
    
    const bookedTableIds = await Reservation.find({
      reservationDate: date,
      timeSlot,
      status: 'confirmed'
    }).distinct('table');
    
    const availableTables = suitableTables.filter(
      table => !bookedTableIds.includes(table._id.toString())
    );
    
    if (availableTables.length > 0) {
      return true;
    }
  }
  
  return false;
};

// Create reservation
router.post('/', [
  auth,
  body('reservationDate').isISO8601().withMessage('Please select a valid reservation date'),
  body('timeSlot').isIn(['11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']).withMessage('Please select a valid time slot'),
  body('guestCount').isInt({ min: 1, max: MAX_RESTAURANT_CAPACITY }).withMessage(`Guest count must be greater than 0 and within restaurant capacity (max ${MAX_RESTAURANT_CAPACITY})`)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reservationDate, timeSlot, guestCount } = req.body;
    
    // Convert date string to Date object and set to start of day
    const date = new Date(reservationDate);
    date.setHours(0, 0, 0, 0);
    
    // Business Rule: Cannot make reservations for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return res.status(400).json({ error: 'Please select a valid reservation date' });
    }

    // Business Rule: Guest count cannot exceed maximum restaurant capacity
    if (guestCount > MAX_RESTAURANT_CAPACITY) {
      return res.status(400).json({ error: 'Maximum seating capacity exceeded' });
    }

    // Find available table using the algorithm
    const availableTable = await findAvailableTable(guestCount, date, timeSlot);
    
    if (!availableTable) {
      return res.status(409).json({ 
        error: 'No tables available for the selected date, time, and guest count' 
      });
    }

    // Create reservation
    const reservation = new Reservation({
      user: req.user._id,
      table: availableTable._id,
      reservationDate: date,
      timeSlot,
      guestCount,
      status: 'confirmed'
    });

    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('table', 'tableNumber capacity');

    res.status(201).json({
      message: 'Reservation created successfully',
      reservation: populatedReservation
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Server error during reservation creation' });
  }
});

// Cancel reservation (customer can only cancel their own)
router.delete('/:id', auth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if reservation belongs to the user
    if (reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Please login to continue' });
    }

    // Business Rule: Cannot cancel past reservations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservation.reservationDate < today) {
      return res.status(400).json({ error: 'Cannot cancel past reservations' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('table', 'tableNumber capacity');

    res.json({
      message: 'Reservation cancelled successfully',
      reservation: populatedReservation
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ error: 'Server error during cancellation' });
  }
});

module.exports = router;
