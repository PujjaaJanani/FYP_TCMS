import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { apiUrl } from '../api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/api/auth/forgot-password', {
        email: values.email,
      });

      if (response.data.success) {
        setSubmitted(true);
        setEmail(values.email);
        message.success(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Failed to send reset link');
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-content">
        <div className="forgot-password-box">
          {!submitted ? (
            <>
              <div className="forgot-password-header">
                <Button 
                  type="link" 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate('/login')}
                  className="back-button"
                >
                  Back to Login
                </Button>
              </div>
              <h1 className="forgot-password-title">Forgot Password?</h1>
              <p className="forgot-password-subtitle">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <Form name="forgot-password" onFinish={onFinish} autoComplete="off" layout="vertical">
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: 'Please input your email!' },
                    { type: 'email', message: 'Please enter a valid email!' },
                  ]}
                >
                  <Input 
                    size="large" 
                    placeholder="Enter your email" 
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading} 
                    block 
                    size="large" 
                    className="forgot-password-button"
                  >
                    SEND RESET LINK
                  </Button>
                </Form.Item>
              </Form>

              <div className="forgot-password-footer">
                <p>
                  Remember your password?{' '}
                  <Button type="link" onClick={() => navigate('/login')} className="footer-link">
                    Sign In
                  </Button>
                </p>
              </div>
            </>
          ) : (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h2 className="success-title">Check Your Email</h2>
              <p className="success-message">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="success-instruction">
                Please check your inbox and follow the instructions to reset your password.
                The link will expire in 60 minutes.
              </p>
              <Button 
                type="primary" 
                block 
                size="large" 
                className="forgot-password-button"
                onClick={() => navigate('/login')}
              >
                RETURN TO LOGIN
              </Button>
              <Button 
                type="link" 
                block 
                onClick={() => setSubmitted(false)}
                style={{ marginTop: 12 }}
              >
                Try different email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
