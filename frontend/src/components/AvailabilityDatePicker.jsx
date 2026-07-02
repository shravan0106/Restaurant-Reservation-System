import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, isSameDay } from 'date-fns';

const AvailabilityDatePicker = ({ value, onChange, guestCount }) => {
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!isMounted.current || !guestCount) return;
      
      setLoading(true);
      setError(null);
      try {
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        const response = await api.get('/api/reservations/availability', {
          params: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            guestCount: parseInt(guestCount) || 0
          }
        });
        
        if (isMounted.current) {
          setAvailability(response.data.availability || {});
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
        if (isMounted.current) {
          setError('Failed to load availability. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    if (guestCount && parseInt(guestCount) > 0) {
      fetchAvailability();
    }
  }, [currentMonth, guestCount]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getDateKey = (date) => {
    if (!date) return null;
    return format(date, 'yyyy-MM-dd');
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return;
    
    onChange(getDateKey(date));
  };

  const isDateAvailable = (date) => {
    const dateStr = getDateKey(date);
    return !!dateStr && availability[dateStr] === true;
  };

  const isDateUnavailable = (date) => {
    const dateStr = getDateKey(date);
    return !!dateStr && availability[dateStr] === false;
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date) => {
    if (!value || !date) return false;
    const selectedDate = new Date(`${value}T00:00:00`);
    return isSameDay(date, selectedDate);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  if (!isMounted.current) {
    return null;
  }

  return (
    <div className="availability-date-picker">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '14px' }}
        >
          ←
        </button>
        <h3 style={{ margin: 0 }}>{format(currentMonth, 'MMM yyyy')}</h3>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '14px' }}
        >
          →
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '16px' }}>Loading availability...</div>}
      {error && <div style={{ textAlign: 'center', padding: '16px', color: '#dc3545' }}>{error}</div>}
      {!guestCount && <div style={{ textAlign: 'center', padding: '16px', color: '#666' }}>Please enter number of guests to check availability</div>}

      {!loading && !error && guestCount && (
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '8px', fontSize: '14px' }}>
            {day}
          </div>
        ))}
        {days.map((date, index) => (
          <div
            key={index}
            onClick={() => handleDateClick(date)}
            style={{
              padding: '12px',
              textAlign: 'center',
              cursor: date && !isPastDate(date) ? 'pointer' : 'not-allowed',
              borderRadius: '6px',
              backgroundColor: isSelected(date) ? '#667eea' : 
                               isDateAvailable(date) ? '#d4edda' :
                               isDateUnavailable(date) ? '#f8d7da' :
                               '#f8f9fa',
              color: isSelected(date) ? 'white' :
                     isPastDate(date) ? '#ccc' :
                     '#333',
              opacity: date ? 1 : 0,
              border: isSelected(date) ? '2px solid #667eea' : '1px solid #ddd',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (date && !isPastDate(date)) {
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            {date ? date.getDate() : ''}
          </div>
        ))}
        </div>
      )}

      {guestCount && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #28a745' }}></div>
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#f8d7da', borderRadius: '4px', border: '1px solid #dc3545' }}></div>
            <span>Unavailable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#667eea', borderRadius: '4px', border: '1px solid #667eea' }}></div>
            <span>Selected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityDatePicker;
