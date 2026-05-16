import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import Header from '../Layout/Header';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <Header />

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