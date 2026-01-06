import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ currentView, setCurrentView, user, onLogout }) => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

return (
  <nav className="navbar">
    <div className="nav-brand">
      <h2>Maintenance Manager</h2>
      <small>Logged in as: {user.username} ({user.role})</small>
      <small>Time: {currentTime.toLocaleTimeString('fr-FR')}</small>
    </div>
    <div className="nav-links">
      
   
      {user.role === 'client' && (
        <Link 
          to="/client"
          className={location.pathname === '/client' ? 'nav-link active' : 'nav-link'}
        >
          Submit Ticket
        </Link>
      )}
      {user.role === 'inventory_worker' && (
  <Link 
    to="/inventory"
    className={location.pathname === '/inventory' ? 'nav-link active' : 'nav-link'}
  >
     Inventaire
  </Link>
)}
      
      {/* Employee View Link - for employees (NOT clients) */}
     {/* 
  user.role === 'employee' && (
    <Link 
      to="/damage-reports"
      className={location.pathname === '/damage-reports' ? 'nav-link active' : 'nav-link'}
      onClick={() => setCurrentView('employee')} 
    >
      Rapports de Dégâts 
    </Link>
  )
*/}
      {user.role === 'manager' && (
  <Link 
    to="/"
    className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
  >
    Manager Dashboard
  </Link>
)}
      
      {/* Admin View Link - ONLY for admins */}
      {user.role === 'admin' && (
        <Link 
          to="/"
          className={
            location.pathname === '/' && currentView === 'admin'
              ? 'nav-link active' 
              : 'nav-link'
          }
          onClick={() => setCurrentView('admin')}
        >
          🔧 Admin View
        </Link>
      )}
      
      {/* Damage Reports Link - ONLY for employees (NOT clients) */}
    {/* 
  user.role === 'employee' && (
    <Link 
      to="/damage-reports"
      className={location.pathname === '/damage-reports' ? 'nav-link active' : 'nav-link'}
      onClick={() => setCurrentView('employee')} 
    >
      Rapports de Dégâts 
    </Link>
  )
*/}
      
      {/* Logout Button */}
      <button onClick={onLogout} className="nav-link logout-btn">
        Logout
      </button>
    </div>
  </nav>
);
};

export default Navbar;