// src/Pages/ViewClassSchedule.js
import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, message, Typography, Card, Input, Flex, Select, Divider, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, ClockCircleOutlined, EnvironmentOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUserType, getRole } from '../Utils/LocalStorage';

const { Title, Text } = Typography;
const { Option } = Select;

const ViewClassSchedule = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterDay, setFilterDay] = useState('All');
  const [filterForm, setFilterForm] = useState('All');
  const navigate = useNavigate();

  const userType = getUserType();
  const role = getRole();
  const token = getToken();
  const isLoggedIn = !!token;
  const isAdminOrStaff = userType === 'authority' && (role === 'Admin' || role === 'Staff');

  const fetchClasses = async () => {
    setLoading(true);
    try {
      let res;
      
      // Use the same endpoint for both public and authenticated users since both now show enrollment
      if (isLoggedIn) {
        res = await axios.get('http://localhost:8000/api/classes/schedule', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await axios.get('http://localhost:8000/api/classes/schedule/public');
      }
      
      if (res.data.success) {
        setClasses(res.data.data);
      } else {
        message.error(res.data.message || 'Failed to load classes');
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      message.error('Failed to load classes');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => { 
    fetchClasses(); 
  }, []);

  const handleDelete = async (classId) => {
    Modal.confirm({
      title: 'Delete Class',
      content: 'Are you sure you want to delete this class?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await axios.delete(
            `http://localhost:8000/api/classes/schedule/${classId}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (res.data.success) {
            message.success('Class deleted successfully');
            fetchClasses();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to delete class');
        }
      }
    });
  };

  // Filter classes first
  const filteredClasses = classes.filter(c => {
    const matchDay = filterDay === 'All' || c.classDay === filterDay;
    const matchForm = filterForm === 'All' || c.form === filterForm;
    const q = searchText.toLowerCase();
    const matchSearch = c.subjectName.toLowerCase().includes(q) || 
                       (c.teacherName && c.teacherName.toLowerCase().includes(q));
    return matchDay && matchForm && matchSearch;
  });

  // Group classes by form and sort forms
  const groupedClasses = filteredClasses.reduce((groups, classItem) => {
    const form = classItem.form;
    if (!groups[form]) {
      groups[form] = [];
    }
    groups[form].push(classItem);
    return groups;
  }, {});

  // Sort forms (Form 1, Form 2, Form 3, etc.)
  const sortedForms = Object.keys(groupedClasses).sort((a, b) => {
    const formNumA = parseInt(a.replace('Form ', ''));
    const formNumB = parseInt(b.replace('Form ', ''));
    return formNumA - formNumB;
  });

  const dayColors = {
    Monday: 'blue', Tuesday: 'green', Wednesday: 'orange',
    Thursday: 'purple', Friday: 'cyan', Saturday: 'magenta', Sunday: 'red'
  };

  const styles = {
    page: { padding: '28px 32px', minHeight: '100vh', background: '#f7f5ff' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
    filterBar: { marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' },
    classCard: { background: '#f5f0ff', border: '1px solid #d3adf7', borderRadius: 8, padding: 12 },
    formHeader: { margin: '24px 0 16px 0' },
    formTitle: { fontSize: 18, fontWeight: 500, color: '#3b1fa3' }
  };

  const columns = [
    {
      title: 'Day',
      dataIndex: 'classDay',
      width: 120,
      render: day => <Tag color={dayColors[day]}>{day}</Tag>
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, c) => (
        <div>
          <div style={{ fontWeight: 600, color: '#3b1fa3' }}>{c.subjectName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{c.form}</Text>
        </div>
      )
    },
    {
      title: 'Time',
      key: 'time',
      width: 150,
      render: (_, c) => (
        <Flex align="center" gap={4}>
          <ClockCircleOutlined style={{ color: '#888' }} />
          <Text>{c.startTime} - {c.finishTime}</Text>
        </Flex>
      )
    },
    {
      title: 'Location',
      dataIndex: 'location',
      width: 150,
      render: loc => loc ? (
        <Flex align="center" gap={4}>
          <EnvironmentOutlined style={{ color: '#888' }} />
          <Text>{loc}</Text>
        </Flex>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: 'Availability',
      key: 'availability',
      width: 130,
      render: (_, c) => {
        const isFull = c.enrolledStudents >= c.availability;
        const isAlmostFull = c.enrolledStudents >= c.availability * 0.8;
        const availableSpaces = c.availability - c.enrolledStudents;
        
        return (
          <Flex align="center" gap={4} wrap="wrap">
            <Tag color={isFull ? 'red' : isAlmostFull ? 'orange' : 'green'}>
              {c.enrolledStudents}/{c.availability}
            </Tag>
            {!isFull && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({availableSpaces} left)
              </Text>
            )}
            {isFull && (
              <Tag color="red" style={{ fontSize: 11 }}>
                Full
              </Tag>
            )}
          </Flex>
        );
      }
    },
    {
      title: 'Teacher',
      dataIndex: 'teacherName',
      render: name => name || <Text type="secondary">Not Assigned</Text>
    },
    ...(isAdminOrStaff ? [{
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, c) => (
        <Flex gap={8}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/authority/schedule/edit/${c.classId}`)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(c.classId)}
          />
        </Flex>
      )
    }] : [])
  ];

  if (pageLoading) {
    return (
      <div style={{
        padding: '24px',
        height: '100vh',
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
    <div style={styles.page}>
      <div style={styles.header}>
        <Flex align="center" gap={16}>
          {/* Back button for public users */}
          {!isLoggedIn && (
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              style={{ background: '#fff' }}
            >
              Back
            </Button>
          )}
          <Title level={3} style={{ margin: 0, color: '#3b1fa3' }}>Class Schedule</Title>
        </Flex>
        <Flex gap={8} wrap="wrap">
          {/* <Button icon={<ReloadOutlined />} onClick={fetchClasses} loading={loading}>
            Refresh
          </Button>
          {!isLoggedIn && (
            <Button
              type="primary"
              onClick={() => navigate('/register')}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Register Now
            </Button>
          )} */}
          {isAdminOrStaff && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/authority/schedule/add')}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Add Class
            </Button>
          )}
        </Flex>
      </div>

      <div style={styles.filterBar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by subject or teacher…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          style={{ width: 250 }}
        />
        <Select value={filterDay} onChange={setFilterDay} style={{ width: 140 }}>
          <Option value="All">All Days</Option>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
            <Option key={d} value={d}>{d}</Option>
          ))}
        </Select>
        <Select value={filterForm} onChange={setFilterForm} style={{ width: 140 }}>
          <Option value="All">All Forms</Option>
          {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'].map(f => (
            <Option key={f} value={f}>{f}</Option>
          ))}
        </Select>
      </div>

      <Card>
        {sortedForms.length > 0 ? (
          sortedForms.map((form, index) => (
            <div key={form}>
              {index > 0 && <Divider style={{ margin: '24px 0 16px 0' }} />}
              <div style={styles.formHeader}>
                <Text style={styles.formTitle}>{form}</Text>
              </div>
              <Table
                dataSource={groupedClasses[form]}
                columns={columns}
                rowKey="classId"
                loading={loading}
                pagination={false}
                scroll={{ x: 800 }}
                style={{ marginBottom: index === sortedForms.length - 1 ? 0 : 24 }}
              />
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            No classes found matching your filters.
          </div>
        )}
      </Card>
    </div>
  );
};

export default ViewClassSchedule;