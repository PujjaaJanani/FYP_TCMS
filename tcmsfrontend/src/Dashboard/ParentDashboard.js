// src/Pages/ParentDashboard.js
import React, { useState, useEffect, useRef } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Select,
  Empty,
  Tag,
  Typography,
  Flex,
  Radio,
  Button,
  message,
  Badge,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  BellOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axios from "axios";
import { getToken } from "../Utils/LocalStorage";

const { Title, Text } = Typography;
const { Option } = Select;

const ParentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [stats, setStats] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const notificationRef = useRef(null);

  // Fetch children on component mount
  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch dashboard stats when child or year changes
  useEffect(() => {
    if (selectedChild && selectedYear) {
      fetchDashboardStats();
    }
  }, [selectedChild, selectedYear]);

  // Fetch available years for selected child
  useEffect(() => {
    if (selectedChild) {
      fetchAvailableYears();
    }
  }, [selectedChild]);

  // Auto-show message on page load if any child has payment pending
  useEffect(() => {
    const hasPending = children.some((child) => child.paymentStatus === "Pending");
    if (hasPending) {
      setShowMessage(true);
    }
  }, [children]);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:8000/api/parent/dashboard/children",
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (res.data.success && res.data.data.length > 0) {
        setChildren(res.data.data);
        setSelectedChild(res.data.data[0]);
      } else {
        setChildren([]);
        message.info("No children linked to your account");
      }
    } catch (error) {
      console.error("Error fetching children:", error);
      message.error("Failed to load children data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/parent/dashboard/available-years/${selectedChild.studentId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (res.data.success) {
        setAvailableYears(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedYear(res.data.data[0]);
        } else {
          setSelectedYear(new Date().getFullYear());
        }
      }
    } catch (error) {
      console.error("Error fetching years:", error);
      setAvailableYears([new Date().getFullYear()]);
      setSelectedYear(new Date().getFullYear());
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/parent/dashboard/stats?studentId=${selectedChild.studentId}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      message.error("Failed to load dashboard data");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (child) => {
    setSelectedChild(child);
    setStats(null);
    setShowMessage(false);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setStats(null);
    setShowMessage(false);
  };

  const refreshData = () => {
    if (selectedChild && selectedYear) {
      fetchDashboardStats();
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

  // Prepare combined data for all subjects
  const prepareChartData = () => {
    if (!stats?.testMarksBySubject || stats.testMarksBySubject.length === 0) {
      return [];
    }

    // Find all unique test names across all subjects
    const allTestNames = new Set();
    stats.testMarksBySubject.forEach((subject) => {
      subject.data.forEach((test) => {
        allTestNames.add(test.testName);
      });
    });

    const sortedTestNames = Array.from(allTestNames);

    // Create data array for line chart
    return sortedTestNames.map((testName) => {
      const dataPoint = { testName };
      stats.testMarksBySubject.forEach((subject) => {
        const testData = subject.data.find((t) => t.testName === testName);
        dataPoint[`subject_${subject.subjectId}`] = testData?.mark || null;
      });
      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  // Animation styles
  const animationStyles = `
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(20px) translateY(0);
      }
      to {
        opacity: 1;
        transform: translateX(0) translateY(0);
      }
    }
  `;

  const styles = {
    page: {
      padding: window.innerWidth < 768 ? "12px" : "24px",
      background: "#f7f5ff",
      minHeight: "100vh",
    },
    header: {
      marginBottom: 24,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 600,
      color: "#3b1fa3",
      margin: 0,
    },
    card: {
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "none",
      marginBottom: 24,
    },
    statCard: {
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "none",
      height: "100%",
      textAlign: "center",
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
      color: "#3b1fa3",
      borderBottom: "2px solid #3b1fa3",
      paddingBottom: 12,
    },
    childSelector: {
      marginBottom: 24,
      padding: "16px",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    attendanceCard: {
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      textAlign: "center",
    },
    attendancePercent: {
      fontSize: 36,
      fontWeight: 700,
      color: "#3b1fa3",
      marginBottom: 4,
    },
    noData: {
      textAlign: "center",
      padding: "40px 20px",
      color: "#999",
      background: "#fafafa",
      borderRadius: 8,
      border: "1px dashed #d9d9d9",
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
    messageBubble: {
      position: "absolute",
      top: "100%",
      right: "0",
      marginTop: "8px",
      minWidth: "420px",
      maxWidth: "500px",
      width: "auto",
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      padding: "8px 16px",
      zIndex: 1000,
      animation: "slideInLeft 0.3s ease-out",
      border: "1px solid #f0f0f0",
      whiteSpace: "normal",
      wordWrap: "break-word",
      cursor: "pointer",
    },
    messageArrow: {
      position: "absolute",
      top: "-8px",
      right: "12px",
      width: 0,
      height: 0,
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid #fff",
    },
    messageTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: "#f5222d",
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    messageText: {
      fontSize: 12,
      color: "#555",
      marginBottom: 2,
      lineHeight: 1.3,
    },
    messageAmount: {
      fontSize: 14,
      fontWeight: 700,
      color: "#f5222d",
      marginTop: 6,
      textAlign: "center",
    },
  };

  if (loading && !stats) {
    return (
      <div style={styles.page}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Parent Dashboard</h1>
        </div>
        <Card>
          <Empty
            description="No children linked to your account. Please contact the administration."
            image={<UserOutlined style={{ fontSize: 60, color: "#3b1fa3" }} />}
          />
        </Card>
      </div>
    );
  }

  // Find children with pending payment
  const childrenWithPendingPayment = children.filter(
    (child) => child.paymentStatus === "Pending",
  );
  const hasPendingPayment = childrenWithPendingPayment.length > 0;

  return (
    <div style={styles.page}>
      <style>{animationStyles}</style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Parent Dashboard</h1>
          <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
            Track your children's academic performance
          </Text>
        </div>

        <Flex gap={16} align="center">
          {/* <Button
            icon={<ReloadOutlined />}
            onClick={refreshData}
            loading={loading}
          >
            Refresh
          </Button> */}

          {/* Notification Icon with Badge - Only show if there are pending payments */}
          {hasPendingPayment && (
            <div ref={notificationRef} style={styles.notificationContainer}>
              <Badge dot={hasPendingPayment} offset={[-5, 5]} color="#f5222d">
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

              {/* Message Bubble - Pops DOWN and to the LEFT of the icon */}
              {showMessage && (
                <div
                  style={styles.messageBubble}
                  onClick={() => (window.location.href = "/parent/payment")}
                >
                  <div style={styles.messageArrow} />
                  <div style={styles.messageTitle}>
                    <DollarOutlined style={{ fontSize: 12 }} />
                    <span>Monthly Fee Due!</span>
                  </div>
                  <div style={styles.messageText}>
                    Dear Parent, the following child/children have pending
                    tuition fees:
                  </div>
                  {childrenWithPendingPayment.map((child, index) => (
                    <div
                      key={child.studentId}
                      style={{ ...styles.messageText, marginLeft: 8 }}
                    >
                      • <strong>{child.name}</strong>: RM{child.monthlyFee}
                    </div>
                  ))}
                  <div style={styles.messageText}>
                    Please make payment as soon as possible.
                  </div>
                  <div style={styles.messageAmount}>Click here to pay →</div>
                </div>
              )}
            </div>
          )}
        </Flex>
      </div>

      {/* Child Selector */}
      <div style={styles.childSelector}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <div>
            <Text strong style={{ fontSize: 16, marginRight: 16 }}>
              Select Child:
            </Text>
            <Radio.Group
              value={selectedChild?.studentId}
              onChange={(e) => {
                const child = children.find(
                  (c) => c.studentId === e.target.value,
                );
                handleChildChange(child);
              }}
              buttonStyle="solid"
            >
              {children.map((child) => (
                <Radio.Button key={child.studentId} value={child.studentId}>
                  <UserOutlined /> {child.name}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
          {availableYears.length > 0 && (
            <div>
              <Text strong style={{ marginRight: 8 }}>
                Year:
              </Text>
              <Select
                value={selectedYear}
                onChange={handleYearChange}
                style={{ width: 120 }}
                size="middle"
              >
                {availableYears.map((year) => (
                  <Option key={year} value={year}>
                    {year} {year === new Date().getFullYear() && "(Current)"}
                  </Option>
                ))}
              </Select>
            </div>
          )}
        </Flex>
      </div>

      {stats && !stats.hasData ? (
        <Card>
          <Empty
            description={stats.message || "No data available for this year"}
            image={
              <CalendarOutlined style={{ fontSize: 60, color: "#3b1fa3" }} />
            }
          />
        </Card>
      ) : stats ? (
        <>
          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Overall Attendance"
                  value={stats.overallAttendance || 0}
                  precision={1}
                  suffix="%"
                  prefix={<CalendarOutlined style={{ color: "#3b1fa3" }} />}
                  valueStyle={{ color: "#3b1fa3", fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Present Days"
                  value={stats.attendance.present || 0}
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a", fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card style={styles.statCard}>
                <Statistic
                  title="Absent Days"
                  value={stats.attendance.absent || 0}
                  prefix={<CloseCircleOutlined style={{ color: "#f5222d" }} />}
                  valueStyle={{ color: "#f5222d", fontWeight: 600 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Test Marks Line Chart - Multiple Lines for Different Subjects */}
          <Card style={styles.chartCard}>
            <div style={styles.chartTitle}>
              📈 Test Marks Performance (All Subjects)
            </div>
            {stats.testMarksBySubject &&
            stats.testMarksBySubject.length > 0 &&
            chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="testName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      label={{
                        value: "Marks (%)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Marks"]}
                      labelFormatter={(label) => `Test: ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} />

                    {stats.testMarksBySubject.map((subject, idx) => (
                      <Line
                        key={subject.subjectId}
                        type="monotone"
                        dataKey={`subject_${subject.subjectId}`}
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
                    📈 Line chart shows performance trends for each subject over
                    time
                  </Text>
                </div>
              </>
            ) : (
              <div style={styles.noData}>
                No test marks recorded for this year
              </div>
            )}
          </Card>

          {/* Overall Attendance Pie Chart - Reduced Height */}
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Card style={styles.chartCard}>
                <div style={styles.chartTitle}>🎯 Overall Attendance</div>
                <div style={styles.attendanceCard}>
                  <div style={styles.attendancePercent}>
                    {stats.overallAttendance}%
                  </div>
                  <div
                    style={{ fontSize: 14, color: "#666", marginBottom: 12 }}
                  >
                    Attendance Rate
                  </div>
                  {stats.attendance.total > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Present",
                                value: stats.attendance.present,
                              },
                              {
                                name: "Absent",
                                value: stats.attendance.absent,
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(1)}%`
                            }
                          >
                            <Cell fill="#52c41a" />
                            <Cell fill="#f5222d" />
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={30} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ marginTop: 12 }}>
                        <Flex justify="center" gap={32}>
                          <div>
                            <CheckCircleOutlined
                              style={{
                                color: "#52c41a",
                                fontSize: 14,
                                marginRight: 6,
                              }}
                            />
                            <Text style={{ fontSize: 14 }}>
                              Present:{" "}
                              <strong>{stats.attendance.present}</strong>
                            </Text>
                          </div>
                          <div>
                            <CloseCircleOutlined
                              style={{
                                color: "#f5222d",
                                fontSize: 14,
                                marginRight: 6,
                              }}
                            />
                            <Text style={{ fontSize: 14 }}>
                              Absent: <strong>{stats.attendance.absent}</strong>
                            </Text>
                          </div>
                        </Flex>
                        <div style={{ marginTop: 8, textAlign: "center" }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Total Sessions: {stats.attendance.total}
                          </Text>
                        </div>
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
          </Row>

          {/* Info Card */}
          <Card style={styles.card}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
              <div>
                <Title level={5} style={{ margin: 0, color: "#3b1fa3" }}>
                  {selectedChild?.name} - {selectedYear} Academic Year
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Showing academic performance data for the selected year
                </Text>
              </div>
              <Tag
                color={
                  stats.overallAttendance >= 80
                    ? "green"
                    : stats.overallAttendance >= 60
                      ? "orange"
                      : "red"
                }
              >
                {stats.overallAttendance >= 80
                  ? "Good Standing"
                  : stats.overallAttendance >= 60
                    ? "Needs Improvement"
                    : "At Risk"}
              </Tag>
            </Flex>
          </Card>
        </>
      ) : (
        <Card>
          <Empty description="No data available" />
        </Card>
      )}
    </div>
  );
};

export default ParentDashboard;
