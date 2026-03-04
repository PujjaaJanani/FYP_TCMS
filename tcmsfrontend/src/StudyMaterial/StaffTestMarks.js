// src/Pages/StaffTestMarks.js
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Flex, Empty, Modal, Spin,
  Table, Space, Input, DatePicker, Form, InputNumber, Popconfirm,
  Tooltip, Tag
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined,
  ReloadOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Column } = Table;

const StaffTestMarks = () => {
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [form] = Form.useForm();
  
  const navigate = useNavigate();
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor || '#3b1fa3';

  // Fetch tests and students for this class
  const fetchData = async () => {
    setLoading(true);
    try {
      const [testsRes, studentsRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/testmarks/class/${classId}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get(`http://localhost:8000/api/testmarks/class/${classId}/students`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);

      if (testsRes.data.success) {
        setTests(testsRes.data.data);
      }
      if (studentsRes.data.success) {
        setStudents(studentsRes.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classId]);

  // Handle creating/editing a test
  const handleTestSubmit = async (values) => {
    try {
      const payload = {
        testName: values.testName,
        testDate: values.testDate.format('YYYY-MM-DD'),
        classId: parseInt(classId),
        marks: Object.entries(marksData).map(([registrationId, mark]) => ({
          registrationId: parseInt(registrationId),
          mark: mark || 0
        }))
      };

      let res;
      if (editingTest) {
        // For updating, use classId, original testName and original testDate
        res = await axios.put(
          `http://localhost:8000/api/testmarks/${classId}/${encodeURIComponent(editingTest.testName)}/${editingTest.testDate}`,
          payload,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } else {
        res = await axios.post(
          'http://localhost:8000/api/testmarks',
          payload,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      }

      if (res.data.success) {
        message.success(`Test ${editingTest ? 'updated' : 'created'} successfully`);
        setIsModalVisible(false);
        setEditingTest(null);
        setMarksData({});
        form.resetFields();
        fetchData();
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error(error.response?.data?.message || 'Failed to save test');
    }
  };

  // Handle deleting a test
  const handleDeleteTest = async (testName, testDate) => {
    try {
      const res = await axios.delete(
        `http://localhost:8000/api/testmarks/${classId}/${encodeURIComponent(testName)}/${testDate}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Test deleted successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete test');
    }
  };

  // Handle editing a specific test's marks
  const handleEditTest = (test) => {
    // Store the test info for editing
    setEditingTest({
      testName: test.testName,
      testDate: test.testDate
    });
    
    // Initialize marks data with existing marks
    const existingMarks = {};
    test.marks.forEach(m => {
      existingMarks[m.registrationId] = m.mark;
    });
    setMarksData(existingMarks);
    
    form.setFieldsValue({
      testName: test.testName,
      testDate: dayjs(test.testDate)
    });
    
    setIsModalVisible(true);
  };

  // Handle mark input change
  const handleMarkChange = (registrationId, value) => {
    setMarksData(prev => ({
      ...prev,
      [registrationId]: value
    }));
  };

  // Calculate average for a test
  const calculateAverage = (marks) => {
    if (!marks || marks.length === 0) return 0;
    const sum = marks.reduce((acc, m) => acc + m.mark, 0);
    return (sum / marks.length).toFixed(1);
  };

  // Calculate highest mark for a test
  const calculateHighest = (marks) => {
    if (!marks || marks.length === 0) return 0;
    return Math.max(...marks.map(m => m.mark));
  };

  // Calculate lowest mark for a test
  const calculateLowest = (marks) => {
    if (!marks || marks.length === 0) return 0;
    return Math.min(...marks.map(m => m.mark));
  };

  const styles = {
    container: {
      width: '100%'
    },
    headerSection: {
      marginBottom: 16
    },
    testCard: {
      marginBottom: 24,
      borderRadius: 12,
      border: `1px solid ${classColor}30`,
      overflow: 'hidden'
    },
    testHeader: {
      backgroundColor: `${classColor}10`,
      padding: '16px 20px',
      borderBottom: `2px solid ${classColor}`
    },
    modalContent: {
      maxHeight: '60vh',
      overflowY: 'auto',
      padding: '0 8px'
    },
    studentRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0'
    }
  };

  if (pageLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        width: '100%'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Flex justify="space-between" align="center" style={styles.headerSection}>
        <Title level={4} style={{ margin: 0, color: classColor }}>
          Tests & Marks
        </Title>
        <Flex gap={8}>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTest(null);
              setMarksData({});
              form.resetFields();
              setIsModalVisible(true);
            }}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Create New Test
          </Button>
        </Flex>
      </Flex>

      {loading ? (
        <Card loading />
      ) : tests.length === 0 ? (
        <Card>
          <Empty 
            description="No tests created for this class yet"
            image={<FileTextOutlined style={{ fontSize: 60, color: classColor }} />}
          />
        </Card>
      ) : (
        tests.map((test, index) => {
          const average = calculateAverage(test.marks);
          const highest = calculateHighest(test.marks);
          const lowest = calculateLowest(test.marks);
          const passCount = test.marks.filter(m => m.mark >= 50).length;
          const passRate = test.marks.length > 0 ? (passCount / test.marks.length * 100).toFixed(1) : 0;
          const distinctionCount = test.marks.filter(m => m.mark >= 80).length;
          
          return (
            <Card key={index} style={styles.testCard}>
              <div style={styles.testHeader}>
                <Flex justify="space-between" align="center">
                  <div>
                    <Title level={5} style={{ margin: 0, color: classColor }}>
                      {test.testName}
                    </Title>
                    <Text type="secondary">Date: {test.testDate}</Text>
                  </div>
                  <Flex gap={16} align="center">
                    <Space size={16}>
                      <div style={{ textAlign: 'center' }}>
                        <Tag color="blue" style={{ marginRight: 0 }}>Average</Tag>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}>{average}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Tag color="green" style={{ marginRight: 0 }}>Highest</Tag>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>{highest}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Tag color="orange" style={{ marginRight: 0 }}>Lowest</Tag>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#fa8c16' }}>{lowest}%</div>
                      </div>
                    </Space>
                    <Flex gap={8}>
                      <Tooltip title="Edit Test">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditTest(test)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Delete Test"
                        description="Are you sure you want to delete this test? All marks will be lost."
                        onConfirm={() => handleDeleteTest(test.testName, test.testDate)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete Test">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    </Flex>
                  </Flex>
                </Flex>
              </div>

              <Table
                dataSource={test.marks}
                rowKey="markId"
                pagination={false}
                size="small"
                style={{ marginTop: 8 }}
              >
                <Column
                  title="Student Name"
                  key="studentName"
                  render={(_, record) => record.studentName}
                />
                <Column
                  title="Marks"
                  key="mark"
                  render={(_, record) => {
                    let color = '#52c41a';
                    if (record.mark < 50) color = '#f5222d';
                    else if (record.mark < 70) color = '#fa8c16';
                    
                    return (
                      <Text strong style={{ color }}>
                        {record.mark}%
                      </Text>
                    );
                  }}
                />
                <Column
                  title="Performance"
                  key="performance"
                  render={(_, record) => {
                    const mark = record.mark;
                    if (mark >= 80) return <Tag color="green">Excellent</Tag>;
                    if (mark >= 70) return <Tag color="cyan">Very Good</Tag>;
                    if (mark >= 60) return <Tag color="blue">Good</Tag>;
                    if (mark >= 50) return <Tag color="orange">Average</Tag>;
                    return <Tag color="red">Needs Improvement</Tag>;
                  }}
                />
                <Column
                  title="vs Average"
                  key="vsAverage"
                  render={(_, record) => {
                    const diff = record.mark - parseFloat(average);
                    if (diff > 0) {
                      return <Tag color="green">+{diff.toFixed(1)}%</Tag>;
                    } else if (diff < 0) {
                      return <Tag color="red">{diff.toFixed(1)}%</Tag>;
                    }
                    return <Tag color="blue">0%</Tag>;
                  }}
                />
              </Table>
              
              {/* Summary Row */}
              <div style={{ 
                marginTop: 16, 
                padding: '12px 16px', 
                backgroundColor: '#fafafa', 
                borderRadius: 6,
                border: '1px dashed #d9d9d9'
              }}>
                <Flex justify="space-between" align="center">
                  <Text type="secondary">Test Summary</Text>
                  <Space size={24}>
                    <Text>Total Students: <strong>{test.marks.length}</strong></Text>
                    <Text>Pass Rate (Above 50%): <strong style={{ color: '#52c41a' }}>
                      {passRate}%
                    </strong></Text>
                    <Text>Distinction (80% or above): <strong style={{ color: '#1890ff' }}>
                      {distinctionCount}
                    </strong></Text>
                  </Space>
                </Flex>
              </div>
            </Card>
          );
        })
      )}

      {/* Modal for Creating/Editing Test */}
      <Modal
        title={editingTest ? "Edit Test" : "Create New Test"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTest(null);
          setMarksData({});
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleTestSubmit}
        >
          <Form.Item
            name="testName"
            label="Test Name"
            rules={[{ required: true, message: 'Please enter test name' }]}
          >
            <Input placeholder="e.g., Mid Term Exam, Quiz 1, etc." />
          </Form.Item>

          <Form.Item
            name="testDate"
            label="Test Date"
            rules={[{ required: true, message: 'Please select test date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <div style={styles.modalContent}>
            <Title level={5} style={{ marginBottom: 16 }}>
              Enter Marks for Students
            </Title>
            
            {students.length === 0 ? (
              <Empty description="No approved students in this class" />
            ) : (
              students.map(student => (
                <div key={student.registrationId} style={styles.studentRow}>
                  <Text strong>{student.studentName}</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={marksData[student.registrationId]}
                    onChange={(value) => handleMarkChange(student.registrationId, value)}
                    placeholder="Marks"
                    style={{ width: 120 }}
                    addonAfter="%"
                  />
                </div>
              ))
            )}
          </div>

          <Flex justify="end" gap={8} style={{ marginTop: 24 }}>
            <Button onClick={() => setIsModalVisible(false)}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              {editingTest ? 'Update Test' : 'Create Test'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
};

export default StaffTestMarks;