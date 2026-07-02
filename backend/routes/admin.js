const express = require('express');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all reservations (admin only)
router.get('/reservations', adminAuth, async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query = {};
    
    // Filter by date if provided
    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.reservationDate = { $gte: filterDate, $lt: nextDay };
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    const reservations = await Reservation.find(query)
      .populate('user', 'name email')
      .populate('table', 'tableNumber capacity')
      .sort({ reservationDate: -1, createdAt: -1 });
    
    res.json({ reservations });
  } catch (error) {
    console.error('Get all reservations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update reservation (admin only)
router.put('/reservations/:id', [
  adminAuth,
  body('reservationDate').optional().isISO8601().withMessage('Valid date is required'),
  body('timeSlot').optional().isIn(['11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM']).withMessage('Valid time slot is required'),
  body('guestCount').optional().isInt({ min: 1 }).withMessage('Valid guest count is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Business Rule: Cannot edit past reservations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservation.reservationDate < today) {
      return res.status(400).json({ error: 'Cannot edit past reservations' });
    }

    const { reservationDate, timeSlot, guestCount } = req.body;
    
    // If date or time is changed, need to check table availability
    if (reservationDate || timeSlot || guestCount) {
      const newDate = reservationDate ? new Date(reservationDate) : reservation.reservationDate;
      newDate.setHours(0, 0, 0, 0);
      const newTimeSlot = timeSlot || reservation.timeSlot;
      const newGuestCount = guestCount || reservation.guestCount;
      
      // Check if the current table still works
      const currentTable = await Table.findById(reservation.table);
      
      if (!currentTable || currentTable.capacity < newGuestCount) {
        // Need to find a new table
        const findAvailableTable = async (guestCount, date, timeSlot) => {
          const allTables = await Table.find({ status: 'available' });
          const suitableTables = allTables.filter(table => table.capacity >= guestCount);
          
          if (suitableTables.length === 0) return null;
          
          const bookedTableIds = await Reservation.find({
            reservationDate: date,
            timeSlot,
            status: 'confirmed',
            _id: { $ne: reservation._id } // Exclude current reservation
          }).distinct('table');
          
          const availableTables = suitableTables.filter(
            table => !bookedTableIds.includes(table._id.toString())
          );
          
          if (availableTables.length === 0) return null;
          
          availableTables.sort((a, b) => a.capacity - b.capacity);
          return availableTables[0];
        };
        
        const availableTable = await findAvailableTable(newGuestCount, newDate, newTimeSlot);
        
        if (!availableTable) {
          return res.status(409).json({ 
            error: 'No tables available for the selected date, time, and guest count' 
          });
        }
        
        reservation.table = availableTable._id;
      } else {
        // Check if current table is available at new time
        const conflictingReservation = await Reservation.findOne({
          reservationDate: newDate,
          timeSlot: newTimeSlot,
          table: reservation.table,
          status: 'confirmed',
          _id: { $ne: reservation._id }
        });
        
        if (conflictingReservation) {
          return res.status(409).json({ 
            error: 'Table is already booked for the selected date and time' 
          });
        }
      }
      
      if (reservationDate) reservation.reservationDate = newDate;
      if (timeSlot) reservation.timeSlot = newTimeSlot;
      if (guestCount) reservation.guestCount = newGuestCount;
    }

    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'name email')
      .populate('table', 'tableNumber capacity');

    res.json({
      message: 'Reservation updated successfully',
      reservation: populatedReservation
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Server error during update' });
  }
});

// Cancel any reservation (admin only)
router.delete('/reservations/:id', adminAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('user', 'name email')
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

// Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalReservations = await Reservation.countDocuments();
    const todayReservations = await Reservation.countDocuments({
      reservationDate: { $gte: today, $lt: tomorrow }
    });
    const cancelledReservations = await Reservation.countDocuments({ status: 'cancelled' });
    const availableTables = await Table.countDocuments({ status: 'available' });

    res.json({
      totalReservations,
      todayReservations,
      cancelledReservations,
      availableTables
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
