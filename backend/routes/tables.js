const express = require('express');
const { body, validationResult } = require('express-validator');
const Table = require('../models/Table');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all tables
router.get('/', async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json({ tables });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create table (admin only)
router.post('/', [
  adminAuth,
  body('tableNumber').trim().notEmpty().withMessage('Table number is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tableNumber, capacity, status } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(409).json({ error: 'Table number already exists' });
    }

    const table = new Table({
      tableNumber,
      capacity,
      status: status || 'available'
    });

    await table.save();

    res.status(201).json({
      message: 'Table created successfully',
      table
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Server error during table creation' });
  }
});

// Update table (admin only)
router.put('/:id', [
  adminAuth,
  body('tableNumber').optional().trim().notEmpty().withMessage('Table number cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const { tableNumber, capacity, status } = req.body;

    // Check if new table number already exists (if changing)
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ tableNumber });
      if (existingTable) {
        return res.status(409).json({ error: 'Table number already exists' });
      }
      table.tableNumber = tableNumber;
    }

    if (capacity) table.capacity = capacity;
    if (status) table.status = status;

    await table.save();

    res.json({
      message: 'Table updated successfully',
      table
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Server error during table update' });
  }
});

// Delete table (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table has any active reservations
    const Reservation = require('../models/Reservation');
    const activeReservations = await Reservation.countDocuments({
      table: table._id,
      status: 'confirmed',
      reservationDate: { $gte: new Date() }
    });

    if (activeReservations > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete table with active reservations' 
      });
    }

    await Table.findByIdAndDelete(req.params.id);

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Server error during table deletion' });
  }
});

module.exports = router;
