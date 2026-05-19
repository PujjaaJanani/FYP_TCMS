// src/Layout/Header.js
import React, { useState } from 'react';
import { Button } from 'antd';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand" onClick={() => { navigate('/'); closeMobileMenu(); }}>
          Hari's Tuition Center
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            HOME
          </Link>
          <Link 
            to="/student/schedule" 
            className={`nav-link ${isActive('/student/schedule') ? 'active' : ''}`}
          >
            CLASS SCHEDULE
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
          >
            ABOUT US
          </Link>
          <Link 
            to="/contact" 
            className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
          >
            CONTACT
          </Link>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="header-actions desktop-actions">
          <Button 
            type="default" 
            className="enroll-btn"
            onClick={() => navigate('/enrollment')}
          >
            ENROLL NOW
          </Button>
          <Button 
            type="primary" 
            className="login-btn"
            onClick={() => navigate('/login')}
          >
            LOGIN
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileMenuOpen ? 'mobile-nav-open' : ''}`}>
        <Link 
          to="/" 
          className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`} 
          onClick={closeMobileMenu}
        >
          HOME
        </Link>
        <Link 
          to="/student/schedule" 
          className={`mobile-nav-link ${isActive('/student/schedule') ? 'active' : ''}`} 
          onClick={closeMobileMenu}
        >
          CLASS SCHEDULE
        </Link>
        <Link 
          to="/about" 
          className={`mobile-nav-link ${isActive('/about') ? 'active' : ''}`} 
          onClick={closeMobileMenu}
        >
          ABOUT US
        </Link>
        <Link 
          to="/contact" 
          className={`mobile-nav-link ${isActive('/contact') ? 'active' : ''}`} 
          onClick={closeMobileMenu}
        >
          CONTACT
        </Link>
        <Button 
          type="default" 
          className="mobile-enroll-btn"
          onClick={() => { navigate('/enrollment'); closeMobileMenu(); }}
          block
        >
          ENROLL NOW
        </Button>
        <Button 
          type="primary" 
          className="mobile-login-btn"
          onClick={() => { navigate('/login'); closeMobileMenu(); }}
          block
        >
          LOGIN
        </Button>
      </div>
    </header>
  );
};

export default Header;