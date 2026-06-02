import React, { useEffect, useState } from "react";
import { Card, Spin, Empty, Typography, Tag, Flex, Button, Modal, Table, message, Statistic, Row, Col, Avatar, Tooltip, Pagination } from "antd";
import { ArrowLeftOutlined, EyeOutlined, CalendarOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, PieChartOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../Utils/LocalStorage";
import dayjs from "dayjs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { apiUrl } from "../api";

const { Title, Text } = Typography;

const PastClassAttendanceView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const academicYear = location.state?.academicYear;
  const classColor = location.state?.classColor || "#3b1fa3";

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [details, setDetails] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Pagination state for history
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      console.log('Fetching attendance archive for:', { classId, academicYear });
      const res = await axios.get(
        apiUrl(`/api/attendance/archive/class/${classId}/history?academicYear=${academicYear}`),
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      console.log('Attendance history response:', res.data);
      if (res.data.success) {
        setHistory(res.data.data);
        setCurrentPage(1); // Reset to first page when new data loads
      } else {
        message.error(res.data.message || 'Failed to load attendance history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      message.error(error.response?.data?.message || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (record) => {
    // Validate record has date
    if (!record || !record.date) {
      console.error('Invalid record or missing date:', record);
      message.error('Cannot load attendance details: Invalid record');
      return;
    }

    const dateValue = record.date;
    console.log('Opening details for date:', dateValue);
    
    setSelectedRecord(record);
    
    try {
      console.log('Fetching attendance details for:', { 
        classId, 
        date: dateValue, 
        academicYear 
      });
      
      // Encode the date for URL safety
      const encodedDate = encodeURIComponent(dateValue);
      const url = apiUrl(`/api/attendance/archive/class/${classId}/date/${encodedDate}?academicYear=${academicYear}`);
      
      console.log('Request URL:', url);
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      console.log('Attendance details response:', res.data);
      
      if (res.data.success) {
        setDetails(res.data.data);
        setModalTitle(dayjs(dateValue).format("MMMM D, YYYY"));
        setModalOpen(true);
      } else {
        message.error(res.data.message || 'Failed to load attendance details');
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      message.error(error.response?.data?.message || 'Failed to load attendance details');
    }
  };

  useEffect(() => {
    if (classId && academicYear) {
      fetchHistory();
    }
  }, [classId, academicYear]);

  // Get current page data for history
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return history.slice(startIndex, endIndex);
  };

  // Calculate overall stats
  const totalRecords = history.length;
  const totalPresent = history.reduce((sum, r) => sum + (r.presentCount || 0), 0);
  const totalAbsent = history.reduce((sum, r) => sum + (r.absentCount || 0), 0);
  const totalSessions = totalPresent + totalAbsent;
  const overallAttendance = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : 0;

  const pieData = [
    { name: 'Present', value: totalPresent, color: '#52c41a' },
    { name: 'Absent', value: totalAbsent, color: '#f5222d' }
  ];

  const styles = {
    page: {
      padding: "28px 32px",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f7f5ff 0%, #f0ebff 100%)"
    },
    headerCard: {
      background: `linear-gradient(135deg, ${classColor} 0%, ${classColor}dd 100%)`,
      borderRadius: 16,
      padding: "20px 28px",
      marginBottom: 24,
      boxShadow: `0 8px 20px ${classColor}40`
    },
    statCard: {
      background: "white",
      borderRadius: 16,
      padding: "20px",
      textAlign: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      height: "100%"
    },
    historyCard: {
      marginBottom: 12,
      borderRadius: 12,
      transition: "all 0.3s ease",
      cursor: "pointer",
      border: `1px solid ${classColor}20`,
      overflow: "hidden"
    },
    paginationContainer: {
      marginTop: 24,
      display: "flex",
      justifyContent: "flex-end"
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <Card style={{ borderRadius: 16, textAlign: "center", padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading attendance records...</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate("/authority/schedule")} 
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        Back to Class Schedule
      </Button>

      {/* Header Banner */}
      <div style={styles.headerCard}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
          <div>
            <Title level={3} style={{ color: "white", margin: 0, marginBottom: 8 }}>
              📋 {classInfo?.subjectName || "Class"} Attendance
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
              {classInfo?.form} • Academic Year {academicYear}
            </Text>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 16px" }}>
            <Text style={{ color: "white", fontSize: 24, fontWeight: 700 }}>{totalRecords}</Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", marginLeft: 8 }}>Class Sessions</Text>
          </div>
        </Flex>
      </div>

      {/* Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Overall Attendance"
              value={overallAttendance}
              precision={1}
              suffix="%"
              prefix={<PieChartOutlined />}
              valueStyle={{ color: classColor, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Total Sessions"
              value={totalSessions}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#1890ff", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Total Present"
              value={totalPresent}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={styles.statCard}>
            <Statistic
              title="Total Absent"
              value={totalAbsent}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#f5222d", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Pie Chart Row */}
      {totalSessions > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card style={{ borderRadius: 16, overflow: "hidden" }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <Title level={5}>Attendance Summary</Title>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: "center", padding: 60 }}>
          <Empty 
            description="No attendance records for this class/year"
            image={<CalendarOutlined style={{ fontSize: 60, color: classColor }} />}
          />
        </Card>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 16 }}>📅 Session History</Text>
          </div>
          <Flex vertical gap={12}>
            {getCurrentPageData().map((r, idx) => {
              const attendanceRate = r.totalStudents > 0 ? ((r.presentCount / r.totalStudents) * 100).toFixed(1) : 0;
              return (
                <Card 
                  key={r.date || idx} 
                  style={styles.historyCard}
                  hoverable
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 8px 20px ${classColor}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                    <div>
                      <Flex align="center" gap={8}>
                        <Avatar 
                          style={{ backgroundColor: classColor, width: 40, height: 40 }}
                          icon={<CalendarOutlined />}
                        />
                        <div>
                          <Text strong style={{ fontSize: 16, color: classColor }}>
                            {r.date ? dayjs(r.date).format("dddd, MMMM D, YYYY") : 'Unknown Date'}
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag color="blue">Total: {r.totalStudents || 0}</Tag>
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              Present: {r.presentCount || 0}
                            </Tag>
                            <Tag color="red" icon={<CloseCircleOutlined />}>
                              Absent: {r.absentCount || 0}
                            </Tag>
                            <Tag color="purple">Rate: {attendanceRate}%</Tag>
                          </div>
                        </div>
                      </Flex>
                    </div>
                    <Tooltip title="View Details">
                      <Button 
                        type="primary" 
                        icon={<EyeOutlined />}
                        onClick={() => openDetails(r)}
                        style={{ 
                          background: classColor, 
                          borderColor: classColor,
                          borderRadius: 20,
                          paddingLeft: 20,
                          paddingRight: 20
                        }}
                      >
                        View Details
                      </Button>
                    </Tooltip>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
          
          {/* Pagination for History */}
          <div style={styles.paginationContainer}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={history.length}
              showSizeChanger={true}
              showTotal={(total) => `Total ${total} attendance records`}
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
        </div>
      )}

      {/* Modal for Details */}
      <Modal 
        title={
          <Flex align="center" gap={8}>
            <Avatar style={{ backgroundColor: classColor }} icon={<CalendarOutlined />} />
            <span style={{ fontSize: 18, fontWeight: 600, color: classColor }}>
              Attendance Details - {modalTitle}
            </span>
          </Flex>
        } 
        open={modalOpen} 
        onCancel={() => setModalOpen(false)} 
        footer={null} 
        width={700}
        styles={{ body: { padding: "20px" } }}
      >
        {selectedRecord && (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", background: "#f0f5ff" }}>
                  <Text type="secondary">Total Students</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1890ff" }}>
                    {selectedRecord.totalStudents || 0}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", background: "#f6ffed" }}>
                  <Text type="secondary">Present</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#52c41a" }}>
                    {selectedRecord.presentCount || 0}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", background: "#fff2f0" }}>
                  <Text type="secondary">Absent</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f5222d" }}>
                    {selectedRecord.absentCount || 0}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}
        <Table
          rowKey="attendanceId"
          dataSource={details}
          pagination={false}
          size="middle"
          columns={[
            { 
              title: "Student", 
              dataIndex: "studentName",
              render: (text) => <Text strong>{text || 'Unknown'}</Text>
            },
            { 
              title: "Status", 
              dataIndex: "status", 
              render: (s) => (
                <Tag 
                  color={s === "Present" ? "green" : "red"}
                  icon={s === "Present" ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  style={{ padding: "4px 12px", borderRadius: 20 }}
                >
                  {s || 'Unknown'}
                </Tag>
              ),
              align: "center"
            }
          ]}
          locale={{ emptyText: 'No attendance records found for this date' }}
        />
      </Modal>
    </div>
  );
};

export default PastClassAttendanceView;
