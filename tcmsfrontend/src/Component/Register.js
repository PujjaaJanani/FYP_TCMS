import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message, Steps, Card, Space } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import './Register.css';

const { Option } = Select;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [tempSubject, setTempSubject] = useState(null);
  const [tempClass, setTempClass] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/subjects');
      if (response.data.success) {
        setSubjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClassesBySubject = async (subjectId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/classes/by-subject/${subjectId}`);
      if (response.data.success) {
        setAvailableClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to load classes');
    }
  };

  const handleSubjectChange = (subjectId) => {
    setTempSubject(subjectId);
    setTempClass(null);
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

    const newClass = {
      classId: tempClass,
      subjectId: tempSubject,
      subjectName: selectedSubject.name,
      form: selectedSubject.form,
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

  const handleNext = async () => {
    try {
      const fieldsToValidate = getCurrentStepFields();
      await form.validateFields(fieldsToValidate);
      
      if (currentStep === 2 && selectedClasses.length === 0) {
        message.warning('Please add at least one class');
        return;
      }
      
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const getCurrentStepFields = () => {
    const stepFields = [
      ['name', 'email', 'password', 'confirmPassword'],
      ['phone', 'address'],
      []
    ];
    return stepFields[currentStep];
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const onFinish = async (values) => {
    if (selectedClasses.length === 0) {
      message.error('Please add at least one class');
      return;
    }

    setLoading(true);
    
    try {
      const registrationData = {
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        address: values.address,
        classes: selectedClasses.map(c => c.classId)
      };

      const response = await axios.post(
        'http://localhost:8000/api/register',
        registrationData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.success) {
        message.success('Registration successful! Please wait for admin approval.');
        form.resetFields();
        setSelectedClasses([]);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data.message || 'Registration failed';
        const errors = error.response.data.errors;
        
        if (errors) {
          Object.keys(errors).forEach(key => {
            message.error(`${key}: ${errors[key][0]}`);
          });
        } else {
          message.error(errorMessage);
        }
      } else {
        message.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepsConfig = [
    { title: 'Personal Info' },
    { title: 'Contact Details' },
    { title: 'Select Classes' }
  ];

  return (
    <div className="register-container">
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

      <div className="register-content">
        <div className="register-box" style={{ maxWidth: 650 }}>
          <h1 className="register-title">Register Now</h1>
          <p className="register-subtitle">ENROLL IN MULTIPLE CLASSES</p>

          <Steps current={currentStep} className="register-steps" items={stepsConfig} />

          <Form form={form} name="register" onFinish={onFinish} layout="vertical" className="register-form">
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter your full name!' }]}>
                <Input size="large" placeholder="Enter your full name" />
              </Form.Item>
              <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email' }]}>
                <Input size="large" placeholder="Enter your email" />
              </Form.Item>
              <Form.Item label="Password" name="password" rules={[{ required: true }, { min: 6 }]}>
                <Input.Password size="large" placeholder="Enter your password" />
              </Form.Item>
              <Form.Item label="Confirm Password" name="confirmPassword" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('Passwords do not match!')); }})]}>
                <Input.Password size="large" placeholder="Confirm your password" />
              </Form.Item>
            </div>

            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <Form.Item label="Phone Number" name="phone" rules={[{ required: true }]}>
                <Input size="large" placeholder="Enter your phone number" />
              </Form.Item>
              <Form.Item label="Address" name="address" rules={[{ required: true }]}>
                <Input.TextArea size="large" rows={4} placeholder="Enter your full address" />
              </Form.Item>
            </div>

            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <Card title="Add Classes" size="small" style={{ marginBottom: 20 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Select size="large" placeholder="Select a subject" value={tempSubject} onChange={handleSubjectChange} style={{ width: '100%' }}>
                    {subjects.filter(subject => !selectedClasses.some(sc => sc.subjectId === subject.subjectId)).map(subject => (
                      <Option key={subject.subjectId} value={subject.subjectId}>{subject.name} - {subject.form}</Option>
                    ))}
                  </Select>
                  <Select size="large" placeholder="Select class schedule" value={tempClass} onChange={setTempClass} disabled={!tempSubject} style={{ width: '100%' }}>
                    {availableClasses.map(cls => (
                      <Option key={cls.classId} value={cls.classId}>
                        {cls.classDay} - {cls.startTime} to {cls.finishTime} 
                        {cls.location && ` at ${cls.location}`}
                        {cls.teacher && ` (${cls.teacher})`}
                      </Option>
                    ))}
                  </Select>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddClass} block size="large">Add Class</Button>
                </Space>
              </Card>

              {selectedClasses.length > 0 && (
                <Card title={`Selected Classes (${selectedClasses.length})`} size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {selectedClasses.map(cls => (
                      <Card key={cls.classId} size="small" style={{ background: '#f5f5f5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{cls.subjectName} - {cls.form}</div>
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
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
                  No classes selected yet. Add at least one class to continue.
                </div>
              )}
            </div>

            <div className="steps-action" style={{ marginTop: 24 }}>
              {currentStep > 0 && <Button style={{ marginRight: 8 }} onClick={handlePrevious} size="large">Previous</Button>}
              {currentStep < 2 && <Button type="primary" onClick={handleNext} size="large" className="register-button">Next</Button>}
              {currentStep === 2 && <Button type="primary" htmlType="submit" loading={loading} size="large" className="register-button" block disabled={selectedClasses.length === 0}>REGISTER ({selectedClasses.length} {selectedClasses.length === 1 ? 'CLASS' : 'CLASSES'})</Button>}
            </div>
          </Form>

          <div className="register-footer">Already have an account? <Link to="/login">Login here</Link></div>
        </div>
      </div>
    </div>
  );
};

export default Register;