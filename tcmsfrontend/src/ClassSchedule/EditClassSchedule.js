// src/Pages/EditClassSchedule.js
import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, TimePicker, Button, Card, message, Typography, Flex, Spin, Row, Col,
  Modal, Space, InputNumber
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlusOutlined,
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title } = Typography;
const { Option } = Select;

const EditClassSchedule = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isEditSubjectModalVisible, setIsEditSubjectModalVisible] = useState(false);
  const [isTeacherModalVisible, setIsTeacherModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', form: '', subjectFee: 0 });
  const [editingSubject, setEditingSubject] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', password: '' });
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [updatingSubject, setUpdatingSubject] = useState(false);
  const navigate = useNavigate();
  const { classId } = useParams();

  useEffect(() => {
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const [subjectsRes, teachersRes, classesRes] = await Promise.all([
        axios.get(apiUrl('/api/subjects/with-classes'), {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get(apiUrl('/api/teachers'), {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get(apiUrl('/api/classes/schedule'), {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);

      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data);
      if (teachersRes.data.success) setTeachers(teachersRes.data.data);

      if (classesRes.data.success) {
        const classData = classesRes.data.data.find(c => c.classId === parseInt(classId));
        if (classData) {
          form.setFieldsValue({
            subjectId: classData.subjectId,
            classDay: classData.classDay,
            timeRange: [
              dayjs(classData.startTime, 'HH:mm'),
              dayjs(classData.finishTime, 'HH:mm')
            ],
            location: classData.location,
            availability: classData.availability || 30,
            authorityId: classData.authorityId
          });
        } else {
          message.error('Class not found');
          navigate('/authority/schedule');
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      message.error('Failed to load data');
    } finally {
      setFetchLoading(false);
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

    // Create subject via API
    setCreatingTeacher(true); // Reusing state for subject creation
    axios.post(
      apiUrl('/api/subjects'),
      newSubject,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    .then(res => {
      if (res.data.success) {
        message.success('Subject created successfully!');
        // Add to subjects list
        const newSubjectData = {
          subjectId: res.data.data.subjectId,
          name: newSubject.name,
          form: newSubject.form,
          subjectFee: newSubject.subjectFee
        };
        setSubjects([...subjects, newSubjectData]);
        // Auto-select the new subject
        form.setFieldsValue({ subjectId: newSubjectData.subjectId });
        setIsSubjectModalVisible(false);
        setNewSubject({ name: '', form: '', subjectFee: 0 });
      }
    })
    .catch(err => {
      message.error(err.response?.data?.message || 'Failed to create subject');
    })
    .finally(() => {
      setCreatingTeacher(false);
    });
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

    setUpdatingSubject(true);
    try {
      const res = await axios.put(
        apiUrl(`/api/subjects/${editingSubject.subjectId}`),
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

    setCreatingTeacher(true);
    try {
      const res = await axios.post(
        apiUrl('/api/teachers'),
        newTeacher,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Teacher created successfully!');
        
        // Add to teachers list
        setTeachers([...teachers, res.data.data]);
        
        // Auto-select the new teacher
        form.setFieldsValue({ authorityId: res.data.data.authorityId });
        
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
      const res = await axios.put(
        apiUrl(`/api/classes/schedule/${classId}`),
        {
          classDay: values.classDay,
          startTime: values.timeRange[0].format('HH:mm:ss'),
          finishTime: values.timeRange[1].format('HH:mm:ss'),
          location: values.location,
          availability: values.availability,
          authorityId: values.authorityId,
          subjectId: values.subjectId
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Class updated successfully!');
        navigate('/authority/schedule');
      }
    } catch (err) {
      console.error('Failed to update class:', err);
      message.error(err.response?.data?.message || 'Failed to update class');
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
                const subject = subjects.find(s => s.subjectId === selectedId);
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

  if (fetchLoading) {
    return (
      <div style={{
        padding: '24px',
        height: '100%',
        width: '100%',
        background: '#f7f5ff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

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
              Edit Class
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
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
                      {subjects.map(s => (
                        <Option key={s.subjectId} value={s.subjectId}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Space>
                              <BookOutlined />
                              <span style={{ fontWeight: 500 }}>{s.name} - {s.form}</span>
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
                            {(!s.classes || s.classes.length === 0) && (
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
                        Update Class
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
            loading={creatingTeacher}
            onClick={handleAddNewSubject}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Create Subject
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

export default EditClassSchedule;
