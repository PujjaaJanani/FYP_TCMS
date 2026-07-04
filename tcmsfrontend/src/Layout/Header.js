// src/Layout/Header.js - Updated with body scroll lock
import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    const newState = !mobileMenuOpen;
    setMobileMenuOpen(newState);
    
    // Prevent body scroll when mobile menu is open
    if (newState) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.classList.remove('mobile-menu-open');
  };

  // Clean up body class on component unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, []);

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992 && mobileMenuOpen) {
        closeMobileMenu();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

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
            to="/class-schedule" 
            className={`nav-link ${isActive('/class-schedule') ? 'active' : ''}`}
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
          to="/class-schedule" 
          className={`mobile-nav-link ${isActive('/class-schedule') ? 'active' : ''}`} 
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