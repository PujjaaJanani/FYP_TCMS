import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveAuth } from '../Utils/LocalStorage';   // ← centralised localStorage helper
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/login', {
        email:    values.email,
        password: values.password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;

        // Save everything to localStorage in one call
        saveAuth(token, user);

        message.success('Login successful!');

        // Redirect based on role
        if (user.userType === 'authority') {
          if (user.role === 'Admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/staff/applications');
          }
        } else {
          navigate('/student/schedule');
        }
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Login failed');
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <nav className="navbar">
        <div className="navbar-brand">Hari's Tuition Center</div>
        <div className="navbar-menu">
          <a href="/">HOME</a>
          <a href="/schedule">CLASS SCHEDULE</a>
          <a href="/about">ABOUT US</a>
          <a href="/contact">CONTACT</a>
        </div>
      </nav>

      <div className="login-content">
        <div className="login-box">
          <h1 className="login-title">SIGN IN</h1>

          <Form name="login" onFinish={onFinish} autoComplete="off" layout="vertical">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email',  message: 'Please enter a valid email!' },
              ]}
            >
              <Input
                size="large"
                placeholder="Enter your email"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                size="large"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-button"
              >
                LOGIN
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;