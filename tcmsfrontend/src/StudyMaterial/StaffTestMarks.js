// src/Pages/StaffTestMarks.js
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Flex, Empty, Modal, Spin,
  Table, Space, Input, DatePicker, Form, InputNumber, Popconfirm,
  Tooltip, Tag, Pagination, Collapse
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined,
  ReloadOutlined, FileTextOutlined, PieChartOutlined, DownOutlined, UpOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import dayjs from 'dayjs';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from 'recharts';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const StaffTestMarks = () => {
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [form] = Form.useForm();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const navigate = useNavigate();
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor || '#3b1fa3';

  // Grade categories for pie chart
  const GRADE_CATEGORIES = [
    { name: 'A (80-100%)', min: 80, max: 100, color: '#52c41a' },
    { name: 'B (70-79%)', min: 70, max: 79, color: '#1890ff' },
    { name: 'C (60-69%)', min: 60, max: 69, color: '#faad14' },
    { name: 'D (50-59%)', min: 50, max: 59, color: '#fa8c16' },
    { name: 'F (Below 50%)', min: 0, max: 49, color: '#f5222d' }
  ];

  // Function to calculate grade distribution for a test
  const getGradeDistribution = (marks) => {
    const distribution = {};
    GRADE_CATEGORIES.forEach(cat => {
      distribution[cat.name] = 0;
    });
    
    marks.forEach(mark => {
      for (const category of GRADE_CATEGORIES) {
        if (mark.mark >= category.min && mark.mark <= category.max) {
          distribution[category.name]++;
          break;
        }
      }
    });
    
    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      color: GRADE_CATEGORIES.find(c => c.name === name)?.color || '#999'
    }));
  };

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
        setCurrentPage(1);
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

  // Get current page tests
  const getCurrentPageTests = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return tests.slice(startIndex, endIndex);
  };

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
    setEditingTest({
      testName: test.testName,
      testDate: test.testDate
    });
    
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

  // Custom legend renderer
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
        {payload?.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: entry.color }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{entry.value}</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>
              {entry.payload?.value || 0} students
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Table columns definition
  const getColumns = (average) => [
    {
      title: 'Student Name',
      key: 'studentName',
      render: (_, record) => record.studentName
    },
    {
      title: 'Marks',
      key: 'mark',
      render: (_, record) => {
        let color = '#52c41a';
        if (record.mark < 50) color = '#f5222d';
        else if (record.mark < 70) color = '#fa8c16';
        
        return (
          <Text strong style={{ color }}>
            {record.mark}%
          </Text>
        );
      }
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (_, record) => {
        const mark = record.mark;
        if (mark >= 80) return <Tag color="green">A (Excellent)</Tag>;
        if (mark >= 70) return <Tag color="cyan">B (Very Good)</Tag>;
        if (mark >= 60) return <Tag color="blue">C (Good)</Tag>;
        if (mark >= 50) return <Tag color="orange">D (Average)</Tag>;
        return <Tag color="red">F (Needs Improvement)</Tag>;
      }
    },
    {
      title: 'vs Average',
      key: 'vsAverage',
      render: (_, record) => {
        const diff = record.mark - parseFloat(average);
        if (diff > 0) {
          return <Tag color="green">+{diff.toFixed(1)}%</Tag>;
        } else if (diff < 0) {
          return <Tag color="red">{diff.toFixed(1)}%</Tag>;
        }
        return <Tag color="blue">0%</Tag>;
      }
    }
  ];

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
      backgroundColor: '#fff',
      overflow: 'hidden'
    },
    testHeader: {
      backgroundColor: `${classColor}10`,
      padding: '16px 20px',
      borderBottom: `2px solid ${classColor}`,
      cursor: 'pointer'
    },
    modalContent: {
      maxHeight: '60vh',
      overflowY: 'auto',
      padding: '0 8px',
      backgroundColor: '#fff'
    },
    studentRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0'
    },
    summaryRow: {
      marginTop: 16,
      padding: '12px 16px',
      backgroundColor: '#fafafa',
      borderRadius: 6,
      border: '1px dashed #d9d9d9'
    },
    paginationContainer: {
      marginTop: 24,
      display: 'flex',
      justifyContent: 'flex-end'
    },
    chartContainer: {
      marginBottom: 20,
      padding: '16px',
      backgroundColor: '#fafafa',
      borderRadius: 8,
      border: `1px solid ${classColor}20`
    },
    legendContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    legendColor: {
      width: 16,
      height: 16,
      borderRadius: 4
    },
    panelContent: {
      padding: '16px 20px'
    },
    chartWrapper: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '24px'
    },
    pieWrapper: {
      flex: '1',
      minWidth: '250px',
      height: '280px'
    },
    gradeLegendWrapper: {
      flex: '1',
      minWidth: '180px',
      padding: '12px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: `1px solid ${classColor}20`
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
        <>
          <Collapse 
            accordion={false}
            expandIconPosition="end"
            expandIcon={({ isActive }) => (isActive ? <UpOutlined /> : <DownOutlined />)}
            style={{ background: '#fff', border: 'none' }}
          >
            {getCurrentPageTests().map((test, index) => {
              const average = calculateAverage(test.marks);
              const highest = calculateHighest(test.marks);
              const lowest = calculateLowest(test.marks);
              const passCount = test.marks.filter(m => m.mark >= 50).length;
              const passRate = test.marks.length > 0 ? (passCount / test.marks.length * 100).toFixed(1) : 0;
              const distinctionCount = test.marks.filter(m => m.mark >= 80).length;
              const gradeDistribution = getGradeDistribution(test.marks);
              
              return (
                <Panel
                  key={index}
                  header={
                    <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ flex: 1, marginRight: 16 }}>
                      <div>
                        <Title level={5} style={{ margin: 0, color: classColor }}>
                          {test.testName}
                        </Title>
                        <Text type="secondary">Date: {test.testDate} | Students: {test.marks.length}</Text>
                      </div>
                      <Flex gap={16} align="center" wrap="wrap">
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTest(test);
                              }}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="Delete Test"
                            description="Are you sure you want to delete this test? All marks will be lost."
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeleteTest(test.testName, test.testDate);
                            }}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Tooltip title="Delete Test">
                              <Button 
                                size="small" 
                                danger 
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </Flex>
                      </Flex>
                    </Flex>
                  }
                  style={styles.testCard}
                >
                  <div style={styles.panelContent}>
                    {/* Pie Chart Section - Show all grade classifications */}
                    <div style={styles.chartContainer}>
                      <div style={styles.chartWrapper}>
                        {/* Pie Chart */}
                        <div style={styles.pieWrapper}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={gradeDistribution.filter(g => g.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                innerRadius={40}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {gradeDistribution.filter(g => g.value > 0).map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                formatter={(value, name, props) => [`${value} students`, name]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Grade Legend - Show ALL grade classifications */}
                        <div style={styles.gradeLegendWrapper}>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong>Grade Distribution</Text>
                          </div>
                          {/* Display all grade categories, not just those with values */}
                          {GRADE_CATEGORIES.map((grade, idx) => {
                            const gradeData = gradeDistribution.find(g => g.name === grade.name);
                            const count = gradeData?.value || 0;
                            const percentage = test.marks.length > 0 ? (count / test.marks.length * 100).toFixed(1) : 0;
                            
                            return (
                              <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: 10,
                                padding: '6px 8px',
                                backgroundColor: count > 0 ? `${grade.color}10` : '#fafafa',
                                borderRadius: 6,
                                border: `1px solid ${count > 0 ? `${grade.color}30` : '#e8e8e8'}`,
                                opacity: count > 0 ? 1 : 0.6
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: count > 0 ? grade.color : '#d9d9d9' }} />
                                  <Text style={{ fontSize: 13, color: count > 0 ? '#333' : '#999' }}>{grade.name}</Text>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Text strong style={{ fontSize: 14, color: count > 0 ? grade.color : '#999' }}>{count}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    ({percentage}%)
                                  </Text>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Student Marks Table */}
                    <Table
                      dataSource={test.marks}
                      rowKey="markId"
                      pagination={false}
                      size="small"
                      columns={getColumns(average)}
                      scroll={{ x: 600 }}
                    />
                    
                    {/* Summary Row */}
                    <div style={styles.summaryRow}>
                      <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                        <Text type="secondary">Test Summary</Text>
                        <Space size={24} wrap>
                          <Text>Total Students: <strong>{test.marks.length}</strong></Text>
                          <Text>Pass Rate (Above 50%): <strong style={{ color: '#52c41a' }}>
                            {passRate}%
                          </strong></Text>
                          <Text>Distinction (A Grade - 80% or above): <strong style={{ color: '#1890ff' }}>
                            {distinctionCount}
                          </strong></Text>
                        </Space>
                      </Flex>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </Collapse>
          
          {/* Pagination Component */}
          <div style={styles.paginationContainer}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={tests.length}
              showSizeChanger={true}
              showTotal={(total) => `Total ${total} tests`}
              pageSizeOptions={['10', '20', '50', '100']}
              onChange={(page, newPageSize) => {
                setCurrentPage(page);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              }}
              onShowSizeChange={(current, size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </>
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
        styles={{ body: { backgroundColor: '#fff' } }}
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
                  <Space.Compact>
                    <InputNumber
                      min={0}
                      max={100}
                      value={marksData[student.registrationId]}
                      onChange={(value) => handleMarkChange(student.registrationId, value)}
                      placeholder="Marks"
                      style={{ width: 100 }}
                    />
                    <Button style={{ pointerEvents: 'none', background: '#f5f5f5' }}>%</Button>
                  </Space.Compact>
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
