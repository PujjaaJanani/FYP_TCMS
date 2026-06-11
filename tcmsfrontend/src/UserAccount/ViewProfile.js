// src/Pages/Profile.js
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Upload, Avatar, message, Modal, Form, Tag, Spin, Flex } from 'antd';
import { 
  UserOutlined, 
  CameraOutlined, 
  DeleteOutlined,
  BookOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const ViewProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState(null);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    parentEmail: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        apiUrl('/api/profile'),
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        const data = res.data.data;
        setProfile(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          parentEmail: data.parentEmail || '',
          address: data.address || '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (value) => {
    setForm({ ...form, password: value });
    if (form.confirmPassword) {
      setPasswordMatch(value === form.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (value) => {
    setForm({ ...form, confirmPassword: value });
    setPasswordMatch(form.password === value);
  };

  const handleSave = async () => {
    if (profile.userType === 'parent') {
      if (!form.parentEmail) {
        message.error('Please fill in parent email');
        return;
      }

      if (form.password || form.confirmPassword) {
        if (form.password !== form.confirmPassword) {
          message.error('Parent passwords do not match');
          return;
        }
        if (form.password.length < 6) {
          message.error('Parent password must be at least 6 characters');
          return;
        }
      }

      setSaving(true);
      try {
        const res = await axios.put(
          apiUrl('/api/profile'),
          {
            parentEmail: form.parentEmail,
            ...(form.password && { parentPassword: form.password })
          },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );

        if (res.data.success) {
          message.success('Parent email updated successfully');
          setForm({ ...form, password: '', confirmPassword: '' });
          setPasswordMatch(true);
          fetchProfile();
        }
      } catch (error) {
        console.error('Error:', error);
        message.error(error.response?.data?.message || 'Failed to update parent email');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validation
    if (!form.name || !form.email || !form.phone) {
      message.error('Please fill in all required fields');
      return;
    }

    if (profile.userType === 'student' && !form.address) {
      message.error('Address is required');
      return;
    }

    // Password validation
    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        message.error('Passwords do not match');
        return;
      }
      if (form.password.length < 6) {
        message.error('Password must be at least 6 characters');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        ...(profile.userType === 'student' && { address: form.address }),
        ...(form.password && { password: form.password })
      };

      const res = await axios.put(
        apiUrl('/api/profile'),
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Profile updated successfully');
        // Clear password fields
        setForm({ ...form, password: '', confirmPassword: '' });
        setPasswordMatch(true);
        fetchProfile();
      }
    } catch (error) {
      console.error('Error:', error);
      message.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      parentEmail: profile.parentEmail || '',
      address: profile.address || '',
      password: '',
      confirmPassword: ''
    });
    setPasswordMatch(true);
    message.info('Changes discarded');
  };

  const handlePhotoUpload = async (file) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const res = await axios.post(
        apiUrl('/api/profile/upload-picture'),
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (res.data.success) {
        message.success('Profile picture updated successfully');
        fetchProfile();
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleDeletePhoto = () => {
    Modal.confirm({
      title: 'Delete Profile Picture',
      content: 'Are you sure you want to delete your profile picture?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await axios.delete(
            apiUrl('/api/profile/delete-picture'),
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );

          if (res.data.success) {
            message.success('Profile picture deleted');
            fetchProfile();
          }
        } catch (error) {
          console.error('Error:', error);
          message.error('Failed to delete profile picture');
        }
      }
    });
  };

  // Day color mapping for tags
  const dayColors = {
    Monday: 'blue',
    Tuesday: 'green',
    Wednesday: 'orange',
    Thursday: 'purple',
    Friday: 'cyan',
    Saturday: 'magenta',
    Sunday: 'red'
  };

  const styles = {
    page: {
      padding: '24px',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    header: {
      textAlign: 'center',
      marginBottom: 32,
      paddingTop: 20
    },
    title: {
      fontSize: 32,
      fontWeight: 600,
      color: '#3b1fa3',
      margin: 0
    },
    container: {
      maxWidth: 1100,
      margin: '0 auto'
    },
    card: {
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    avatarSection: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 0',
      borderBottom: '1px solid #f0f0f0',
      marginBottom: 24
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: 16
    },
    avatar: {
      width: 120,
      height: 120,
      border: '4px solid #5B4FC4',
      backgroundColor: '#e6e6fa'
    },
    uploadButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#5B4FC4',
      color: '#fff',
      border: 'none',
      borderRadius: '50%',
      width: 40,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    },
    deletePhotoBtn: {
      marginTop: 8
    },
    formSection: {
      padding: '0 32px 32px'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      marginBottom: 24
    },
    formGroup: {
      marginBottom: 24
    },
    label: {
      display: 'block',
      marginBottom: 8,
      fontWeight: 500,
      color: '#333',
      fontSize: 14
    },
    required: {
      color: 'red'
    },
    input: {
      width: '100%',
      height: 40,
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      padding: '8px 12px',
      fontSize: 14
    },
    textarea: {
      width: '100%',
      minHeight: 80,
      borderRadius: 6,
      border: '1px solid #d9d9d9',
      padding: '8px 12px',
      fontSize: 14,
      resize: 'vertical'
    },
    subjectsSection: {
      marginTop: 16,
      marginBottom: 24,
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      padding: 20,
      border: '1px solid #e8e8e8'
    },
    subjectsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderBottom: '1px solid #e8e8e8',
      paddingBottom: 12
    },
    subjectsTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: '#3b1fa3',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    },
    totalFee: {
      fontSize: 16,
      fontWeight: 600,
      color: '#52c41a',
      padding: '4px 12px',
      backgroundColor: '#f6ffed',
      borderRadius: 20,
      border: '1px solid #b7eb8f'
    },
    formGroupTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: '#5B4FC4',
      margin: '20px 0 12px 0',
      paddingBottom: 8,
      borderBottom: '1px dashed #d9d9d9'
    },
    classCard: {
      backgroundColor: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      ':hover': {
        boxShadow: '0 4px 12px rgba(91, 79, 196, 0.1)',
        borderColor: '#5B4FC4'
      }
    },
    classHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12
    },
    subjectName: {
      fontSize: 16,
      fontWeight: 600,
      color: '#3b1fa3'
    },
    classDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
      marginTop: 8
    },
    detailItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: '#666',
      fontSize: 13
    },
    feeTag: {
      backgroundColor: '#f6ffed',
      borderColor: '#b7eb8f',
      color: '#389e0d',
      fontWeight: 500
    },
    errorText: {
      color: '#ff4d4f',
      fontSize: 12,
      marginTop: 4,
      marginBottom: 0
    },
    buttonGroup: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 0
    },
    cancelBtn: {
      minWidth: 120,
      height: 40,
      fontSize: 16,
      fontWeight: 500
    },
    saveBtn: {
      minWidth: 120,
      height: 40,
      fontSize: 16,
      fontWeight: 500,
      backgroundColor: '#52c41a',
      borderColor: '#52c41a'
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    parentReadOnlyBox: {
      background: '#fafafa',
      border: '1px solid #e8e8e8',
      borderRadius: 8,
      padding: 12,
      color: '#555'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (profile?.userType === 'parent') {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>PROFILE</h1>
        </div>

        <div style={styles.container}>
          <Card style={styles.card}>
            <div style={styles.formSection}>
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  Parent Email <span style={styles.required}>*</span>
                </div>
                <Input
                  value={form.parentEmail}
                  onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                  placeholder="Enter parent email"
                  type="email"
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.formGroup}>
                  <div style={styles.label}>
                    Parent Password <span style={{ color: '#666', fontWeight: 400 }}>(optional)</span>
                  </div>
                  <Input.Password
                    value={form.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter new parent password"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <div style={styles.label}>Confirm Parent Password</div>
                  <Input.Password
                    value={form.confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    placeholder="Confirm parent password"
                    style={{ ...styles.input, borderColor: !passwordMatch && (form.password || form.confirmPassword) ? '#ff4d4f' : undefined }}
                  />
                  {!passwordMatch && (form.password || form.confirmPassword) && (
                    <div style={styles.errorText}>Parent passwords do not match</div>
                  )}
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <Button size="large" onClick={handleCancel} style={styles.cancelBtn}>
                  Cancel
                </Button>
                <Button type="primary" size="large" onClick={handleSave} loading={saving} style={styles.saveBtn}>
                  Save
                </Button>
              </div>

              <div style={styles.subjectsSection}>
                <div style={styles.subjectsHeader}>
                  <div style={styles.subjectsTitle}>
                    <TeamOutlined /> Linked Children ({profile.linkedChildrenCount || 0})
                  </div>
                  <div style={styles.totalFee}>
                    <DollarOutlined /> Total Monthly Fee: RM {Number(profile.totalMonthlyFee || 0).toFixed(2)}
                  </div>
                </div>

                {(profile.children || []).map((child) => (
                  <div key={child.studentId} style={{ ...styles.classCard, marginBottom: 16 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={styles.subjectName}>{child.name}</div>
                      <div style={{ fontSize: 13, color: '#777' }}>{child.email}</div>
                      <div style={{ fontSize: 13, color: '#777' }}>{child.phone}</div>
                      <div style={{ ...styles.parentReadOnlyBox, marginTop: 8 }}>{child.address || '-'}</div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <Tag color="green">Child Total: RM {Number(child.totalMonthlyFee || 0).toFixed(2)}</Tag>
                    </div>

                    <Flex vertical gap={8}>
                      {(child.classes || []).map((cls, idx) => (
                        <div key={`${child.studentId}-${idx}`} style={styles.classCard}>
                          <div style={styles.classHeader}>
                            <span style={styles.subjectName}>{cls.subjectName}</span>
                            <Tag color="cyan" style={styles.feeTag}>
                              RM {Number(cls.subjectFee || 0).toFixed(2)}
                            </Tag>
                          </div>
                          <div style={styles.classDetails}>
                            <div style={styles.detailItem}>
                              <Tag color={dayColors[cls.classDay]} style={{ marginRight: 4 }}>
                                {cls.classDay}
                              </Tag>
                            </div>
                            <div style={styles.detailItem}>
                              <ClockCircleOutlined style={{ color: '#5B4FC4' }} />
                              {cls.startTime} - {cls.finishTime}
                            </div>
                            {cls.location && (
                              <div style={styles.detailItem}>
                                <EnvironmentOutlined style={{ color: '#5B4FC4' }} />
                                {cls.location}
                              </div>
                            )}
                            {cls.teacher && (
                              <div style={styles.detailItem}>
                                <TeamOutlined style={{ color: '#5B4FC4' }} />
                                {cls.teacher}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </Flex>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>PROFILE</h1>
      </div>

      <div style={styles.container}>
        <Card style={styles.card}>
          {/* Profile Picture Section */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                src={profile?.profilePicture}
                style={styles.avatar}
              />
              <Upload
                beforeUpload={handlePhotoUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button
                  style={styles.uploadButton}
                  icon={<CameraOutlined />}
                  loading={uploadingPhoto}
                />
              </Upload>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                Max file size: 2MB
              </div>
            </div>
            {profile?.profilePicture && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleDeletePhoto}
                style={styles.deletePhotoBtn}
              >
                Delete Photo
              </Button>
            )}
          </div>

          {/* Form Section */}
          <div style={styles.formSection}>
            <div style={styles.row}>
              {/* Name */}
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  Name <span style={styles.required}>*</span>
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter name"
                  style={styles.input}
                />
              </div>

              {/* Email */}
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </div>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter email"
                  type="email"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Contact Number */}
            <div style={styles.formGroup}>
              <div style={styles.label}>
                Contact Number <span style={styles.required}>*</span>
              </div>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter contact number"
                style={styles.input}
              />
            </div>

            {/* Address (Student only) */}
            {profile?.userType === 'student' && (
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  Address <span style={styles.required}>*</span>
                </div>
                <Input.TextArea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter address"
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            )}

            {/* Password Section */}
            <div style={styles.row}>
              {/* New Password */}
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  New Password <span style={{ color: '#666', fontWeight: 400 }}>(optional)</span>
                </div>
                <Input.Password
                  value={form.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter new password"
                  style={styles.input}
                />
              </div>

              {/* Confirm Password */}
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  Confirm Password
                </div>
                <Input.Password
                  value={form.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Confirm password"
                  style={{ ...styles.input, borderColor: !passwordMatch && (form.password || form.confirmPassword) ? '#ff4d4f' : undefined }}
                />
                {!passwordMatch && (form.password || form.confirmPassword) && (
                  <div style={styles.errorText}>Passwords do not match</div>
                )}
              </div>
            </div>

            {/* Buttons - Moved here after password section */}
            <div style={styles.buttonGroup}>
              <Button
                size="large"
                onClick={handleCancel}
                style={styles.cancelBtn}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={handleSave}
                loading={saving}
                style={styles.saveBtn}
              >
                Save
              </Button>
            </div>

            {/* Registered Subjects (Student only - Enhanced Display) - Now after buttons */}
            {profile?.userType === 'student' && profile.registeredClasses && profile.registeredClasses.length > 0 && (
              <div style={styles.subjectsSection}>
                <div style={styles.subjectsHeader}>
                  <div style={styles.subjectsTitle}>
                    <BookOutlined /> Registered Classes ({profile.totalClasses})
                  </div>
                  <div style={styles.totalFee}>
                    <DollarOutlined /> Total Monthly Fee: RM {profile.totalMonthlyFee?.toFixed(2)}
                  </div>
                </div>

                {/* Group by Form */}
                {Object.keys(profile.groupedSubjects || {}).sort((a, b) => {
                  const numA = parseInt(a.replace('Form ', ''));
                  const numB = parseInt(b.replace('Form ', ''));
                  return numA - numB;
                }).map(form => (
                  <div key={form}>
                    <div style={styles.formGroupTitle}>
                      <Tag color="purple" style={{ fontSize: 14, padding: '4px 8px' }}>{form}</Tag>
                    </div>
                    
                    {profile.groupedSubjects[form].map((cls, index) => (
                      <div key={index} style={styles.classCard}>
                        <div style={styles.classHeader}>
                          <span style={styles.subjectName}>{cls.subjectName}</span>
                          <Tag color="cyan" style={styles.feeTag}>
                            RM {cls.subjectFee?.toFixed(2)}
                          </Tag>
                        </div>
                        
                        <div style={styles.classDetails}>
                          <div style={styles.detailItem}>
                            <Tag color={dayColors[cls.classDay]} style={{ marginRight: 4 }}>
                              {cls.classDay}
                            </Tag>
                          </div>
                          
                          <div style={styles.detailItem}>
                            <ClockCircleOutlined style={{ color: '#5B4FC4' }} />
                            {cls.startTime} - {cls.finishTime}
                          </div>
                          
                          {cls.location && (
                            <div style={styles.detailItem}>
                              <EnvironmentOutlined style={{ color: '#5B4FC4' }} />
                              {cls.location}
                            </div>
                          )}
                          
                          {cls.teacher && (
                            <div style={styles.detailItem}>
                              <TeamOutlined style={{ color: '#5B4FC4' }} />
                              {cls.teacher}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ViewProfile;
