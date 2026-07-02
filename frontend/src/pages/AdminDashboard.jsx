import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reservations');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Reservation filters
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Edit reservation form
  const [editingReservation, setEditingReservation] = useState(null);
  const [editFormData, setEditFormData] = useState({
    reservationDate: '',
    timeSlot: '',
    guestCount: ''
  });
  
  // Table form
  const [showTableForm, setShowTableForm] = useState(false);
  const [tableFormData, setTableFormData] = useState({
    tableNumber: '',
    capacity: '',
    status: 'available'
  });
  const [editingTable, setEditingTable] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [reservationsRes, tablesRes, statsRes] = await Promise.all([
        api.get('/api/admin/reservations', {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: filterDate, status: filterStatus }
        }),
        api.get('/api/tables'),
        api.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setReservations(reservationsRes.data.reservations);
      setTables(tablesRes.data.tables);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatReservationDate = (dateValue) => {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return format(date, 'MMM dd, yyyy');
  };

  const handleCancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Reservation cancelled successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    }
  };

  const handleEditReservation = (reservation) => {
    setEditingReservation(reservation);
    setEditFormData({
      reservationDate: new Date(reservation.reservationDate).toISOString().split('T')[0],
      timeSlot: reservation.timeSlot,
      guestCount: reservation.guestCount
    });
  };

  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/reservations/${editingReservation._id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Reservation updated successfully');
      setEditingReservation(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update reservation');
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/tables', tableFormData);
      setSuccess('Table created successfully');
      setTableFormData({ tableNumber: '', capacity: '', status: 'available' });
      setShowTableForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create table');
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setTableFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status
    });
  };

  const handleUpdateTable = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/tables/${editingTable._id}`, tableFormData);
      setSuccess('Table updated successfully');
      setEditingTable(null);
      setTableFormData({ tableNumber: '', capacity: '', status: 'available' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update table');
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;

    try {
      await axios.delete(`/api/tables/${id}`);
      setSuccess('Table deleted successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete table');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px' }}>Admin Dashboard</h2>

      {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="success" style={{ marginBottom: '16px' }}>{success}</div>}

      {/* Stats */}
      {stats && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{stats.totalReservations}</h3>
            <p>Total Reservations</p>
          </div>
          <div className="stat-card">
            <h3>{stats.todayReservations}</h3>
            <p>Today's Reservations</p>
          </div>
          <div className="stat-card">
            <h3>{stats.cancelledReservations}</h3>
            <p>Cancelled</p>
          </div>
          <div className="stat-card">
            <h3>{stats.availableTables}</h3>
            <p>Available Tables</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`btn ${activeTab === 'reservations' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginRight: '8px' }}
        >
          Reservations
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`btn ${activeTab === 'tables' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Tables
        </button>
      </div>

      {/* Reservations Tab */}
      {activeTab === 'reservations' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Reservations</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="empty-state">No reservations found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Table</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation._id}>
                    <td>{formatReservationDate(reservation.reservationDate)}</td>
                    <td>{reservation.timeSlot}</td>
                    <td>{reservation.user?.name}<br/><small>{reservation.user?.email}</small></td>
                    <td>{reservation.table?.tableNumber} (Cap: {reservation.table?.capacity})</td>
                    <td>{reservation.guestCount}</td>
                    <td className={`status-${reservation.status}`}>{reservation.status}</td>
                    <td>
                      <button
                        onClick={() => handleEditReservation(reservation)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', marginRight: '4px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancelReservation(reservation._id)}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {editingReservation && (
            <div className="card" style={{ background: '#f8f9fa', marginTop: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>Edit Reservation</h4>
              <form onSubmit={handleUpdateReservation}>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editFormData.reservationDate}
                    onChange={(e) => setEditFormData({ ...editFormData, reservationDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time Slot</label>
                  <select
                    value={editFormData.timeSlot}
                    onChange={(e) => setEditFormData({ ...editFormData, timeSlot: e.target.value })}
                    required
                  >
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="1:00 PM">1:00 PM</option>
                    <option value="2:00 PM">2:00 PM</option>
                    <option value="3:00 PM">3:00 PM</option>
                    <option value="4:00 PM">4:00 PM</option>
                    <option value="5:00 PM">5:00 PM</option>
                    <option value="6:00 PM">6:00 PM</option>
                    <option value="7:00 PM">7:00 PM</option>
                    <option value="8:00 PM">8:00 PM</option>
                    <option value="9:00 PM">9:00 PM</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Guest Count</label>
                  <input
                    type="number"
                    value={editFormData.guestCount}
                    onChange={(e) => setEditFormData({ ...editFormData, guestCount: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginRight: '8px' }}>
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReservation(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Tables</h3>
            <button
              onClick={() => setShowTableForm(!showTableForm)}
              className="btn btn-primary"
            >
              {showTableForm ? 'Cancel' : 'Add Table'}
            </button>
          </div>

          {showTableForm && !editingTable && (
            <div className="card" style={{ background: '#f8f9fa', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>Add New Table</h4>
              <form onSubmit={handleCreateTable}>
                <div className="form-group">
                  <label>Table Number</label>
                  <input
                    type="text"
                    value={tableFormData.tableNumber}
                    onChange={(e) => setTableFormData({ ...tableFormData, tableNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={tableFormData.capacity}
                    onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={tableFormData.status}
                    onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  Create Table
                </button>
              </form>
            </div>
          )}

          {editingTable && (
            <div className="card" style={{ background: '#f8f9fa', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>Edit Table</h4>
              <form onSubmit={handleUpdateTable}>
                <div className="form-group">
                  <label>Table Number</label>
                  <input
                    type="text"
                    value={tableFormData.tableNumber}
                    onChange={(e) => setTableFormData({ ...tableFormData, tableNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={tableFormData.capacity}
                    onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={tableFormData.status}
                    onChange={(e) => setTableFormData({ ...tableFormData, status: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginRight: '8px' }}>
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTable(null);
                    setTableFormData({ tableNumber: '', capacity: '', status: 'available' });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {tables.length === 0 ? (
            <div className="empty-state">No tables found</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Table Number</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table._id}>
                    <td>{table.tableNumber}</td>
                    <td>{table.capacity}</td>
                    <td className={table.status === 'available' ? 'status-confirmed' : 'status-cancelled'}>
                      {table.status}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEditTable(table)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', marginRight: '4px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTable(table._id)}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
