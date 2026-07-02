import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import AvailabilityDatePicker from '../components/AvailabilityDatePicker';

const CustomerDashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [formData, setFormData] = useState({
    reservationDate: '',
    timeSlot: '',
    guestCount: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/reservations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservations(response.data.reservations);
    } catch (err) {
      setError('Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/reservations', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reservation = response.data.reservation;
      setSuccess(
        `Reservation Created Successfully\n` +
        `Assigned Table: ${reservation.table?.tableNumber}\n` +
        `Date: ${formatReservationDate(reservation.reservationDate)}\n` +
        `Time: ${reservation.timeSlot}\n` +
        `Guests: ${reservation.guestCount}`
      );
      setFormData({ reservationDate: '', timeSlot: '', guestCount: '' });
      setShowReservationForm(false);
      fetchReservations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create reservation');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Reservation cancelled successfully');
      fetchReservations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    }
  };

  const formatReservationDate = (dateValue) => {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return format(date, 'MMM dd, yyyy');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingReservations = reservations.filter(r => 
    new Date(r.reservationDate) >= today && r.status === 'confirmed'
  );
  const pastReservations = reservations.filter(r => 
    new Date(r.reservationDate) < today || r.status === 'cancelled'
  );

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>My Reservations</h2>
          <button 
            onClick={() => setShowReservationForm(!showReservationForm)}
            className="btn btn-primary"
          >
            {showReservationForm ? 'Cancel' : 'New Reservation'}
          </button>
        </div>

        {error && <div className="error" style={{ marginBottom: '16px', whiteSpace: 'pre-line' }}>{error}</div>}
        {success && <div className="success" style={{ marginBottom: '16px', whiteSpace: 'pre-line' }}>{success}</div>}

        {showReservationForm && (
          <div className="card" style={{ background: '#f8f9fa', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Create Reservation</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date</label>
                <AvailabilityDatePicker
                  value={formData.reservationDate}
                  onChange={(date) => setFormData({ ...formData, reservationDate: date })}
                  guestCount={formData.guestCount}
                />
              </div>
              <div className="form-group">
                <label>Time Slot</label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  required
                >
                  <option value="">Select time</option>
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
                <label>Number of Guests</label>
                <input
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, guestCount: value });
                  }}
                  min="1"
                  max="50"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Create Reservation
              </button>
            </form>
          </div>
        )}

        <h3 style={{ marginBottom: '16px' }}>Upcoming Reservations</h3>
        {upcomingReservations.length === 0 ? (
          <div className="empty-state">No upcoming reservations.<br/>Create your first reservation above.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingReservations.map((reservation) => (
                <tr key={reservation._id}>
                  <td>{format(new Date(reservation.reservationDate), 'MMM dd, yyyy')}</td>
                  <td>{reservation.timeSlot}</td>
                  <td>{reservation.table?.tableNumber} (Capacity: {reservation.table?.capacity})</td>
                  <td>{reservation.guestCount}</td>
                  <td className={`status-${reservation.status}`}>{reservation.status}</td>
                  <td>
                    <button
                      onClick={() => handleCancel(reservation._id)}
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

        <h3 style={{ marginBottom: '16px', marginTop: '32px' }}>Past Reservations</h3>
        {pastReservations.length === 0 ? (
          <div className="empty-state">No past reservations</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastReservations.map((reservation) => (
                <tr key={reservation._id}>
                  <td>{format(new Date(reservation.reservationDate), 'MMM dd, yyyy')}</td>
                  <td>{reservation.timeSlot}</td>
                  <td>{reservation.table?.tableNumber}</td>
                  <td>{reservation.guestCount}</td>
                  <td className={`status-${reservation.status}`}>{reservation.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
