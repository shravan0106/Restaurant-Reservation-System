import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Restaurant Reservation</div>
      <div className="navbar-nav">
        <span className="nav-link">Welcome, {user?.name}</span>
        {user?.role === 'admin' && (
          <a href="/admin" className="nav-link">Admin Dashboard</a>
        )}
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
