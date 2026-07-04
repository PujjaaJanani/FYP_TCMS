// src/Pages/AddClassSchedule.js
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, TimePicker, Button, Card, message, Typography, Flex, Row, Col,
  Modal, Space, InputNumber, Table, Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import dayjs from 'dayjs';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title } = Typography;
const { Option } = Select;

const AddClassSchedule = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isEditSubjectModalVisible, setIsEditSubjectModalVisible] = useState(false);
  const [isTeacherModalVisible, setIsTeacherModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', form: '', subjectFee: 0 });
  const [editingSubject, setEditingSubject] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', password: '' });
  const [tempSubjects, setTempSubjects] = useState([]);
  const [tempTeachers, setTempTeachers] = useState([]);
  const [nextTempId, setNextTempId] = useState(-1);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [updatingSubject, setUpdatingSubject] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects/with-classes', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) setSubjects(res.data.data);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      message.error('Failed to load subjects');
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/api/teachers', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) setTeachers(res.data.data);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      message.error('Failed to load teachers');
    }
  };

  const handleAddNewSubject = () => {
    if (!newSubject.name || !newSubject.form) {
      message.error('Please fill in subject name and form');
      return;
    }

    if (!newSubject.subjectFee || newSubject.subjectFee <= 0) {
      message.error('Please enter a valid subject fee');
      return;
    }

    // Check if subject already exists
    const existingSubject = subjects.find(
      s => s.name.toLowerCase() === newSubject.name.toLowerCase() && 
           s.form === newSubject.form
    );

    if (existingSubject) {
      message.warning('This subject already exists');
      form.setFieldsValue({ subjectId: existingSubject.subjectId });
      setIsSubjectModalVisible(false);
      setNewSubject({ name: '', form: '', subjectFee: 0 });
      return;
    }

    // Create a temporary subject
    const tempSubject = {
      subjectId: nextTempId,
      name: newSubject.name,
      form: newSubject.form,
      subjectFee: newSubject.subjectFee,
      isTemp: true
    };

    setTempSubjects([...tempSubjects, tempSubject]);
    setNextTempId(nextTempId - 1);
    form.setFieldsValue({ subjectId: tempSubject.subjectId });
    
    setIsSubjectModalVisible(false);
    setNewSubject({ name: '', form: '', subjectFee: 0 });
    
    message.success('New subject added to the list');
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setIsEditSubjectModalVisible(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject.name || !editingSubject.form) {
      message.error('Please fill in subject name and form');
      return;
    }

    if (!editingSubject.subjectFee || editingSubject.subjectFee <= 0) {
      message.error('Please enter a valid subject fee');
      return;
    }

    // Check if it's a temporary subject
    if (editingSubject.isTemp) {
      // Update temporary subject
      setTempSubjects(tempSubjects.map(s => 
        s.subjectId === editingSubject.subjectId ? editingSubject : s
      ));
      message.success('Subject updated successfully');
      setIsEditSubjectModalVisible(false);
      setEditingSubject(null);
      return;
    }

    // Update permanent subject via API
    setUpdatingSubject(true);
    try {
      const res = await api.put(
        `/api/subjects/${editingSubject.subjectId}`,
        {
          name: editingSubject.name,
          form: editingSubject.form,
          subjectFee: editingSubject.subjectFee
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Subject updated successfully');
        // Update subjects list
        setSubjects(subjects.map(s => 
          s.subjectId === editingSubject.subjectId ? { ...s, ...editingSubject } : s
        ));
        setIsEditSubjectModalVisible(false);
        setEditingSubject(null);
      }
    } catch (err) {
      console.error('Failed to update subject:', err);
      message.error(err.response?.data?.message || 'Failed to update subject');
    } finally {
      setUpdatingSubject(false);
    }
  };

  const handleDeleteSubject = (subjectId) => {
    // Check if it's a temporary subject
    const isTemp = subjectId < 0;
    
    if (isTemp) {
      setTempSubjects(tempSubjects.filter(s => s.subjectId !== subjectId));
      message.success('Subject removed from list');
    } else {
      // For permanent subjects, you might want to add a delete API endpoint
      message.warning('Permanent subjects cannot be deleted here. Use subject management page.');
    }
  };

  const handleAddNewTeacher = async () => {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      message.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTeacher.email)) {
      message.error('Please enter a valid email address');
      return;
    }

    // Password validation
    if (newTeacher.password.length < 6) {
      message.error('Password must be at least 6 characters');
      return;
    }

    // Check if teacher already exists in permanent list
    const existingTeacher = teachers.find(
      t => t.email.toLowerCase() === newTeacher.email.toLowerCase()
    );

    if (existingTeacher) {
      message.warning('A teacher with this email already exists');
      form.setFieldsValue({ authorityId: existingTeacher.authorityId });
      setIsTeacherModalVisible(false);
      setNewTeacher({ name: '', email: '', phone: '', password: '' });
      return;
    }

    setCreatingTeacher(true);
    try {
      // Create teacher in database immediately
      const res = await api.post(
        '/api/teachers',
        newTeacher,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Teacher created successfully!');
        
        // Add to teachers list
        const newTeacherData = res.data.data;
        setTeachers([...teachers, newTeacherData]);
        
        // Auto-select the new teacher
        form.setFieldsValue({ authorityId: newTeacherData.authorityId });
        
        setIsTeacherModalVisible(false);
        setNewTeacher({ name: '', email: '', phone: '', password: '' });
      }
    } catch (err) {
      console.error('Failed to create teacher:', err);
      message.error(err.response?.data?.message || 'Failed to create teacher');
    } finally {
      setCreatingTeacher(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const selectedSubjectId = values.subjectId;
      
      // Check if the selected subject is a temporary one
      const isTempSubject = selectedSubjectId < 0;
      const tempSubjectData = isTempSubject 
        ? tempSubjects.find(s => s.subjectId === selectedSubjectId)
        : null;

      const requestData = {
        classDay: values.classDay,
        startTime: values.timeRange[0].format('HH:mm:ss'),
        finishTime: values.timeRange[1].format('HH:mm:ss'),
        location: values.location,
        availability: values.availability,
        authorityId: values.authorityId,
      };

      // If it's a temporary subject, send newSubject data with fee
      if (isTempSubject && tempSubjectData) {
        requestData.newSubject = {
          name: tempSubjectData.name,
          form: tempSubjectData.form,
          subjectFee: tempSubjectData.subjectFee
        };
      } else {
        requestData.subjectId = selectedSubjectId;
      }

      const res = await api.post(
        '/api/classes/schedule',
        requestData,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Class created successfully!');
        navigate('/authority/schedule');
      }
    } catch (err) {
      console.error('Failed to create class:', err);
      message.error(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  // Custom dropdown render for subjects with edit button
  const renderSubjectDropdown = (menu) => (
    <>
      {menu}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        borderTop: '1px solid #e8e8e8',
        marginTop: 4
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '8px',
          borderBottom: '1px dashed #e8e8e8'
        }}>
          <Button 
            type="text" 
            icon={<PlusOutlined />} 
            onClick={() => setIsSubjectModalVisible(true)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Add New Subject
          </Button>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '8px'
        }}>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              const selectedId = form.getFieldValue('subjectId');
              if (selectedId) {
                const subject = allSubjects.find(s => s.subjectId === selectedId);
                if (subject) {
                  handleEditSubject(subject);
                } else {
                  message.warning('Please select a subject first');
                }
              } else {
                message.warning('Please select a subject first');
              }
            }}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Edit Selected Subject
          </Button>
        </div>
      </div>
    </>
  );

  // Custom dropdown render for teachers
  const renderTeacherDropdown = (menu) => (
    <>
      {menu}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '8px',
        borderTop: '1px solid #e8e8e8',
        marginTop: 4
      }}>
        <Button 
          type="text" 
          icon={<PlusOutlined />} 
          onClick={() => setIsTeacherModalVisible(true)}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          Add New Teacher
        </Button>
      </div>
    </>
  );

  // Combine permanent and temporary subjects
  const allSubjects = [...subjects, ...tempSubjects];

  return (
    <div style={{
      padding: '24px',
      height: '100%',
      width: '100%',
      background: '#f7f5ff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/authority/schedule')}
        >
          Back to Schedule
        </Button>
      </div>

      <Row justify="center">
        <Col xs={24} sm={24} md={22} lg={20} xl={18}>
          <Card style={{
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: 8
          }}>
            <Title level={4} style={{ 
              color: '#3b1fa3', 
              marginBottom: 24,
              borderBottom: '2px solid #3b1fa3',
              paddingBottom: 12,
              textAlign: 'left'
            }}>
              Add New Class
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ classDay: 'Monday', availability: 30 }}
              size="large"
            >
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Subject"
                    name="subjectId"
                    rules={[{ required: true, message: 'Please select a subject' }]}
                  >
                    <Select 
                      placeholder="Select subject or add new"
                      dropdownRender={renderSubjectDropdown}
                      getPopupContainer={(trigger) => trigger.parentElement}
                      showSearch
                      optionFilterProp="children"
                      notFoundContent="No subjects found"
                    >
                      {allSubjects.map(s => (
                        <Option key={s.subjectId} value={s.subjectId}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Space>
                              <BookOutlined />
                              <span style={{ fontWeight: 500 }}>{s.name} - {s.form}</span>
                              {s.isTemp && (
                                <span style={{ 
                                  color: '#52c41a', 
                                  fontSize: '12px',
                                  marginLeft: 4,
                                  fontStyle: 'italic'
                                }}>
                                  (New)
                                </span>
                              )}
                            </Space>
                            {s.classes && s.classes.length > 0 && (
                              <div style={{ paddingLeft: 20 }}>
                                {s.classes.map(cls => (
                                  <div key={cls.classId} style={{ fontSize: '12px', color: '#888', lineHeight: '18px' }}>
                                    • {cls.classDay} {cls.startTime}–{cls.finishTime}
                                    {cls.location ? ` · ${cls.location}` : ''}
                                    {cls.teacherName ? ` · ${cls.teacherName}` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(!s.classes || s.classes.length === 0) && !s.isTemp && (
                              <div style={{ paddingLeft: 20, fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>
                                No classes yet
                              </div>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Day"
                    name="classDay"
                    rules={[{ required: true, message: 'Please select a day' }]}
                  >
                    <Select 
                      getPopupContainer={(trigger) => trigger.parentElement}
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <Option key={d} value={d}>{d}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Time"
                    name="timeRange"
                    rules={[{ required: true, message: 'Please select class time' }]}
                  >
                    <TimePicker.RangePicker
                      format="HH:mm"
                      style={{ width: '100%' }}
                      getPopupContainer={(trigger) => trigger.parentElement}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Location"
                    name="location"
                    rules={[{ required: true, message: 'Please enter location' }]}
                  >
                    <Input 
                      placeholder="e.g., Room 101, Main Building" 
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Maximum Students"
                    name="availability"
                    rules={[
                      { required: true, message: 'Please enter maximum students' },
                      { type: 'number', min: 1, max: 100, message: 'Must be between 1 and 100' }
                    ]}
                  >
                    <InputNumber 
                      placeholder="e.g., 30"
                      style={{ width: '100%' }}
                      min={1}
                      max={100}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="Teacher"
                    name="authorityId"
                    rules={[{ required: true, message: 'Please select a teacher' }]}
                  >
                    <Select 
                      placeholder="Select teacher or add new"
                      dropdownRender={renderTeacherDropdown}
                      getPopupContainer={(trigger) => trigger.parentElement}
                      showSearch
                      optionFilterProp="children"
                      notFoundContent="No teachers found"
                    >
                      {teachers.map(t => (
                        <Option key={t.authorityId} value={t.authorityId}>
                          <Space>
                            <UserOutlined />
                            {t.name} - {t.email}
                            {t.phone && <span style={{ color: '#888' }}>({t.phone})</span>}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Flex gap={8} wrap="wrap" justify="center">
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={loading}
                        style={{ 
                          background: '#52c41a', 
                          borderColor: '#52c41a',
                          minWidth: 140
                        }}
                      >
                        Create Class
                      </Button>
                      <Button 
                        onClick={() => navigate('/authority/schedule')}
                        style={{ minWidth: 100 }}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* New Subject Modal */}
      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: '#3b1fa3' }} />
            <span>Create New Subject</span>
          </Space>
        }
        open={isSubjectModalVisible}
        onCancel={() => {
          setIsSubjectModalVisible(false);
          setNewSubject({ name: '', form: '', subjectFee: 0 });
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsSubjectModalVisible(false);
            setNewSubject({ name: '', form: '', subjectFee: 0 });
          }}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            onClick={handleAddNewSubject}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Add to List
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Subject Name" required>
            <Input
              placeholder="e.g., Mathematics, Physics, Chemistry"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              size="large"
            />
          </Form.Item>
          
          <Form.Item label="Form/Level" required>
            <Select
              placeholder="Select form"
              value={newSubject.form}
              onChange={(value) => setNewSubject({ ...newSubject, form: value })}
              size="large"
              getPopupContainer={(trigger) => trigger.parentElement}
            >
              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'].map(f => (
                <Option key={f} value={f}>{f}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Subject Fee (RM)" required>
            <InputNumber
              placeholder="e.g., 150.00"
              value={newSubject.subjectFee}
              onChange={(value) => setNewSubject({ ...newSubject, subjectFee: value })}
              size="large"
              min={0}
              step={10}
              precision={2}
              style={{ width: '100%' }}
              // prefix={<DollarOutlined />}
            />
          </Form.Item>

          <Typography.Text type="secondary">
            The subject will be added to the dropdown immediately and saved when you create the class.
          </Typography.Text>
        </Form>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#3b1fa3' }} />
            <span>Edit Subject</span>
          </Space>
        }
        open={isEditSubjectModalVisible}
        onCancel={() => {
          setIsEditSubjectModalVisible(false);
          setEditingSubject(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsEditSubjectModalVisible(false);
            setEditingSubject(null);
          }}>
            Cancel
          </Button>,
          <Button
            key="update"
            type="primary"
            loading={updatingSubject}
            onClick={handleUpdateSubject}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Update Subject
          </Button>
        ]}
      >
        {editingSubject && (
          <Form layout="vertical">
            <Form.Item label="Subject Name" required>
              <Input
                placeholder="e.g., Mathematics, Physics, Chemistry"
                value={editingSubject.name}
                onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                size="large"
              />
            </Form.Item>
            
            <Form.Item label="Form/Level" required>
              <Select
                placeholder="Select form"
                value={editingSubject.form}
                onChange={(value) => setEditingSubject({ ...editingSubject, form: value })}
                size="large"
                getPopupContainer={(trigger) => trigger.parentElement}
              >
                {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'].map(f => (
                  <Option key={f} value={f}>{f}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Subject Fee (RM)" required>
              <InputNumber
                placeholder="e.g., 150.00"
                value={editingSubject.subjectFee}
                onChange={(value) => setEditingSubject({ ...editingSubject, subjectFee: value })}
                size="large"
                min={0}
                step={10}
                precision={2}
                style={{ width: '100%' }}
                // prefix={<DollarOutlined />}
              />
            </Form.Item>

            {editingSubject.isTemp && (
              <Typography.Text type="warning">
                This is a temporary subject. Changes will only apply to this session.
              </Typography.Text>
            )}
          </Form>
        )}
      </Modal>

      {/* New Teacher Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#3b1fa3' }} />
            <span>Create New Teacher</span>
          </Space>
        }
        open={isTeacherModalVisible}
        onCancel={() => {
          setIsTeacherModalVisible(false);
          setNewTeacher({ name: '', email: '', phone: '', password: '' });
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsTeacherModalVisible(false);
            setNewTeacher({ name: '', email: '', phone: '', password: '' });
          }}>
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            loading={creatingTeacher}
            onClick={handleAddNewTeacher}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Create Teacher
          </Button>
        ]}
        width={500}
      >
        <Form layout="vertical">
          <Form.Item label="Full Name" required>
            <Input
              placeholder="e.g., John Doe"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              size="large"
              prefix={<UserOutlined />}
            />
          </Form.Item>
          
          <Form.Item label="Email" required>
            <Input
              placeholder="teacher@example.com"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
              size="large"
              type="email"
            />
          </Form.Item>
          
          <Form.Item label="Phone Number">
            <Input
              placeholder="e.g., 012-3456789"
              value={newTeacher.phone}
              onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
              size="large"
            />
          </Form.Item>
          
          <Form.Item label="Password" required>
            <Input.Password
              placeholder="Minimum 6 characters"
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AddClassSchedule;
