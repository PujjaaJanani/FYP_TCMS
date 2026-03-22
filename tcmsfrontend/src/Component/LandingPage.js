import React from 'react';
import { Button } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <nav className="navbar">
        <div className="navbar-brand">Hari's Tuition Center</div>
        <div className="navbar-menu">
          <Link to="/">HOME</Link>
          <Link to="/student/schedule">CLASS SCHEDULE</Link>
          <Link to="/about">ABOUT US</Link>
          <Link to="/contact">CONTACT</Link>
          <Button 
            type="primary" 
            className="login-nav-btn"
            onClick={() => navigate('/login')}
          >
            LOGIN
          </Button>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">Register Now</h1>
          <p className="hero-subtitle">
            CLICK THE BUTTON BELOW TO ENROLL TO OUR CLASSES
          </p>
          <Button 
            type="primary" 
            size="large"
            className="register-hero-btn"
            onClick={() => navigate('/register')}
          >
            REGISTER
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;