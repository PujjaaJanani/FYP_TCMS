// src/Pages/StudentTestMarks.js
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Flex, Empty, Spin,
  Table, Tag
} from 'antd';
import {
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title, Text } = Typography;
const { Column } = Table;

const StudentTestMarks = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  
  const navigate = useNavigate();
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor || '#3b1fa3';

  // Get current user
  const currentUser = getUser();

  // Fetch tests and find student's marks
  const fetchTests = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();

      // First get the student's registration for this class
      const studentRes = await axios.get(
        apiUrl(`/api/testmarks/class/${classId}/students`),
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (studentRes.data.success) {
        // Find the student that matches the current user's email
        // Assuming the user object contains email or student info
        const student = studentRes.data.data.find(s => 
          s.studentName?.toLowerCase().includes(currentUser?.name?.toLowerCase()) ||
          s.email === currentUser?.email
        );
        
        if (student) {
          setStudentInfo(student);
        }
      }

      // Get all tests for this class
      const testsRes = await axios.get(
        apiUrl(`/api/testmarks/class/${classId}?academicYear=${currentYear}`),
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (testsRes.data.success) {
        setTests(testsRes.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Failed to load test marks');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [classId]);

  // Get student's mark for a specific test
  const getStudentMark = (test) => {
    if (!studentInfo) return null;
    const studentMark = test.marks.find(m => m.registrationId === studentInfo.registrationId);
    return studentMark ? studentMark.mark : null;
  };

  // Calculate class average for a test
  const calculateAverage = (marks) => {
    if (!marks || marks.length === 0) return 0;
    const sum = marks.reduce((acc, m) => acc + m.mark, 0);
    return (sum / marks.length).toFixed(1);
  };

  // Get performance status
  const getPerformanceStatus = (mark, average) => {
    if (mark === null) return null;
    const diff = mark - average;
    if (diff >= 10) return { color: '#52c41a', text: 'Excellent' };
    if (diff >= 5) return { color: '#1890ff', text: 'Good' };
    if (diff >= -5) return { color: '#faad14', text: 'Average' };
    if (diff >= -10) return { color: '#fa8c16', text: 'Below Average' };
    return { color: '#f5222d', text: 'Needs Improvement' };
  };

  const styles = {
    container: {
      width: '100%'
    },
    statsCard: {
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      border: `1px solid ${classColor}40`
    },
    testCard: {
      marginBottom: 16,
      borderRadius: 8,
      border: `1px solid ${classColor}30`,
      overflow: 'hidden'
    },
    testHeader: {
      backgroundColor: `${classColor}10`,
      padding: '12px 16px',
      borderBottom: `2px solid ${classColor}`,
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    markValue: {
      fontSize: 20,
      fontWeight: 700,
      color: classColor
    },
    averageValue: {
      fontSize: 16,
      color: '#666'
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
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: classColor }}>
          My Test Marks
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchTests} 
          loading={loading}
        >
          Refresh
        </Button>
      </Flex>

      {!studentInfo && !loading && (
        <Card style={{ marginBottom: 16 }}>
          <Empty 
            description="No student record found for this class"
            image={<FileTextOutlined style={{ fontSize: 60, color: classColor }} />}
          />
        </Card>
      )}

      {loading ? (
        <Card loading />
      ) : tests.length === 0 ? (
        <Card>
          <Empty 
            description="No tests available for this class yet"
            image={<FileTextOutlined style={{ fontSize: 60, color: classColor }} />}
          />
        </Card>
      ) : (
        <>
          {/* Overall Stats */}
          {/* {studentInfo && (
            <div style={styles.statsCard}>
              <Title level={5} style={{ color: classColor, marginBottom: 16 }}>
                Performance Summary
              </Title>
              <Flex gap={24} wrap="wrap">
                {(() => {
                  const studentMarks = tests
                    .map(test => getStudentMark(test))
                    .filter(mark => mark !== null);
                  
                  if (studentMarks.length === 0) {
                    return <Text type="secondary">No marks recorded yet</Text>;
                  }

                  const average = studentMarks.reduce((a, b) => a + b, 0) / studentMarks.length;
                  const highest = Math.max(...studentMarks);
                  const lowest = Math.min(...studentMarks);
                  const totalTests = studentMarks.length;

                  return (
                    <>
                      <div>
                        <Text type="secondary">Overall Average</Text>
                        <div style={{ fontSize: 24, fontWeight: 700, color: classColor }}>
                          {average.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Highest Mark</Text>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                          {highest}%
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Lowest Mark</Text>
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#f5222d' }}>
                          {lowest}%
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Tests Taken</Text>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>
                          {totalTests}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Flex>
            </div>
          )} */}

          {/* Tests List */}
          {tests.map((test, index) => {
            const studentMark = getStudentMark(test);
            const classAverage = calculateAverage(test.marks);
            const performance = studentMark !== null ? 
              getPerformanceStatus(studentMark, parseFloat(classAverage)) : null;

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
                    <Flex gap={12} align="center">
                      {studentMark !== null ? (
                        <>
                          <div style={{ textAlign: 'right' }}>
                            <Text type="secondary">Your Mark</Text>
                            <div style={styles.markValue}>{studentMark}%</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Text type="secondary">Class Average</Text>
                            <div style={styles.averageValue}>{classAverage}%</div>
                          </div>
                          {performance && (
                            <Tag color={performance.color} style={{ marginLeft: 8 }}>
                              {performance.text}
                            </Tag>
                          )}
                        </>
                      ) : (
                        <Text type="secondary">No mark recorded</Text>
                      )}
                    </Flex>
                  </Flex>
                </div>

                {studentMark !== null && (
                  <div style={{ padding: 16 }}>
                    <Table
                      dataSource={[{
                        key: 'comparison',
                        yourMark: studentMark,
                        average: classAverage,
                        highest: Math.max(...test.marks.map(m => m.mark)),
                        lowest: Math.min(...test.marks.map(m => m.mark)),
                        totalStudents: test.marks.length
                      }]}
                      pagination={false}
                      size="small"
                    >
                      <Column
                        title="Your Mark"
                        key="yourMark"
                        render={(_, record) => (
                          <Text strong style={{ color: classColor, fontSize: 16 }}>
                            {record.yourMark}%
                          </Text>
                        )}
                      />
                      <Column
                        title="Class Average"
                        key="average"
                        render={(_, record) => (
                          <Text>{record.average}%</Text>
                        )}
                      />
                      <Column
                        title="Highest"
                        key="highest"
                        render={(_, record) => (
                          <Text style={{ color: '#52c41a' }}>{record.highest}%</Text>
                        )}
                      />
                      <Column
                        title="Lowest"
                        key="lowest"
                        render={(_, record) => (
                          <Text style={{ color: '#f5222d' }}>{record.lowest}%</Text>
                        )}
                      />
                      <Column
                        title="Students"
                        key="totalStudents"
                        render={(_, record) => (
                          <Text>{record.totalStudents}</Text>
                        )}
                      />
                    </Table>
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
};

export default StudentTestMarks;
