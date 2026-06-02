import React, { useState } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveAuth } from '../Utils/LocalStorage';
import { apiUrl } from '../api';
import Header from '../Layout/Header';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [enrollmentModal, setEnrollmentModal] = useState({
    visible: false,
    studentId: null,
    studentName: null,
    studentEmail: null,
    isParent: false
  });
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const response = await axios.post(apiUrl('/api/login'), {
        email: values.email,
        password: values.password,
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        saveAuth(token, user);
        message.success('Login successful!');

        if (user.userType === 'authority') {
          if (user.role === 'Admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/staff/dashboard');
          }
        } else if (user.userType === 'parent') {
          navigate('/parent/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (error) {
      if (error.response) {
        // Check if this is an enrollment required error
        if (error.response.status === 403 && error.response.data.requires_enrollment) {
          setEnrollmentModal({
            visible: true,
            studentId: error.response.data.student_id || null,
            studentName: error.response.data.student_name || null,
            studentEmail: error.response.data.student_email || null,
            isParent: error.response.data.login_type === 'parent',  // ← add this
          });
          message.warning(error.response.data.message);
        } else {
          message.error(error.response.data.message || 'Login failed');
        }
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentNow = () => {
    setEnrollmentModal({ visible: false, studentId: null, studentName: null, studentEmail: null });
    // Pass student info to enrollment page via state
    navigate('/enrollment', {
      state: {
        studentId: enrollmentModal.studentId,
        studentName: enrollmentModal.studentName,
        studentEmail: enrollmentModal.studentEmail
      }
    });
  };

  return (
    <div className="login-container">
      <Header />
      <div className="login-content">
        <div className="login-box">
          <h1 className="login-title">SIGN IN</h1>
          <Form name="login" onFinish={onFinish} autoComplete="off" layout="vertical">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input size="large" placeholder="Enter your email" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password size="large" placeholder="Enter your password" autoComplete="new-password" />
            </Form.Item>
            <Form.Item style={{ textAlign: 'right', marginBottom: 16 }}>
              <Button 
                type="link" 
                onClick={() => navigate('/forgot-password')}
                style={{ padding: 0 }}
              >
                Forgot Password?
              </Button>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" className="login-button">
                LOGIN
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

     <Modal
        title={enrollmentModal.isParent ? "No Active Enrollment" : "Enrollment Required"}
        open={enrollmentModal.visible}
        onOk={handleEnrollmentNow}
        onCancel={() => setEnrollmentModal({ visible: false, studentId: null, studentName: null, studentEmail: null, isParent: false })}
        okText="Enroll Now"
        cancelText="Cancel"
      >
        {enrollmentModal.isParent ? (
          <p>None of your linked children have been enrolled for {new Date().getFullYear()}. Please enroll your children first.</p>
        ) : (
          <p>You need to enroll for {new Date().getFullYear()} before you can login. Please select your classes for the new academic year.</p>
        )}
      </Modal>
    </div>
  );
};

export default Login;
