// src/Pages/Dashboard.js
import React, { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Table,
  Tag,
  Progress,
  Button,
  Badge,
  Typography,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
} from "@ant-design/icons";
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
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { getToken, getUserType } from "../Utils/LocalStorage";
const { Text } = Typography;

const ViewDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const notificationRef = useRef(null);
  const userType = getUserType();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    // Auto-show message on page load if payment is pending
    if (
      stats &&
      (stats.hasPendingPayment || stats.paymentStatus === "Pending")
    ) {
      setShowMessage(true);
    }
  }, [stats]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = () => {
    setShowMessage(!showMessage);
  };

  // Close message when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowMessage(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get all attendance data
  const getAttendanceData = () => {
    if (!stats) return [];

    if (
      stats.attendanceByClass?.overall &&
      Array.isArray(stats.attendanceByClass.overall) &&
      stats.attendanceByClass.overall.length > 0
    ) {
      return stats.attendanceByClass.overall;
    }
    return Array.isArray(stats.attendanceByClass?.all)
      ? stats.attendanceByClass.all
      : [];
  };

  // Get all test marks data
  const getTestMarksData = () => {
    if (!stats) return [];

    if (
      stats.testMarksByClass?.overall &&
      Array.isArray(stats.testMarksByClass.overall) &&
      stats.testMarksByClass.overall.length > 0
    ) {
      return stats.testMarksByClass.overall;
    }
    return Array.isArray(stats.testMarksByClass?.all)
      ? stats.testMarksByClass.all
      : [];
  };

  // Get students by subject data
  const getStudentsBySubjectData = () => {
    if (!stats || !Array.isArray(stats.studentsBySubject)) return [];
    return stats.studentsBySubject || [];
  };

  // Student - Get all test marks
  const getStudentTestMarks = () => {
    if (!stats || !Array.isArray(stats.testMarks)) return [];
    return stats.testMarks;
  };

  // Student - Get attendance data
  const getStudentAttendance = () => {
    if (!stats) return { present: 0, absent: 0, total: 0 };
    return stats.attendance || { present: 0, absent: 0, total: 0 };
  };

  // Prepare data for multiple line chart (group by test name across subjects)
  const prepareLineChartData = () => {
    const testMarks = getStudentTestMarks();
    if (testMarks.length === 0) return [];

    // Group by subject
    const marksBySubject = {};
    testMarks.forEach((test) => {
      const subjectKey = test.subjectId || test.subjectName;
      if (!marksBySubject[subjectKey]) {
        marksBySubject[subjectKey] = {
          subjectId: test.subjectId,
          subjectName: test.subjectName,
          data: [],
        };
      }
      marksBySubject[subjectKey].data.push({
        testName: test.testName,
        testDate: test.testDate,
        mark: test.mark,
      });
    });

    // Sort each subject's tests chronologically
    Object.values(marksBySubject).forEach((subject) => {
      subject.data.sort((a, b) => new Date(a.testDate) - new Date(b.testDate));
    });

    // Collect all unique test names, sorted by their earliest date across all subjects
    const testDateMap = {};
    Object.values(marksBySubject).forEach((subject) => {
      subject.data.forEach((test) => {
        if (
          !testDateMap[test.testName] ||
          new Date(test.testDate) < new Date(testDateMap[test.testName])
        ) {
          testDateMap[test.testName] = test.testDate;
        }
      });
    });

    const sortedTestNames = Object.keys(testDateMap).sort(
      (a, b) => new Date(testDateMap[a]) - new Date(testDateMap[b]),
    );

    const ORIGIN_LABEL = "__origin__";

    // Check if any subject is missing the very first test name
    const firstTestName = sortedTestNames[0];
    const anySubjectMissingFirst = Object.values(marksBySubject).some(
      (subject) => !subject.data.find((t) => t.testName === firstTestName),
    );

    // Build final x-axis labels: prepend a hidden origin point if needed
    const xLabels = anySubjectMissingFirst
      ? [ORIGIN_LABEL, ...sortedTestNames]
      : sortedTestNames;

    return xLabels.map((testName) => {
      const dataPoint = {
        testName: testName === ORIGIN_LABEL ? "" : testName,
        isOrigin: testName === ORIGIN_LABEL,
      };

      Object.values(marksBySubject).forEach((subject) => {
        const key = `subject_${subject.subjectId || subject.subjectName.replace(/\s/g, "_")}`;

        if (testName === ORIGIN_LABEL) {
          // All subjects start at 0 on the Y-axis origin point
          dataPoint[key] = 0;
        } else {
          const testData = subject.data.find((t) => t.testName === testName);
          dataPoint[key] = testData ? testData.mark : null;
        }
      });

      return dataPoint;
    });
  };

  // Get subjects with their marks for line chart
  const getSubjectsForLineChart = () => {
    const testMarks = getStudentTestMarks();
    if (testMarks.length === 0) return [];

    const subjectsMap = new Map();
    testMarks.forEach((test) => {
      const key = test.subjectId || test.subjectName;
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          subjectId: test.subjectId,
          subjectName: test.subjectName,
        });
      }
    });
    return Array.from(subjectsMap.values());
  };

  // Colors for multiple test mark lines
  const TEST_COLORS = [
    "#1890ff",
    "#52c41a",
    "#faad14",
    "#f5222d",
    "#722ed1",
    "#13c2c2",
    "#eb2f96",
    "#fa8c16",
    "#a0d911",
    "#2f54eb",
  ];

  // Color schemes
  const COLORS = {
    primary: ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"],
    gradient: ["#667eea", "#764ba2", "#f093fb", "#4facfe"],
    pastel: ["#a8dadc", "#457b9d", "#1d3557", "#f1faee"],
    vibrant: ["#06d6a0", "#118ab2", "#073b4c", "#ef476f", "#ffd166"],
  };

  const columns = [
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      ellipsis: true,
      responsive: ["sm"],
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
      responsive: ["md"],
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={
            status === "Approved"
              ? "green"
              : status === "Pending"
                ? "orange"
                : "red"
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
      responsive: ["sm"],
    },
  ];

  const styles = {
    page: {
      padding: window.innerWidth < 768 ? "12px" : "24px",
      background: "#f0f2f5",
      minHeight: "100vh",
      maxWidth: "100%",
      overflowX: "hidden",
    },
    header: {
      marginBottom: 24,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      color: "#262626",
      margin: 0,
    },
    welcomeText: {
      fontSize: 16,
      color: "#666",
      marginTop: 8,
    },
    notificationContainer: {
      position: "fixed",
      top: "20px",
      right: "24px",
      zIndex: 1200,
      display: "inline-block",
    },
    notificationIcon: {
      fontSize: 22,
      cursor: "pointer",
      color: "#fff",
      transition: "all 0.3s ease",
      width: "48px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      backgroundColor: "#f5222d",
      boxShadow: "0 8px 20px rgba(245, 34, 45, 0.35)",
    },
    notificationIconHover: {
      backgroundColor: "#e6e6e6",
    },
    messageBubble: {
      position: "absolute",
      top: "50%",
      right: "calc(100% + 20px)",
      transform: "translateY(-50%)",
      minWidth: "380px",
      maxWidth: "450px",
      width: "auto",
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      padding: "10px 18px",
      zIndex: 1000,
      animation: "slideInLeft 0.3s ease-out",
      border: "1px solid #f0f0f0",
      whiteSpace: "normal",
      wordWrap: "break-word",
      cursor: "pointer",
    },
    messageBubbleClosed: {
      display: "none",
    },
    messageArrow: {
      position: "absolute",
      right: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      width: 0,
      height: 0,
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
      borderLeft: "8px solid #fff",
    },
    messageTitle: {
      fontSize: 14,
      fontWeight: 600,
      color: "#f5222d",
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    messageText: {
      fontSize: 13,
      color: "#555",
      marginBottom: 3,
      lineHeight: 1.4,
    },
    messageAmount: {
      fontSize: 18,
      fontWeight: 700,
      color: "#f5222d",
      marginTop: 8,
      textAlign: "center",
    },
    statCard: {
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "none",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    },
    chartCard: {
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "none",
      marginBottom: 24,
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16,
      color: "#262626",
      borderBottom: "2px solid #3b1fa3",
      paddingBottom: 12,
    },
    attendanceCard: {
      background: "#fff",
      borderRadius: 12,
      padding: 24,
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    attendancePercent: {
      fontSize: 48,
      fontWeight: 700,
      color: "#3b1fa3",
      marginBottom: 8,
    },
    attendanceLabel: {
      fontSize: 16,
      color: "#666",
      marginBottom: 16,
    },
    attendanceStats: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: 20,
    },
    presentStat: {
      color: "#52c41a",
      fontSize: 16,
      fontWeight: 500,
    },
    absentStat: {
      color: "#f5222d",
      fontSize: 16,
      fontWeight: 500,
    },
    testMarkCard: {
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      border: "1px solid #f0f0f0",
      transition: "all 0.2s ease",
      cursor: "pointer",
      ":hover": {
        boxShadow: "0 4px 12px rgba(91, 79, 196, 0.1)",
        borderColor: "#5B4FC4",
      },
    },
    testMarkHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    subjectName: {
      fontSize: 16,
      fontWeight: 600,
      color: "#3b1fa3",
    },
    testName: {
      fontSize: 14,
      color: "#666",
    },
    markValue: {
      fontSize: 24,
      fontWeight: 700,
      color: "#52c41a",
    },
    markDate: {
      fontSize: 12,
      color: "#999",
      marginTop: 4,
    },
    noData: {
      textAlign: "center",
      padding: "40px 20px",
      color: "#999",
      background: "#fafafa",
      borderRadius: 8,
      border: "1px dashed #d9d9d9",
    },
    equalHeightCard: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
    },
    tableContainer: {
      flex: 1,
      overflow: "auto",
    },
  };

  // Add animation styles
  const animationStyles = `
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(20px) translateY(-50%);
      }
      to {
        opacity: 1;
        transform: translateX(0) translateY(-50%);
      }
    }
    @keyframes slideOutLeft {
      from {
        opacity: 1;
        transform: translateX(0) translateY(-50%);
      }
      to {
        opacity: 0;
        transform: translateX(20px) translateY(-50%);
        display: none;
      }
    }

    /* Make Ant Design Card body fill full height */
    .equal-height-card {
      height: 100%;
    }
    .equal-height-card .ant-card-body {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `;

  if (loading) {
    return (
      <div
        style={{
          ...styles.page,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.page}>
        <div style={styles.noData}>No dashboard data available</div>
      </div>
    );
  }

  const isAdmin = stats.userRole === "admin";
  const isStaff = stats.userRole === "staff";
  const isStudent = userType === "student";

  // Student data - all subjects
  const studentTestMarks = getStudentTestMarks();
  const studentAttendance = getStudentAttendance();
  const studentAttendanceRate =
    studentAttendance.total > 0
      ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
      : 0;

  // Multiple line chart data
  const lineChartData = prepareLineChartData();
  const subjectsForLineChart = getSubjectsForLineChart();

  // Staff/Admin data - all classes/subjects
  const attendanceData = getAttendanceData();
  const testMarksData = getTestMarksData();
  const studentsBySubjectData = getStudentsBySubjectData();

  // Check if there's any attendance data
  const hasAttendanceData =
    attendanceData.length > 0 &&
    attendanceData.some((item) => item.attendanceRate > 0);
  const hasTestMarksData =
    testMarksData.length > 0 && testMarksData.some((item) => item.average > 0);

  // Render Student Dashboard
  if (isStudent) {
    const isPaymentPending =
      stats.hasPendingPayment || stats.paymentStatus === "Pending";

    return (
      <div style={{ ...styles.page, background: "#f7f5ff" }}>
        <style>{animationStyles}</style>

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={{ ...styles.title, color: "#3b1fa3" }}>
              Student Dashboard
            </h1>
            <div style={styles.welcomeText}>
              Welcome back, <strong>{stats.studentName}</strong>! Here's your
              academic overview.
            </div>
          </div>

          {/* Notification Icon with Badge - Only show if payment is pending */}
          {isPaymentPending && (
            <div ref={notificationRef} style={styles.notificationContainer}>
              <Badge dot={true} offset={[-5, 5]} color="#f5222d">
                <div
                  style={styles.notificationIcon}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#cf1322")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f5222d")
                  }
                  onClick={toggleNotification}
                >
                  <BellOutlined style={{ fontSize: 22 }} />
                </div>
              </Badge>

              {/* Message Bubble - Pops to the LEFT of the icon */}
              {showMessage && (
                <div style={styles.messageBubble}>
                  <div style={styles.messageArrow} />
                  <div style={styles.messageTitle}>
                    <DollarOutlined style={{ fontSize: 14 }} />
                    <span>Monthly Fee Due!</span>
                  </div>
                  <div style={styles.messageText}>
                    Dear <strong>{stats.studentName}</strong>, your tuition fee
                    of <strong>RM{stats.monthlyFee}</strong> is pending.
                  </div>
                  <div style={styles.messageText}>
                    Please make payment as soon as possible.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Total Classes"
                value={stats.totalClasses || 0}
                prefix={<BookOutlined style={{ color: "#3b1fa3" }} />}
                valueStyle={{ color: "#3b1fa3", fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Monthly Fee"
                value={stats.monthlyFee || 0}
                prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ color: "#52c41a", fontWeight: 600 }}
                precision={2}
                suffix={
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {stats.paymentStatus === "Paid" ? (
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
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Tests Taken"
                value={stats.totalTests || 0}
                prefix={<CheckCircleOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14", fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic
                title="Attendance Rate"
                value={`${stats.overallAttendance || 0}%`}
                prefix={<CalendarOutlined style={{ color: "#eb2f96" }} />}
                valueStyle={{ color: "#eb2f96", fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* ── EQUAL HEIGHT ROW: Attendance Overview + Test Marks ── */}
        <Row gutter={[24, 24]} align="stretch" style={{ marginBottom: 24 }}>

          {/* LEFT: Attendance Overview */}
          <Col xs={24} lg={12} style={{ display: "flex" }}>
            <Card
              className="equal-height-card"
              style={{ ...styles.chartCard, flex: 1, marginBottom: 0 }}
            >
              <div style={styles.chartTitle}>
                Attendance Overview (All Subjects)
              </div>

              <div style={styles.attendanceCard}>
                <div style={styles.attendancePercent}>
                  {studentAttendanceRate}%
                </div>
                <div style={styles.attendanceLabel}>
                  Overall Attendance Rate
                </div>

                {studentAttendance.total > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Present",
                              value: studentAttendance.present,
                            },
                            { name: "Absent", value: studentAttendance.absent },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          <Cell fill="#52c41a" />
                          <Cell fill="#f5222d" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={styles.attendanceStats}>
                      <div>
                        <CheckCircleOutlined
                          style={{ color: "#52c41a", marginRight: 8 }}
                        />
                        <span style={styles.presentStat}>
                          Present: {studentAttendance.present}
                        </span>
                      </div>
                      <div>
                        <CloseCircleOutlined
                          style={{ color: "#f5222d", marginRight: 8 }}
                        />
                        <span style={styles.absentStat}>
                          Absent: {studentAttendance.absent}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, color: "#666" }}>
                      Total Sessions: {studentAttendance.total}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "40px 20px", color: "#999" }}>
                    No attendance records recorded yet
                  </div>
                )}
              </div>
            </Card>
          </Col>

          {/* RIGHT: Test Marks Performance */}
          <Col xs={24} lg={12} style={{ display: "flex" }}>
            <Card
              className="equal-height-card"
              style={{ ...styles.chartCard, flex: 1, marginBottom: 0 }}
            >
              <div style={styles.chartTitle}>
                📈 Test Marks Performance (All Subjects)
              </div>

              {subjectsForLineChart.length > 0 && lineChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={450}>
  <LineChart
    data={lineChartData}
    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
  >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="testName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tickFormatter={(val) => (val === "" ? "" : val)}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          if (props.payload?.isOrigin) return null;
                          return [`${value}%`, "Marks"];
                        }}
                        labelFormatter={(label) =>
                          label === "" ? null : `Test: ${label}`
                        }
                      />
                      <Legend verticalAlign="top" height={36} />

                      {subjectsForLineChart.map((subject, idx) => (
                        <Line
                          key={subject.subjectId || idx}
                          type="monotone"
                          dataKey={`subject_${subject.subjectId || subject.subjectName.replace(/\s/g, "_")}`}
                          name={subject.subjectName}
                          stroke={TEST_COLORS[idx % TEST_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 6, strokeWidth: 2 }}
                          activeDot={{ r: 8 }}
                          connectNulls={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <Text type="secondary">
                      📈 Line chart shows performance trends for each subject
                      over time
                    </Text>
                  </div>
                </>
              ) : (
                <div style={styles.noData}>No test marks available</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Attendance by Subject — centered bars */}
        {stats.attendanceBySubject &&
          stats.attendanceBySubject.length > 0 &&
          stats.attendanceBySubject.some((subj) => subj.total > 0) && (
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <Card style={styles.chartCard}>
                  <div style={styles.chartTitle}>Attendance by Subject</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={stats.attendanceBySubject}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="subjectName"
                        padding={{ left: 40, right: 40 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="present"
                        name="Present"
                        fill="#52c41a"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="absent"
                        name="Absent"
                        fill="#f5222d"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          )}

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
                          <span style={styles.subjectName}>
                            {cls.subjectName}
                          </span>
                          <Tag color="purple">{cls.form}</Tag>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div>
                            <CalendarOutlined /> {cls.classDay}
                          </div>
                          <div>
                            <BookOutlined /> {cls.startTime} - {cls.finishTime}
                          </div>
                          {cls.location && (
                            <div>
                              <UserOutlined /> {cls.location}
                            </div>
                          )}
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
      <div style={styles.header}>
        <h1 style={styles.title}>
          {isAdmin ? "Admin Dashboard" : "Staff Dashboard"}
        </h1>
      </div>

      {/* Staff Statistics Cards - 3 cards in a single row on desktop */}
      {isStaff && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={24} md={8} lg={8}>
            <Card style={styles.statCard}>
              <Statistic
                title="My Students"
                value={stats.overview?.totalStudents || 0}
                prefix={<UserOutlined style={{ color: "#1890ff" }} />}
                valueStyle={{ color: "#1890ff", fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={24} md={8} lg={8}>
            <Card style={styles.statCard}>
              <Statistic
                title="My Classes"
                value={stats.overview?.totalClasses || 0}
                prefix={<BookOutlined style={{ color: "#faad14" }} />}
                valueStyle={{ color: "#faad14", fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={24} md={8} lg={8}>
            <Card style={styles.statCard}>
              <Statistic
                title="Overall Attendance"
                value={stats.overallAttendanceRate || 0}
                precision={1}
                suffix="%"
                prefix={<CalendarOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{ color: "#722ed1", fontWeight: 600 }}
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
        </Row>
      )}

      {/* Admin Statistics Cards - 6 cards in 2 rows of 3 */}
      {isAdmin && (
        <>
          {/* Row 1 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Total Students"
                  value={stats.overview?.totalStudents || 0}
                  prefix={<UserOutlined style={{ color: "#1890ff" }} />}
                  valueStyle={{ color: "#1890ff", fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Total Staff"
                  value={stats.overview?.totalStaff || 0}
                  prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a", fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Total Classes"
                  value={stats.overview?.totalClasses || 0}
                  prefix={<BookOutlined style={{ color: "#faad14" }} />}
                  valueStyle={{ color: "#faad14", fontWeight: 600 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Row 2 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Pending Applications"
                  value={stats.overview?.pendingApplications || 0}
                  prefix={<FileTextOutlined style={{ color: "#f5222d" }} />}
                  valueStyle={{ color: "#f5222d", fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Total Revenue"
                  value={stats.overview?.totalRevenue || 0}
                  prefix={<DollarOutlined style={{ color: "#722ed1" }} />}
                  valueStyle={{ color: "#722ed1", fontWeight: 600 }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Monthly Revenue"
                  value={stats.overview?.monthlyRevenue || 0}
                  prefix={<CalendarOutlined style={{ color: "#eb2f96" }} />}
                  valueStyle={{ color: "#eb2f96", fontWeight: 600 }}
                  precision={2}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]}>
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
                <Bar
                  dataKey="count"
                  name="Students"
                  fill="#667eea"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>Payment Status (Current Month)</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Paid", value: stats.paymentStatus?.paid || 0 },
                    {
                      name: "Pending",
                      value: stats.paymentStatus?.pending || 0,
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
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
{/* Charts Row 2 - Attendance by Class */}
<Row gutter={[16, 16]}>
  <Col xs={24} lg={12}>
    <Card style={styles.chartCard}>
      <div style={styles.chartTitle}>
        {isStaff
          ? "Attendance Rate (All My Classes)"
          : "Attendance Rate by Subject (All Classes)"}
      </div>
      {hasAttendanceData ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart 
            data={attendanceData}
            margin={{ top: 20, right: 30, left: 50, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="subject" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 13, fontWeight: 500 }}
              tickFormatter={(value) => {
                // Simple truncation
                if (value.length > 20) {
                  return value.substring(0, 17) + '...';
                }
                return value;
              }}
            />
            <YAxis 
              domain={[0, 100]} 
              tickMargin={12}
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Attendance Rate (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' },
                offset: -10
              }}
            />
            <Tooltip 
              formatter={(value) => `${value}%`}
              labelFormatter={(label) => `Class: ${label}`}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
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
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
          No attendance records recorded yet for any class
        </div>
      )}
    </Card>
  </Col>

  <Col xs={24} lg={12}>
    <Card style={styles.chartCard}>
      <div style={styles.chartTitle}>
        {isStaff
          ? "Average Test Marks (All My Classes)"
          : "Average Test Marks by Subject (All Classes)"}
      </div>
      {hasTestMarksData ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart 
            data={testMarksData}
            margin={{ top: 20, right: 30, left: 50, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="subject" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 13, fontWeight: 500 }}
              tickFormatter={(value) => {
                // Simple truncation
                if (value.length > 20) {
                  return value.substring(0, 17) + '...';
                }
                return value;
              }}
            />
            <YAxis 
              domain={[0, 100]} 
              tickMargin={12}
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Average Mark (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' },
                offset: -10
              }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Average"]}
              labelFormatter={(label) => `Class: ${label}`}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="average"
              name="Average Mark (%)"
              stroke="#06d6a0"
              strokeWidth={3}
              dot={{ r: 6, fill: "#06d6a0" }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
          No test marks recorded yet for any class
        </div>
      )}
    </Card>
  </Col>
</Row>

      {/* Charts Row 3 - Admin Only */}
      <Row gutter={[16, 16]}>
        {isAdmin && studentsBySubjectData.length > 0 && (
          <Col xs={24} lg={12}>
            <Card style={{ ...styles.chartCard, height: "100%" }}>
              <div style={styles.chartTitle}>
                Students per Subject (All Subjects)
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentsBySubjectData}>
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
                    {studentsBySubjectData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS.gradient[index % COLORS.gradient.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}

        <Col xs={24} lg={isAdmin && studentsBySubjectData.length > 0 ? 12 : 24}>
          <Card
            style={{
              ...styles.chartCard,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={styles.chartTitle}>Recent Registrations</div>
            <div style={{ flex: 1 }}>
              <Table
                columns={columns}
                dataSource={stats.recentRegistrations || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600, y: 240 }}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ViewDashboard;