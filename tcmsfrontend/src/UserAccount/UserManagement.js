// src/Pages/UserManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, message, Select, Space, Flex } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';

const { Option } = Select;

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filterType, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        'http://localhost:8000/api/users',
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load users');
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
    navigate('/admin/users/add');
  };

  const handleEdit = (record) => {
    navigate(`/admin/users/edit/${record.userType}/${record.id}`);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Delete User',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{record.name}</strong>?</p>
          {record.userType === 'student' && (
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              Warning: This will also delete all registration and payment records for this student.
            </p>
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await axios.delete(
            `http://localhost:8000/api/users/${record.userType}/${record.id}`,
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
      sorter: (a, b) => a.name.localeCompare(b.name),
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
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 280,
      render: (text) => text || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Flex gap={8}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Flex>
      ),
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
      marginBottom: 24
    },
    tableCard: {
      background: '#fff',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#3b1fa3', fontSize: 28, fontWeight: 600 }}>
          User Management
        </h2>
      </div>

      <div style={styles.filterSection}>
        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ width: 250 }}
          size="large"
          placeholder="Select User Type"
        >
          <Option value="all">All Users</Option>
          <Option value="authorities">Authorities</Option>
          <Option value="students">Students</Option>
        </Select>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddUser}
          size="large"
          style={{ 
            backgroundColor: '#52c41a', 
            border: 'none'
          }}
        >
          Add New User
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
            showTotal: (total) => `Total ${total} users`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 1000 }}
        />
      </div>
    </div>
  );
};

export default UserManagement;