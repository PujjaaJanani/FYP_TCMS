import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Card, Space, message, Steps, Alert, Spin, Modal } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import axios from 'axios';
import Header from '../Layout/Header';
import './Enrollment.css';

const { Option } = Select;

const Enrollment = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [tempSubject, setTempSubject] = useState(null);
  const [tempClass, setTempClass] = useState(null);
  const [classesStatus, setClassesStatus] = useState(null);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [emailForm] = Form.useForm();
  const [studentNotFoundModal, setStudentNotFoundModal] = useState({
    visible: false,
    email: ''
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchSubjects();
    fetchCurrentYearClasses();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/subjects');
      if (response.data.success) {
        setSubjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      message.error('Failed to load subjects');
    }
  };

  const fetchCurrentYearClasses = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/enrollment/current-year-classes');
      if (response.data.success) {
        setAcademicYear(response.data.academic_year);
      }
    } catch (error) {
      console.error('Error fetching current year:', error);
    }
  };

  const fetchClassesBySubject = async (subjectId) => {
    setClassesStatus(null);
    setAvailableClasses([]);
    
    try {
      const response = await axios.get(`http://localhost:8000/api/enrollment/classes/by-subject/${subjectId}`);
      if (response.data.success) {
        const all = response.data.data;
        if (all.length === 0) {
          setClassesStatus('none');
          return;
        }
        
        // Filter classes that have available spaces
        const withSpaces = all.filter(cls => cls.availableSpaces > 0);
        if (withSpaces.length === 0) {
          setClassesStatus('all_full');
        } else {
          setAvailableClasses(withSpaces);
          setClassesStatus('available');
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to load classes');
    }
  };

  const handleSubjectChange = (subjectId) => {
    setTempSubject(subjectId);
    setTempClass(null);
    setClassesStatus(null);
    setAvailableClasses([]);
    fetchClassesBySubject(subjectId);
  };

  const handleAddClass = () => {
    if (!tempSubject || !tempClass) {
      message.warning('Please select both subject and class');
      return;
    }

    const subjectAlreadySelected = selectedClasses.some(
      item => item.subjectId === tempSubject
    );

    if (subjectAlreadySelected) {
      message.warning('You have already selected a class for this subject');
      return;
    }

    const selectedSubject = subjects.find(s => s.subjectId === tempSubject);
    const selectedClassData = availableClasses.find(c => c.classId === tempClass);

    if (!selectedSubject || !selectedClassData) {
      message.error('Invalid selection');
      return;
    }

    const newClass = {
      classId: tempClass,
      subjectId: tempSubject,
      subjectName: selectedSubject.name,
      form: selectedSubject.form,
      subjectFee: selectedSubject.subjectFee || 0,
      classDay: selectedClassData.classDay,
      startTime: selectedClassData.startTime,
      finishTime: selectedClassData.finishTime,
      teacher: selectedClassData.teacher,
      location: selectedClassData.location
    };

    setSelectedClasses([...selectedClasses, newClass]);
    setTempSubject(null);
    setTempClass(null);
    setAvailableClasses([]);
    message.success('Class added successfully');
  };

  const handleRemoveClass = (classId) => {
    setSelectedClasses(selectedClasses.filter(item => item.classId !== classId));
    message.info('Class removed');
  };

  const handleCheckStudent = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/enrollment/check-student', {
        email: values.email
      });

      if (response.data.success) {
        setStudent(response.data.data);
        setCurrentStep(1);
        message.success(`Welcome back ${response.data.data.name}! Please select your classes for ${academicYear}`);
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          // Student not found - show modal instead of auto redirect
          setStudentNotFoundModal({
            visible: true,
            email: values.email
          });
        } else if (error.response.status === 400) {
          message.error(error.response.data.message);
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          message.error(error.response.data.message || 'Verification failed');
        }
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotFoundModal = () => {
    setStudentNotFoundModal({
      visible: false,
      email: ''
    });
  };

  const handleRegisterNow = () => {
    setStudentNotFoundModal({
      visible: false,
      email: ''
    });
    navigate('/register');
  };

  const handleSubmitEnrollment = async () => {
    if (selectedClasses.length === 0) {
      message.error('Please select at least one class');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/enrollment/submit', {
        studentId: student.studentId,
        classes: selectedClasses.map(c => c.classId)
      });

      if (response.data.success) {
        message.success(response.data.message);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Enrollment failed');
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const totalMonthlyFee = selectedClasses.reduce((sum, cls) => sum + (cls.subjectFee || 0), 0);

  return (
    <div className="enrollment-container">
      <Header />
      <div className="enrollment-content">
        <div className="enrollment-box" style={{ maxWidth: 750 }}>
          <h1 className="enrollment-title">Enroll for {academicYear}</h1>
          
          {currentStep === 0 ? (
            // Step 1: Verify student email
            <>
              <p className="enrollment-subtitle">
                Enter your registered email address to continue with enrollment
              </p>
              <Form form={emailForm} onFinish={handleCheckStudent} layout="vertical">
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: 'Please enter your email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input 
                    size="large" 
                    placeholder="Enter your registered email" 
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    autoComplete="off"
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading} 
                    block 
                    size="large" 
                    className="enrollment-button"
                  >
                    Verify & Continue
                  </Button>
                </Form.Item>
                
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <span style={{ color: '#666' }}>Don't have an account? </span>
                  <a href="/register" style={{ color: '#667eea' }}>Register here</a>
                </div>
              </Form>
            </>
          ) : (
            // Step 2: Select classes for current year
            <>
              {/* Student Information Card */}
              <Alert
                message="Student Information"
                description={
                  <div style={{ marginTop: 8 }}>
                    <p><strong>Name:</strong> {student.name}</p>
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>Phone:</strong> {student.phone || 'Not provided'}</p>
                    <p><strong>Address:</strong> {student.address || 'Not provided'}</p>
                    {student.previousClasses && student.previousClasses.length > 0 && (
                      <>
                        <p><strong>Previously Enrolled ({academicYear - 1}):</strong></p>
                        <ul style={{ marginBottom: 0 }}>
                          {student.previousClasses.map((cls, idx) => (
                            <li key={idx}>{cls.subjectName} - {cls.form} ({cls.classDay})</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              {/* Class Selection Card */}
              <Card title={`Select Classes for ${academicYear}`} size="small" style={{ marginBottom: 20 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Select
                    size="large"
                    placeholder="Select a subject"
                    value={tempSubject}
                    onChange={handleSubjectChange}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {subjects
                      .filter(subject => !selectedClasses.some(sc => sc.subjectId === subject.subjectId))
                      .map(subject => (
                        <Option key={subject.subjectId} value={subject.subjectId}>
                          {subject.name} - {subject.form} (RM{subject.subjectFee}/month)
                        </Option>
                      ))}
                  </Select>
                  
                  <Select
                    size="large"
                    placeholder="Select class schedule"
                    value={tempClass}
                    onChange={setTempClass}
                    disabled={!tempSubject || classesStatus !== 'available'}
                    style={{ width: '100%' }}
                  >
                    {availableClasses.map(cls => (
                      <Option key={cls.classId} value={cls.classId}>
                        {cls.classDay} - {cls.startTime} to {cls.finishTime}
                        {cls.location && ` at ${cls.location}`}
                        {cls.teacher && ` (${cls.teacher})`}
                        {` — ${cls.availableSpaces} seat${cls.availableSpaces !== 1 ? 's' : ''} left`}
                      </Option>
                    ))}
                  </Select>
                  
                  {classesStatus === 'none' && (
                    <div style={{ padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, color: '#ad6800', fontSize: 13 }}>
                      ⚠️ No classes available for this subject for {academicYear}.
                    </div>
                  )}
                  {classesStatus === 'all_full' && (
                    <div style={{ padding: '8px 12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, color: '#cf1322', fontSize: 13 }}>
                      🚫 All classes for this subject are currently full for {academicYear}.
                    </div>
                  )}
                  
                  <Button 
                    type="dashed" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddClass} 
                    block 
                    size="large"
                    disabled={!tempSubject || !tempClass}
                  >
                    Add Class
                  </Button>
                </Space>
              </Card>

              {/* Selected Classes List */}
              {selectedClasses.length > 0 && (
                <Card title={`Selected Classes (${selectedClasses.length})`} size="small" style={{ marginBottom: 20 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {selectedClasses.map(cls => (
                      <Card key={cls.classId} size="small" style={{ background: '#f5f5f5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                              {cls.subjectName} - {cls.form} (RM{cls.subjectFee}/month)
                            </div>
                            <div style={{ fontSize: 13, color: '#666' }}>
                              {cls.classDay} • {cls.startTime} - {cls.finishTime}
                              {cls.location && ` at ${cls.location}`}
                            </div>
                            {cls.teacher && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Teacher: {cls.teacher}</div>}
                          </div>
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveClass(cls.classId)} />
                        </div>
                      </Card>
                    ))}
                  </Space>
                </Card>
              )}

              {selectedClasses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9', marginBottom: 20 }}>
                  <UserOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <p>No classes selected yet. Add at least one class to continue.</p>
                </div>
              )}

              {/* Fee Summary */}
              <div className="fee-summary">
                <h3>Monthly Fee Summary for {academicYear}</h3>
                <p>Total Monthly Fee: <strong>RM{totalMonthlyFee}</strong></p>
                <small>Fee is calculated based on selected subjects</small>
              </div>

              {/* Action Buttons */}
              <Space style={{ width: '100%' }} direction="vertical">
                <Button
                  type="primary"
                  onClick={handleSubmitEnrollment}
                  loading={loading}
                  size="large"
                  block
                  className="enrollment-button"
                  disabled={selectedClasses.length === 0}
                >
                  Complete Enrollment
                </Button>
                
                <Button 
                  size="large" 
                  block
                  onClick={() => {
                    setCurrentStep(0);
                    setStudent(null);
                    setSelectedClasses([]);
                    setTempSubject(null);
                    setTempClass(null);
                    emailForm.resetFields();
                  }}
                >
                  Back to Email Verification
                </Button>
              </Space>
            </>
          )}
        </div>
      </div>

      {/* Student Not Found Modal - No X button */}
      <Modal
        title="Student Not Found"
        open={studentNotFoundModal.visible}
        onCancel={handleCloseNotFoundModal}
        closable={false}
        maskClosable={false}
        footer={[
          <Button key="cancel" onClick={handleCloseNotFoundModal}>
            Cancel
          </Button>,
          <Button key="register" type="primary" onClick={handleRegisterNow}>
            Register Now
          </Button>,
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 12, fontSize: '14px' }}>
            Student with email <strong>{studentNotFoundModal.email}</strong> was not found in our system.
          </p>
          <p style={{ marginBottom: 0, color: '#666', fontSize: '13px' }}>
            Please register first before proceeding with enrollment.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Enrollment;