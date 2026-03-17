// src/Pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Table, Tag, Select, Progress } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { getToken, getUserType } from '../Utils/LocalStorage';

const { Option } = Select;

const ViewDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudentSubject, setSelectedStudentSubject] = useState('all');
  const userType = getUserType();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        'http://localhost:8000/api/dashboard/stats',
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        setStats(res.data.data);
        // Don't auto-select first subject - keep 'all' selected by default
        // User can manually select a specific subject if they want
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Staff/Admin filter functions
  const getFilteredAttendanceData = () => {
    if (!stats) return [];
    
    if (selectedClass === 'all') {
      if (stats.attendanceByClass?.overall && Array.isArray(stats.attendanceByClass.overall) && stats.attendanceByClass.overall.length > 0) {
        return stats.attendanceByClass.overall;
      }
      return Array.isArray(stats.attendanceByClass?.all) ? stats.attendanceByClass.all : [];
    }
    
    return Array.isArray(stats.attendanceByClass?.all) 
      ? stats.attendanceByClass.all.filter(
          item => item.classId === parseInt(selectedClass)
        ) 
      : [];
  };

  const getFilteredTestMarksData = () => {
    if (!stats) return [];
    
    if (selectedClass === 'all') {
      if (stats.testMarksByClass?.overall && Array.isArray(stats.testMarksByClass.overall) && stats.testMarksByClass.overall.length > 0) {
        return stats.testMarksByClass.overall;
      }
      return Array.isArray(stats.testMarksByClass?.all) ? stats.testMarksByClass.all : [];
    }
    
    return Array.isArray(stats.testMarksByClass?.all)
      ? stats.testMarksByClass.all.filter(
          item => item.classId === parseInt(selectedClass)
        )
      : [];
  };

  const getFilteredStudentsBySubjectData = () => {
    if (!stats || !Array.isArray(stats.studentsBySubject)) return [];
    
    // Students by subject is not affected by class filter (Admin only chart)
    return stats.studentsBySubject || [];
  };

  // Student filter functions
  const getFilteredStudentTestMarks = () => {
    if (!stats || !Array.isArray(stats.testMarks)) return [];
    
    if (selectedStudentSubject === 'all') {
      return stats.testMarks;
    }
    
    return stats.testMarks.filter(
      item => item.subjectId === parseInt(selectedStudentSubject)
    ) || [];
  };

  const getFilteredStudentAttendance = () => {
    if (!stats) return { present: 0, absent: 0, total: 0 };
    
    if (selectedStudentSubject === 'all') {
      return stats.attendance || { present: 0, absent: 0, total: 0 };
    }
    
    // Check if attendanceBySubject exists and is an array
    if (stats.attendanceBySubject && Array.isArray(stats.attendanceBySubject)) {
      const found = stats.attendanceBySubject.find(
        item => item.subjectId === parseInt(selectedStudentSubject)
      );
      return found || { present: 0, absent: 0, total: 0 };
    }
    
    return { present: 0, absent: 0, total: 0 };
  };

  // Color schemes
  const COLORS = {
    primary: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'],
    gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    pastel: ['#a8dadc', '#457b9d', '#1d3557', '#f1faee'],
    vibrant: ['#06d6a0', '#118ab2', '#073b4c', '#ef476f', '#ffd166']
  };

  const PIE_COLORS = ['#52c41a', '#f5222d'];

  const columns = [
    {
      title: 'Student Name',
      dataIndex: 'studentName',
      key: 'studentName',
      ellipsis: true,
      responsive: ['sm']
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      responsive: ['md']
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'Approved' ? 'green' : 
          status === 'Pending' ? 'orange' : 'red'
        }>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => new Date(date).toLocaleDateString(),
      responsive: ['sm']
    },
  ];

  const styles = {
    page: {
      padding: window.innerWidth < 768 ? '12px' : '24px',
      background: '#f0f2f5',
      minHeight: '100vh',
      maxWidth: '100%',
      overflowX: 'hidden'
    },
    header: {
      marginBottom: 24
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      color: '#262626',
      margin: 0
    },
    welcomeText: {
      fontSize: 16,
      color: '#666',
      marginTop: 8
    },
    statCard: {
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: 'none',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      '& .ant-statistic': {
        flex: 1
      }
    },
    progressContainer: {
      marginTop: 8,
      width: '100%'
    },
    chartCard: {
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: 'none',
      marginBottom: 24,
      overflow: 'hidden'
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16,
      color: '#262626',
      borderBottom: '2px solid #3b1fa3',
      paddingBottom: 12
    },
    dropdownContainer: {
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'flex-start'
    },
    dropdown: {
      width: 250
    },
    attendanceCard: {
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    },
    attendancePercent: {
      fontSize: 48,
      fontWeight: 700,
      color: '#3b1fa3',
      marginBottom: 8
    },
    attendanceLabel: {
      fontSize: 16,
      color: '#666',
      marginBottom: 16
    },
    attendanceStats: {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: 20
    },
    presentStat: {
      color: '#52c41a',
      fontSize: 16,
      fontWeight: 500
    },
    absentStat: {
      color: '#f5222d',
      fontSize: 16,
      fontWeight: 500
    },
    testMarkCard: {
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      border: '1px solid #f0f0f0',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      ':hover': {
        boxShadow: '0 4px 12px rgba(91, 79, 196, 0.1)',
        borderColor: '#5B4FC4'
      }
    },
    testMarkHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    subjectName: {
      fontSize: 16,
      fontWeight: 600,
      color: '#3b1fa3'
    },
    testName: {
      fontSize: 14,
      color: '#666'
    },
    markValue: {
      fontSize: 24,
      fontWeight: 700,
      color: '#52c41a'
    },
    markDate: {
      fontSize: 12,
      color: '#999',
      marginTop: 4
    },
    noData: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999',
      background: '#fafafa',
      borderRadius: 8,
      border: '1px dashed #d9d9d9'
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.page}>
        <div style={styles.noData}>
          No dashboard data available
        </div>
      </div>
    );
  }

  const isAdmin = stats.userRole === 'admin';
  const isStaff = stats.userRole === 'staff';
  const isStudent = userType === 'student';

  // Student subject filter flag
  const showStudentSubjectFilter = isStudent && stats.subjects && stats.subjects.length > 1;

  // Student data
  const filteredStudentTestMarks = getFilteredStudentTestMarks();
  const filteredStudentAttendance = getFilteredStudentAttendance();
  const studentAttendanceRate = filteredStudentAttendance.total > 0 
    ? Math.round((filteredStudentAttendance.present / filteredStudentAttendance.total) * 100) 
    : 0;

  // Staff/Admin data
  const filteredAttendanceData = getFilteredAttendanceData();
  const filteredTestMarksData = getFilteredTestMarksData();
  const filteredStudentsData = getFilteredStudentsBySubjectData();

  // Render Student Dashboard
  if (isStudent) {
    return (
      <div style={{ ...styles.page, background: '#f7f5ff' }}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ ...styles.title, color: '#3b1fa3' }}>Student Dashboard</h1>
          <div style={styles.welcomeText}>
            Welcome back, <strong>{stats.studentName}</strong>! Here's your academic overview.
          </div>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Total Classes"
                value={stats.totalClasses || 0}
                prefix={<BookOutlined style={{ color: '#3b1fa3' }} />}
                valueStyle={{ color: '#3b1fa3', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Monthly Fee"
                value={stats.monthlyFee || 0}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontWeight: 600 }}
                precision={2}
                suffix={
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {stats.paymentStatus === 'Paid' ? (
                      <Tag color="success" style={{ marginLeft: 8 }}>
                        <CheckCircleOutlined /> Paid
                      </Tag>
                    ) : (
                      <Tag color="warning" style={{ marginLeft: 8 }}>
                        <CloseCircleOutlined /> Pending
                      </Tag>
                    )}
                  </div>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Tests Taken"
                value={stats.totalTests || 0}
                prefix={<CheckCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Attendance Rate"
                value={`${stats.overallAttendance || 0}%`}
                prefix={<CalendarOutlined style={{ color: '#eb2f96' }} />}
                valueStyle={{ color: '#eb2f96', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Subject Filter Dropdown */}
        {showStudentSubjectFilter && (
          <div style={styles.dropdownContainer}>
            <Select
              style={styles.dropdown}
              value={selectedStudentSubject}
              onChange={setSelectedStudentSubject}
              placeholder="Select Subject"
              size="large"
            >
              <Option value="all">All Subjects</Option>
              {stats.subjects && stats.subjects.map(subject => (
                <Option key={subject.subjectId} value={subject.subjectId.toString()}>
                  {subject.subjectName}
                </Option>
              ))}
            </Select>
          </div>
        )}

        <Row gutter={[24, 24]}>
          {/* Attendance Statistics Column */}
          <Col xs={24} lg={12}>
            <Card style={styles.chartCard}>
              <div style={styles.chartTitle}>Attendance Overview</div>
              
              <div style={styles.attendanceCard}>
                <div style={styles.attendancePercent}>{studentAttendanceRate}%</div>
                <div style={styles.attendanceLabel}>Overall Attendance Rate</div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: filteredStudentAttendance.present },
                        { name: 'Absent', value: filteredStudentAttendance.absent }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {filteredStudentAttendance.present > 0 && (
                        <Cell fill="#52c41a" />
                      )}
                      {filteredStudentAttendance.absent > 0 && (
                        <Cell fill="#f5222d" />
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div style={styles.attendanceStats}>
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <span style={styles.presentStat}>
                      Present: {filteredStudentAttendance.present}
                    </span>
                  </div>
                  <div>
                    <CloseCircleOutlined style={{ color: '#f5222d', marginRight: 8 }} />
                    <span style={styles.absentStat}>
                      Absent: {filteredStudentAttendance.absent}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 16, color: '#666' }}>
                  Total Sessions: {filteredStudentAttendance.total}
                </div>
              </div>
            </Card>
          </Col>

          {/* Test Marks Column */}
          <Col xs={24} lg={12}>
            <Card style={styles.chartCard}>
              <div style={styles.chartTitle}>Test Marks Performance</div>
              
              {filteredStudentTestMarks.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={filteredStudentTestMarks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="testName" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              background: '#fff',
                              padding: '12px',
                              border: '1px solid #d9d9d9',
                              borderRadius: 8,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                {data.subjectName}
                              </div>
                              <div style={{ marginBottom: 4 }}>{data.testName}</div>
                              <div style={{ color: '#52c41a', fontWeight: 600 }}>
                                Mark: {data.mark}/100
                              </div>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                {new Date(data.testDate).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="mark" 
                      name="Marks" 
                      fill="#52c41a"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.noData}>
                  No test marks available for the selected subject
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Upcoming Classes Section */}
        {stats.upcomingClasses && stats.upcomingClasses.length > 0 && (
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <Card style={styles.chartCard}>
                <div style={styles.chartTitle}>Upcoming Classes</div>
                <Row gutter={[16, 16]}>
                  {stats.upcomingClasses.map((cls, index) => (
                    <Col xs={24} md={8} key={index}>
                      <Card style={styles.testMarkCard}>
                        <div style={styles.testMarkHeader}>
                          <span style={styles.subjectName}>{cls.subjectName}</span>
                          <Tag color="purple">{cls.form}</Tag>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div><CalendarOutlined /> {cls.classDay}</div>
                          <div><BookOutlined /> {cls.startTime} - {cls.finishTime}</div>
                          {cls.location && <div><UserOutlined /> {cls.location}</div>}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    );
  }

  // Render Staff/Admin Dashboard
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}
        </h1>
      </div>

            {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card style={styles.statCard}>
            <Statistic
              title={isStaff ? "My Students" : "Total Students"}
              value={stats.overview?.totalStudents || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 600 }}
            />
          </Card>
        </Col>
        {isAdmin && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Total Staff"
                value={stats.overview?.totalStaff || 0}
                prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontWeight: 600 }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card style={styles.statCard}>
            <Statistic
              title={isStaff ? "My Classes" : "Total Classes"}
              value={stats.overview?.totalClasses || 0}
              prefix={<BookOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 600 }}
            />
          </Card>
        </Col>
        {isAdmin && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Pending Applications"
                value={stats.overview?.pendingApplications || 0}
                prefix={<FileTextOutlined style={{ color: '#f5222d' }} />}
                valueStyle={{ color: '#f5222d', fontWeight: 600 }}
              />
            </Card>
          </Col>
        )}
        
        {/* For Staff: Show Overall Attendance Rate - Responsive */}
        {isStaff && (
          <Col xs={24} sm={12} md={8} lg={8}>
            <Card style={styles.statCard}>
              <Statistic
                title="Overall Attendance"
                value={stats.overallAttendanceRate || 0}
                precision={1}
                suffix="%"
                prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', fontWeight: 600 }}
              />
              <Progress 
                percent={stats.overallAttendanceRate || 0} 
                size="small" 
                strokeColor="#722ed1"
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
        )}

        {/* For Admin: Show Revenue Cards */}
        {isAdmin && (
          <>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Total Revenue"
                  value={stats.overview?.totalRevenue || 0}
                  prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 600 }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Monthly Revenue"
                  value={stats.overview?.monthlyRevenue || 0}
                  prefix={<CalendarOutlined style={{ color: '#eb2f96' }} />}
                  valueStyle={{ color: '#eb2f96', fontWeight: 600 }}
                  precision={2}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Class Filter Dropdown */}
      {stats.classes && stats.classes.length > 0 && (
        <div style={{ ...styles.dropdownContainer, marginBottom: 24, justifyContent: 'flex-start' }}>
          <Select
            style={{ ...styles.dropdown, width: 350 }}
            value={selectedClass}
            onChange={setSelectedClass}
            placeholder="Filter by Class"
            size="large"
          >
            <Option value="all">All Classes</Option>
            {stats.classes.map(cls => (
              <Option key={cls.classId} value={cls.classId.toString()}>
                {cls.name}
              </Option>
            ))}
          </Select>
        </div>
      )}

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]}>
        {/* Active Students by Month */}
        <Col xs={24} lg={12}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>Active Students (Last 6 Months)</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.activeStudentsByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Students" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Payment Status Pie Chart */}
        <Col xs={24} lg={12}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>Payment Status (Current Month)</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: stats.paymentStatus?.paid || 0 },
                    { name: 'Pending', value: stats.paymentStatus?.pending || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#52c41a" />
                  <Cell fill="#faad14" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 - Attendance by Class */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>
              {isStaff ? "Attendance Rate (My Classes)" : "Attendance Rate by Class"}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="attendanceRate" 
                  name="Attendance (%)" 
                  stroke="#1890ff" 
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {filteredAttendanceData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No attendance data available for the selected class
              </div>
            )}
          </Card>
        </Col>

        {/* Test Marks by Class */}
        <Col xs={24} lg={12}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>
              {isStaff ? "Average Test Marks (My Classes)" : "Average Test Marks by Subject"}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredTestMarksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Average']}
                  labelFormatter={(label) => `Subject: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  name="Average Mark (%)" 
                  stroke="#06d6a0" 
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#06d6a0' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            {filteredTestMarksData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                No test marks data available for the selected class
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Charts Row 3 - Admin Only */}
      <Row gutter={[16, 16]}>
        {/* Students by Subject - Admin Only (no filter) */}
        {isAdmin && stats.studentsBySubject && stats.studentsBySubject.length > 0 && (
          <Col xs={24} lg={12}>
            <Card style={styles.chartCard}>
              <div style={styles.chartTitle}>Students per Subject</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredStudentsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="studentCount" 
                    name="Students" 
                    fill="#764ba2"
                    radius={[8, 8, 0, 0]}
                  >
                    {filteredStudentsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.gradient[index % COLORS.gradient.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {filteredStudentsData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No data available for the selected subject
                </div>
              )}
            </Card>
          </Col>
        )}

        {/* Recent Registrations Table */}
        <Col xs={24} lg={isAdmin && stats.studentsBySubject && stats.studentsBySubject.length > 0 ? 12 : 24}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>Recent Registrations</div>
            <Table
              columns={columns}
              dataSource={stats.recentRegistrations || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ViewDashboard;