// src/Pages/AddUser.js - Complete fixed version
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Select, Button, message, Radio, Checkbox, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Option } = Select;

const AddUser = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState('student');
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordValid, setPasswordValid] = useState(true);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'Staff',
    monthlyFee: 0
  });

  useEffect(() => {
    if (userType === 'student') {
      fetchSubjects();
      fetchAllClasses();
      setForm(prev => ({ ...prev, role: 'Staff' }));
    } else {
      setSubjects([]);
      setSelectedSubjects([]);
      setSelectedClasses([]);
      setClasses([]);
      setForm(prev => ({ 
        ...prev, 
        address: '', 
        monthlyFee: 0 
      }));
    }
  }, [userType]);

  const calculateMonthlyFee = (classIds) => {
    console.log('=== CALCULATING MONTHLY FEE ===');
    console.log('Class IDs selected:', classIds);
    console.log('Classes available:', classes);
    console.log('Subjects available:', subjects);
    
    if (!classIds || classIds.length === 0) {
      setForm(prev => ({ ...prev, monthlyFee: 0 }));
      return 0;
    }
    
    let total = 0;
    
    // Find selected class objects
    const selectedClassObjects = classes.filter(c => classIds.includes(c.classId));
    console.log('Selected class objects:', selectedClassObjects);
    
    // Method 1: Check if classes have subjectFee directly
    if (selectedClassObjects.length > 0 && selectedClassObjects[0].subjectFee !== undefined) {
      total = selectedClassObjects.reduce((sum, c) => sum + (parseFloat(c.subjectFee) || 0), 0);
      console.log('Total from direct subjectFee:', total);
    } 
    // Method 2: Match by subjectName to get fee from subjects array
    else if (selectedClassObjects.length > 0) {
      const selectedSubjectNames = [...new Set(selectedClassObjects.map(c => c.subjectName))];
      console.log('Selected subject names:', selectedSubjectNames);
      
      total = subjects
        .filter(s => selectedSubjectNames.includes(s.name))
        .reduce((sum, s) => sum + (parseFloat(s.subjectFee) || 0), 0);
      console.log('Total from subjects lookup:', total);
    }
    // Method 3: Use class's subjectId if available
    else if (selectedClassObjects.length > 0 && selectedClassObjects[0].subjectId) {
      const selectedSubjectIds = [...new Set(selectedClassObjects.map(c => c.subjectId))];
      total = subjects
        .filter(s => selectedSubjectIds.includes(s.subjectId))
        .reduce((sum, s) => sum + (parseFloat(s.subjectFee) || 0), 0);
      console.log('Total from subjectId lookup:', total);
    }
    
    setForm(prev => ({ ...prev, monthlyFee: total }));
    return total;
  };

  const validatePassword = (password) => {
    const errors = [];
    
    if (password && password.length > 0) {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        errors.push('Password must contain at least one symbol');
      }
    }
    
    setPasswordErrors(errors);
    setPasswordValid(errors.length === 0);
    return errors.length === 0;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, password: value });
    validatePassword(value);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address (e.g., user@example.com)');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, email: value });
    validateEmail(value);
  };

  const fetchSubjects = async () => {
    setFetchingSubjects(true);
    try {
      const res = await axios.get(apiUrl('/api/subjects'));
      console.log('Subjects API response:', res.data);
      
      let subjectsData = [];
      if (res.data.success && Array.isArray(res.data.data)) {
        subjectsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        subjectsData = res.data;
      } else {
        console.error('Unexpected API response structure:', res.data);
        subjectsData = [];
      }
      
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      message.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setFetchingSubjects(false);
    }
  };

  const fetchAllClasses = async () => {
    setFetchingClasses(true);
    try {
      const res = await axios.get(apiUrl('/api/classes'));
      console.log('All classes response:', res.data);
      
      let classesData = [];
      if (Array.isArray(res.data)) {
        classesData = res.data;
      } else if (res.data.success && Array.isArray(res.data.data)) {
        classesData = res.data.data;
      } else {
        console.error('Unexpected classes response structure:', res.data);
        classesData = [];
      }
      
      console.log('Processed classes data:', classesData);
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to load classes');
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    const subject = subjects.find(s => (s.subjectId || s.id) === subjectId);
    const subjectName = subject?.name;
    
    if (selectedSubjects.includes(subjectId)) {
      // Remove subject and its classes
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
      
      // Remove all classes under this subject from selectedClasses
      const classesToRemove = classes
        .filter(c => c.subjectName === subjectName)
        .map(c => c.classId);
      
      const newSelectedClasses = selectedClasses.filter(id => !classesToRemove.includes(id));
      setSelectedClasses(newSelectedClasses);
      calculateMonthlyFee(newSelectedClasses);
    } else {
      // Add subject
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleClassChange = (classId) => {
    const newSelectedClasses = selectedClasses.includes(classId)
      ? selectedClasses.filter(id => id !== classId)
      : [...selectedClasses, classId];
    setSelectedClasses(newSelectedClasses);
    calculateMonthlyFee(newSelectedClasses);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.phone) {
      message.error('Please fill in all required fields');
      return;
    }

    if (!validatePassword(form.password)) {
      message.error('Password does not meet requirements:\n' + passwordErrors.join('\n'));
      return;
    }

    if (!validateEmail(form.email)) {
      message.error(emailError || 'Please enter a valid email address');
      return;
    }

    if (userType === 'student') {
      if (!form.address) {
        message.error('Address is required for students');
        return;
      }
      if (selectedClasses.length === 0) {
        message.error('Please select at least one class');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        userType,
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
      };

      if (userType === 'student') {
        payload.address = form.address;
        payload.classIds = selectedClasses;
        payload.monthlyFee = form.monthlyFee;
      }

      if (userType === 'authority') {
        payload.role = form.role;
      }

      console.log('Submitting payload:', payload);

      const res = await axios.post(
        apiUrl('/api/users'),
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('User added successfully');
        navigate('/admin/users');
      }
    } catch (error) {
      console.error('Error:', error);
      
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join('\n');
        message.error({
          content: (
            <div>
              <div style={{ whiteSpace: 'pre-line', marginTop: 8 }}>
                {errorMessages}
              </div>
            </div>
          ),
          duration: 5
        });
      } else {
        message.error(error.response?.data?.message || 'Failed to add user');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      padding: '24px',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    header: {
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 16
    },
    card: {
      maxWidth: 800,
      margin: '0 auto'
    },
    formGroup: {
      marginBottom: 20
    },
    label: {
      display: 'block',
      marginBottom: 8,
      fontWeight: 500,
      color: '#333'
    },
    required: {
      color: 'red'
    },
    buttonGroup: {
      display: 'flex',
      gap: 12,
      justifyContent: 'flex-end',
      marginTop: 24
    },
    subjectCard: {
      border: '1px solid #d9d9d9',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16
    },
    classCheckbox: {
      display: 'block',
      marginBottom: 8
    },
    errorText: {
      color: '#ff4d4f',
      fontSize: 12,
      marginTop: 4
    },
    passwordHint: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    },
    hintValid: {
      color: '#52c41a'
    },
    hintInvalid: {
      color: '#ff4d4f'
    }
  };

  const getClassesForSubject = (subjectName) => {
    return classes.filter(c => c.subjectName === subjectName);
  };

  // Debug log to see what's in classes
  useEffect(() => {
    if (classes.length > 0) {
      console.log('Classes sample:', classes[0]);
      console.log('Classes keys:', Object.keys(classes[0] || {}));
    }
  }, [classes]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/users')}
          size="large"
        >
          Back
        </Button>
        <h2 style={{ margin: 0, color: '#3b1fa3', fontSize: 28 }}>Add New User</h2>
      </div>

      <Card style={styles.card}>
        <div style={styles.formGroup}>
          <div style={styles.label}>
            User Type <span style={styles.required}>*</span>
          </div>
          <Radio.Group value={userType} onChange={(e) => setUserType(e.target.value)} size="large">
            <Radio.Button value="student">Student</Radio.Button>
            <Radio.Button value="authority">Authority (Staff/Admin)</Radio.Button>
          </Radio.Group>
        </div>

        {userType === 'authority' && (
          <div style={styles.formGroup}>
            <div style={styles.label}>
              Role <span style={styles.required}>*</span>
            </div>
            <Select
              value={form.role}
              onChange={(value) => setForm({ ...form, role: value })}
              style={{ width: '100%' }}
              size="large"
            >
              <Option value="Admin">Admin</Option>
              <Option value="Staff">Staff</Option>
            </Select>
          </div>
        )}

        <div style={styles.formGroup}>
          <div style={styles.label}>
            Full Name <span style={styles.required}>*</span>
          </div>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter full name"
            size="large"
          />
        </div>

        <div style={styles.formGroup}>
          <div style={styles.label}>
            Email <span style={styles.required}>*</span>
          </div>
          <Input
            value={form.email}
            onChange={handleEmailChange}
            placeholder="Enter email address (e.g., user@example.com)"
            type="email"
            size="large"
            status={emailError ? 'error' : ''}
          />
          {emailError && <div style={styles.errorText}>{emailError}</div>}
        </div>

        <div style={styles.formGroup}>
          <div style={styles.label}>
            Password <span style={styles.required}>*</span>
          </div>
          <Input.Password
            value={form.password}
            onChange={handlePasswordChange}
            placeholder="Enter password (min 6 characters, 1 digit, 1 symbol)"
            size="large"
            status={!passwordValid && form.password ? 'error' : ''}
          />
          {form.password && (
            <div style={styles.passwordHint}>
              <div style={form.password.length >= 6 ? styles.hintValid : styles.hintInvalid}>
                {form.password.length >= 6 ? '✓' : '✗'} At least 6 characters
              </div>
              <div style={/\d/.test(form.password) ? styles.hintValid : styles.hintInvalid}>
                {/\d/.test(form.password) ? '✓' : '✗'} At least 1 number
              </div>
              <div style={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(form.password) ? styles.hintValid : styles.hintInvalid}>
                {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(form.password) ? '✓' : '✗'} At least 1 symbol
              </div>
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <div style={styles.label}>
            Phone Number <span style={styles.required}>*</span>
          </div>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Enter phone number"
            size="large"
          />
        </div>

        {userType === 'student' && (
          <>
            <div style={styles.formGroup}>
              <div style={styles.label}>
                Address <span style={styles.required}>*</span>
              </div>
              <Input.TextArea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter full address"
                rows={3}
                size="large"
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                Monthly Fee (RM) <span style={{ color: '#666', fontWeight: 400 }}>(Auto-calculated)</span>
              </div>
              <Input
                type="number"
                value={form.monthlyFee}
                readOnly
                size="large"
                prefix="RM"
                style={{ background: '#f5f5f5', color: '#3b1fa3', fontWeight: 600, cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {selectedClasses.length === 0
                  ? 'Select classes above to calculate fee automatically'
                  : `Total fee for ${selectedClasses.length} selected class(es)`}
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                Select Subjects and Classes <span style={styles.required}>*</span>
              </div>
              
              {fetchingSubjects || fetchingClasses ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin tip="Loading subjects and classes..." />
                </div>
              ) : subjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No subjects available
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {subjects.map(subject => {
                    const subjectId = subject.subjectId || subject.id;
                    const subjectName = subject.name;
                    const subjectClasses = getClassesForSubject(subjectName);
                    
                    return (
                      <div key={subjectId} style={styles.subjectCard}>
                        <Checkbox
                          checked={selectedSubjects.includes(subjectId)}
                          onChange={() => handleSubjectChange(subjectId)}
                          style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}
                        >
                          {subject.name} {subject.form ? `(${subject.form})` : ''}
                          {subject.subjectFee > 0 && (
                            <span style={{ marginLeft: 8, color: '#52c41a', fontSize: 12 }}>
                              (RM {parseFloat(subject.subjectFee).toFixed(2)})
                            </span>
                          )}
                        </Checkbox>

                        {selectedSubjects.includes(subjectId) && (
                          <div style={{ marginLeft: 24, marginTop: 8 }}>
                            {subjectClasses.length > 0 ? (
                              subjectClasses.map(classItem => {
                                const classId = classItem.classId;
                                return (
                                  <Checkbox
                                    key={classId}
                                    checked={selectedClasses.includes(classId)}
                                    onChange={() => handleClassChange(classId)}
                                    style={styles.classCheckbox}
                                  >
                                    {classItem.classDay} - {classItem.startTime} to {classItem.finishTime}
                                    {classItem.location && ` (${classItem.location})`}
                                  </Checkbox>
                                );
                              })
                            ) : (
                              <div style={{ color: '#999', fontStyle: 'italic' }}>
                                No classes available for this subject
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <div style={styles.buttonGroup}>
          <Button size="large" onClick={() => navigate('/admin/users')}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={loading}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Add User
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AddUser;
