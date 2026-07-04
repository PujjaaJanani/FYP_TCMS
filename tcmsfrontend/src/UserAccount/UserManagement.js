// src/Pages/UserManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, message, Select, Space, Flex, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/axios';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Option } = Select;

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear !== null) {
      fetchUsers();
    }
  }, [selectedYear]);

  useEffect(() => {
    filterUsers();
  }, [filterType, users]);

  const fetchAvailableYears = async () => {
    try {
      const res = await api.get(
        '/api/users/available-years',
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      console.log('Available years response:', res.data);
      
      if (res.data.success) {
        setAvailableYears(res.data.data);
        setCurrentYear(res.data.current_year);
        // Set selected year to the first available year or current year
        if (res.data.data.length > 0) {
          setSelectedYear(res.data.data[0]);
        } else {
          setSelectedYear(res.data.current_year);
        }
      } else {
        // Fallback
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
      // Fallback to current year only
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    }
  };

  const fetchUsers = async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    try {
      console.log(`Fetching users for year: ${selectedYear}`);
      const res = await api.get(
        `/api/users?year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      console.log('Users response:', res.data);

      if (res.data.success) {
        setUsers(res.data.data);
        console.log(`Found ${res.data.data.length} users for year ${selectedYear}`);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (filterType === 'all') {
      setFilteredUsers(users);
    } else if (filterType === 'authorities') {
      setFilteredUsers(users.filter(u => u.userType === 'authority'));
    } else if (filterType === 'students') {
      setFilteredUsers(users.filter(u => u.userType === 'student'));
    }
  };

  const handleAddUser = () => {
    // Only allow adding users for current year
    if (selectedYear !== currentYear) {
      message.warning('You can only add users for the current year');
      return;
    }
    navigate('/admin/users/add');
  };

  const handleEdit = (record) => {
    // Only allow editing current year students
    if (record.userType === 'student' && selectedYear !== currentYear) {
      message.warning('You cannot edit past year records');
      return;
    }
    navigate(`/admin/users/edit/${record.userType}/${record.id}`);
  };

  const handleDelete = (record) => {
    // Only allow deleting current year students
    if (record.userType === 'student' && selectedYear !== currentYear) {
      message.warning('You cannot delete past year records');
      return;
    }

    Modal.confirm({
      title: 'Delete User',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{record.name}</strong>?</p>
          {record.userType === 'student' && (
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              Warning: This will delete all records for this student for {selectedYear}.
            </p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await api.delete(
            `/api/users/${record.userType}/${record.id}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );

          if (res.data.success) {
            message.success('User deleted successfully');
            fetchUsers();
          }
        } catch (error) {
          console.error('Delete error:', error);
          message.error(error.response?.data?.message || 'Failed to delete user');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name?.localeCompare(b.name) || 0,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
    },
    {
      title: 'Contact Number',
      dataIndex: 'contactNumber',
      key: 'contactNumber',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 280,
      render: (text) => text || '-',
    },
    {
      title: 'Year',
      dataIndex: 'enrollmentYear',
      key: 'enrollmentYear',
      width: 100,
      render: (year) => (
        <Tag color="blue">
          {year || selectedYear}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        const isReadOnly = record.userType === 'student' && selectedYear !== currentYear;
        
        return (
          <Flex gap={8}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={isReadOnly}
              title={isReadOnly ? 'Cannot edit past year records' : 'Edit'}
            />
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              disabled={isReadOnly}
              title={isReadOnly ? 'Cannot delete past year records' : 'Delete'}
            />
          </Flex>
        );
      },
    },
  ];

  const styles = {
    page: {
      padding: '24px',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24
    },
    filterSection: {
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      marginBottom: 24,
      flexWrap: 'wrap'
    },
    tableCard: {
      background: '#fff',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }
  };

  if (selectedYear === null) {
    return (
      <div style={styles.page}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#3b1fa3', fontSize: 28, fontWeight: 600 }}>
          User Management
        </h2>
      </div>

      <div style={styles.filterSection}>
        <Select
          value={selectedYear}
          onChange={setSelectedYear}
          style={{ width: 150 }}
          size="large"
          placeholder="Select Year"
        >
          {availableYears.map(year => (
            <Option key={year} value={year}>
              {year} {year === currentYear}
            </Option>
          ))}
        </Select>

        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ width: 180 }}
          size="large"
          placeholder="Select User Type"
        >
          <Option value="all">All Users</Option>
          <Option value="authorities">Authorities Only</Option>
          <Option value="students">Students Only</Option>
        </Select>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddUser}
          size="large"
          style={{ 
            backgroundColor: selectedYear === currentYear ? '#52c41a' : '#d9d9d9',
            border: 'none'
          }}
          disabled={selectedYear !== currentYear}
        >
          Add New User {selectedYear !== currentYear}
        </Button>
      </div>

      <div style={styles.tableCard}>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          rowKey={(record) => `${record.userType}-${record.id}`}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} users for ${selectedYear}`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: loading ? 'Loading...' : `No users found for ${selectedYear}` }}
        />
      </div>
    </div>
  );
};

export default UserManagement;
