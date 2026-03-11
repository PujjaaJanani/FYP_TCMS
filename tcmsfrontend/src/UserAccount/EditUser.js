// src/Pages/EditUser.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Input, Select, Button, message, Checkbox, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';

const { Option } = Select;

const EditUser = () => {
  const navigate = useNavigate();
  const { userType, userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [fetchingSubjects, setFetchingSubjects] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [registrationLoaded, setRegistrationLoaded] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'Staff',
    monthlyFee: 200
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchUser();
      if (userType === 'student') {
        await fetchSubjects();
        await fetchAllClasses();
      }
    };
    loadData();
  }, [userType, userId]);

  // Update selectedSubjects whenever selectedClasses, classes, or subjects change
  useEffect(() => {
    if (selectedClasses.length > 0 && classes.length > 0 && subjects.length > 0 && registrationLoaded) {
      // Get the selected class objects
      const selectedClassesData = classes.filter(c => 
        selectedClasses.includes(c.classId)
      );
      
      console.log('Selected classes data:', selectedClassesData);
      
      // Find subjects that match by subjectName
      const subjectNames = [...new Set(
        selectedClassesData.map(c => c.subjectName)
      )];
      
      // Find subject IDs that match these names
      const subjectIds = subjects
        .filter(s => subjectNames.includes(s.name))
        .map(s => s.subjectId || s.id);
      
      console.log('Setting selected subjects:', subjectIds);
      setSelectedSubjects(subjectIds);
    }
  }, [selectedClasses, classes, subjects, registrationLoaded]);

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

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/users/${userType}/${userId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        const user = res.data.data;
        
        // Create base form data
        const formData = {
          name: user.name || '',
          email: user.email || '',
          password: '',
          phone: user.phone || user.contactNumber || '',
          role: user.role || 'Staff',
        };

        // Add student-specific fields only if user is a student
        if (userType === 'student') {
          formData.address = user.address || '';
          formData.monthlyFee = user.monthlyFee || 200;
        }

        setForm(formData);

        // Validate the email from the user data
        if (user.email) {
          validateEmail(user.email);
        }

        // If student, fetch registration details
        if (userType === 'student') {
          await fetchStudentRegistration(userId);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentRegistration = async (studentId) => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/users/student/${studentId}/registration`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success && res.data.data) {
        const registration = res.data.data;
        setForm(prev => ({
          ...prev,
          monthlyFee: registration.monthlyFee || 200
        }));

        // Parse classIds
        if (registration.classIds) {
          const classIdArray = registration.classIds.split(',').map(id => parseInt(id));
          console.log('Selected class IDs from registration:', classIdArray);
          setSelectedClasses(classIdArray);
          setRegistrationLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error fetching registration:', error);
    }
  };

  const fetchAllClasses = async () => {
    setFetchingClasses(true);
    try {
      const res = await axios.get('http://localhost:8000/api/classes');
      console.log('All classes response:', res.data);
      
      // Handle different response structures
      let classesData = [];
      if (Array.isArray(res.data)) {
        classesData = res.data;
      } else if (res.data.success && Array.isArray(res.data.data)) {
        classesData = res.data.data;
      } else {
        console.error('Unexpected classes response structure:', res.data);
        classesData = [];
      }
      
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to load classes');
    } finally {
      setFetchingClasses(false);
    }
  };

  const fetchSubjects = async () => {
    setFetchingSubjects(true);
    try {
      const res = await axios.get('http://localhost:8000/api/subjects');
      console.log('Subjects API response:', res.data);
      
      // Handle the response structure
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
      
      setSelectedClasses(selectedClasses.filter(id => !classesToRemove.includes(id)));
    } else {
      // Add subject
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleClassChange = (classId) => {
    if (selectedClasses.includes(classId)) {
      setSelectedClasses(selectedClasses.filter(id => id !== classId));
    } else {
      setSelectedClasses([...selectedClasses, classId]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.name || !form.email || !form.phone) {
      message.error('Please fill in all required fields');
      return;
    }

    // Validate email format
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

    setSaving(true);
    try {
      // Base payload with common fields
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
      };

      // Add password only if provided
      if (form.password) {
        payload.password = form.password;
      }

      // Add student-specific fields only if userType is student
      if (userType === 'student') {
        payload.address = form.address;
        payload.classIds = selectedClasses;
        payload.monthlyFee = form.monthlyFee;
      }

      // Add authority-specific fields only if userType is authority
      if (userType === 'authority') {
        payload.role = form.role;
      }

      console.log('Submitting payload:', payload);

      const res = await axios.put(
        `http://localhost:8000/api/users/${userType}/${userId}`,
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('User updated successfully');
        navigate('/admin/users');
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Better error handling to show validation errors
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const errorMessages = Object.values(errors).flat().join('\n');
        message.error({
          content: (
            <div>
              <strong>Validation failed:</strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: 8 }}>
                {errorMessages}
              </div>
            </div>
          ),
          duration: 5
        });
      } else {
        message.error(error.response?.data?.message || 'Failed to update user');
      }
    } finally {
      setSaving(false);
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
    }
  };

  // Group classes by subject for easier access
  const getClassesForSubject = (subjectName) => {
    return classes.filter(c => c.subjectName === subjectName);
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

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
        <h2 style={{ margin: 0, color: '#3b1fa3', fontSize: 28 }}>
          Edit {userType === 'student' ? 'Student' : 'Authority'}
        </h2>
      </div>

      <Card style={styles.card}>
        {/* Authority Role (if authority) */}
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

        {/* Name */}
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

        {/* Email with validation */}
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

        {/* Password */}
        <div style={styles.formGroup}>
          <div style={styles.label}>
            Password <span style={{ color: '#666', fontWeight: 400 }}>(leave blank to keep current)</span>
          </div>
          <Input.Password
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter new password"
            size="large"
          />
        </div>

        {/* Phone */}
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

        {/* Student-specific fields */}
        {userType === 'student' && (
          <>
            {/* Address */}
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

            {/* Monthly Fee */}
            <div style={styles.formGroup}>
              <div style={styles.label}>
                Monthly Fee (RM) <span style={styles.required}>*</span>
              </div>
              <Input
                type="number"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: parseFloat(e.target.value) })}
                size="large"
                prefix="RM"
              />
            </div>

            {/* Subject and Class Selection */}
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

        {/* Buttons */}
        <div style={styles.buttonGroup}>
          <Button size="large" onClick={() => navigate('/admin/users')}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={saving}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EditUser;