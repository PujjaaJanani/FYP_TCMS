// src/Pages/RecordAttendance.js - Enhanced with History Tab
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Spin, Checkbox, DatePicker, Flex, Empty, Tabs, Tag, Modal
} from 'antd';
import { 
  ArrowLeftOutlined, SaveOutlined, BookOutlined, HistoryOutlined, 
  CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const RecordAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [tabLoading, setTabLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [historyDetails, setHistoryDetails] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({});
  
  const navigate = useNavigate();
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor || '#3b1fa3';
  const user = getUser();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/attendance/class/${classId}/students`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      if (res.data.success) {
        setStudents(res.data.data);
        
        // Initialize all students as Present
        const initialData = {};
        res.data.data.forEach(student => {
          initialData[student.registrationId] = true;
        });
        setAttendanceData(initialData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Failed to load students');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/attendance/class/${classId}/history`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (error) {
      console.error('History fetch error:', error);
      message.error('Failed to load attendance history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchHistoryByDate = async (date) => {
    setModalLoading(true);
    setIsModalVisible(true);
    setSelectedHistoryDate(date);
    setIsEditing(false);
    
    try {
      const res = await axios.get(
        `http://localhost:8000/api/attendance/class/${classId}/date/${date}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      if (res.data.success) {
        setHistoryDetails(res.data.data);
        
        // Initialize editing data
        const initialEditData = {};
        res.data.data.forEach(record => {
          initialEditData[record.registrationId] = record.status === 'Present';
        });
        setEditingData(initialEditData);
      }
    } catch (error) {
      console.error('History details error:', error);
      message.error('Failed to load attendance details');
      setIsModalVisible(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedHistoryDate(null);
    setHistoryDetails([]);
    setIsEditing(false);
    setEditingData({});
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleEditCheckboxChange = (registrationId, checked) => {
    setEditingData(prev => ({
      ...prev,
      [registrationId]: checked
    }));
  };

  const handleUpdateAttendance = async () => {
    if (!selectedHistoryDate) return;

    setSubmitting(true);
    try {
      const attendanceArray = Object.entries(editingData).map(([registrationId, isPresent]) => ({
        registrationId: parseInt(registrationId),
        status: isPresent ? 'Present' : 'Absent'
      }));

      const res = await axios.post(
        'http://localhost:8000/api/attendance/submit',
        {
          classId: parseInt(classId),
          authorityId: parseInt(user.id),
          date: selectedHistoryDate,
          attendance: attendanceArray
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Attendance updated successfully!');
        setIsEditing(false);
        // Refresh the data with loading
        setModalLoading(true);
        await fetchHistory();
        await fetchHistoryByDate(selectedHistoryDate);
        setModalLoading(false);
      }
    } catch (error) {
      console.error('Update error:', error);
      message.error(error.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = (date) => {
    Modal.confirm({
      title: 'Delete Attendance Record',
      content: `Are you sure you want to delete the attendance record for ${dayjs(date).format('MMMM D, YYYY')}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await axios.delete(
            `http://localhost:8000/api/attendance/class/${classId}/date/${date}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );

          if (res.data.success) {
            message.success('Attendance record deleted successfully');
            closeModal();
            setHistoryLoading(true);
            await fetchHistory();
            setHistoryLoading(false);
          }
        } catch (error) {
          console.error('Delete error:', error);
          message.error(error.response?.data?.message || 'Failed to delete attendance');
        }
      }
    });
  };

  useEffect(() => {
    fetchStudents();
  }, [classId]);

  // Handle tab change with loading state
  const handleTabChange = async (key) => {
    setActiveTab(key);
    setTabLoading(true);
    
    if (key === 'history') {
      await fetchHistory();
    }
    
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setTabLoading(false);
    }, 300);
  };

  const handleCheckboxChange = (registrationId, checked) => {
    setAttendanceData(prev => ({
      ...prev,
      [registrationId]: checked
    }));
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedDate) {
      message.error('Please select a date');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceArray = Object.entries(attendanceData).map(([registrationId, isPresent]) => ({
        registrationId: parseInt(registrationId),
        status: isPresent ? 'Present' : 'Absent'
      }));

      const res = await axios.post(
        'http://localhost:8000/api/attendance/submit',
        {
          classId: parseInt(classId),
          authorityId: parseInt(user.id),
          date: selectedDate.format('YYYY-MM-DD'),
          attendance: attendanceArray
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Attendance recorded successfully!');
        
        // Switch to history tab with loading
        setActiveTab('history');
        setTabLoading(true);
        await fetchHistory();
        setTimeout(() => {
          setTabLoading(false);
        }, 300);
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error(error.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    page: { padding: '28px 32px', minHeight: '100vh', background: '#f7f5ff' },
    classInfoCard: {
      backgroundColor: classColor,
      color: 'white',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
      boxShadow: `0 8px 16px ${classColor}80`
    },
    attendanceCard: {
      borderRadius: 12,
      border: `2px solid ${classColor}40`,  
      boxShadow: `0 12px 28px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.1)`
    },
    tableHeader: {
      backgroundColor: '#f0f0f0',
      color: '#000000',
      padding: '12px 20px',
      fontWeight: 700,
      fontSize: 16,
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12
    },
    studentRow: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      padding: '16px 20px',
      borderBottom: '1px solid #f0f0f0',
      alignItems: 'center',
      transition: 'background 0.3s ease'
    },
    historyCard: {
      marginBottom: 12,
      cursor: 'pointer',
      border: `2px solid ${classColor}30`,
      transition: 'all 0.3s ease'
    },
    detailsCard: {
      border: `2px solid ${classColor}`,
      marginTop: 16
    },
    tabs: {
      marginTop: 16
    },
    tabBar: {
      marginBottom: 20
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '300px',
      width: '100%',
      background: '#fff',
      borderRadius: 12,
      padding: '40px'
    }
  };

  if (pageLoading) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'new',
      label: (
        <span>
          <CalendarOutlined /> Record New
        </span>
      ),
      children: (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Flex align="center" gap={16}>
              <Text strong>Select Date:</Text>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                format="YYYY-MM-DD"
                size="large"
                style={{ width: 200 }}
              />
            </Flex>
          </Card>

          {loading ? (
            <div style={styles.loadingContainer}>
              <Spin size="large" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <Empty 
                description="No students enrolled in this class"
                image={<BookOutlined style={{ fontSize: 60, color: classColor }} />}
              />
            </Card>
          ) : (
            <Card style={styles.attendanceCard} styles={{ body: { padding: 0 } }}>
              <div style={styles.tableHeader}>
                <span>Name</span>
                <span>Status</span>
              </div>
              
              {students.map((student, index) => (
                <div
                  key={student.registrationId}
                  style={{
                    ...styles.studentRow,
                    background: index % 2 === 0 ? 'white' : '#fafafa'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${classColor}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa';
                  }}
                >
                  <Text strong style={{ fontSize: 15 }}>
                    {student.studentName}
                  </Text>
                  <Checkbox
                    checked={attendanceData[student.registrationId]}
                    onChange={(e) => handleCheckboxChange(student.registrationId, e.target.checked)}
                    style={{
                      transform: 'scale(1.5)',
                      accentColor: classColor
                    }}
                  />
                </div>
              ))}
            </Card>
          )}

          <Flex gap={8} justify="center" style={{ marginTop: 24 }}>
            <Button
              size="large"
              htmlType="button"
              onClick={() => navigate('/staff/attendance')}
              style={{ minWidth: 120 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="button"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={students.length === 0}
              style={{
                background: '#52c41a',
                borderColor: '#52c41a',
                minWidth: 120
              }}
            >
              Submit
            </Button>
          </Flex>
        </>
      )
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> View History
        </span>
      ),
      children: (
        <>
          {tabLoading || historyLoading ? (
            <div style={styles.loadingContainer}>
              <Spin size="large" />
            </div>
          ) : history.length === 0 ? (
            <Card>
              <Empty 
                description="No attendance records yet"
                image={<HistoryOutlined style={{ fontSize: 60, color: classColor }} />}
              />
            </Card>
          ) : (
            <>
              {history.map((record) => (
                <Card
                  key={record.date}
                  style={styles.historyCard}
                  hoverable
                  onClick={() => fetchHistoryByDate(record.date)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = classColor;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${classColor}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${classColor}30`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <div>
                      <Text strong style={{ fontSize: 16, color: classColor }}>
                        📅 {dayjs(record.date).format('dddd, MMMM D, YYYY')}
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag color="blue">Total: {record.totalStudents}</Tag>
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          Present: {record.presentCount}
                        </Tag>
                        <Tag color="red" icon={<CloseCircleOutlined />}>
                          Absent: {record.absentCount}
                        </Tag>
                      </div>
                    </div>
                    <Button 
                      type="primary" 
                      icon={<EyeOutlined />} 
                      style={{ background: classColor, borderColor: classColor }}
                    >
                      View Details
                    </Button>
                  </Flex>
                </Card>
              ))}
            </>
          )}
        </>
      )
    }
  ];

  return (
    <div style={styles.page}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/staff/attendance')}
        style={{ marginBottom: 16 }}
      >
        Back to My Classes
      </Button>

      {classInfo && (
        <div style={styles.classInfoCard}>
          <Title level={3} style={{ color: 'white', margin: 0, marginBottom: 12, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            {classInfo.subjectName} - {classInfo.form}
          </Title>
          <Flex gap={16} wrap="wrap">
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
              📅 {classInfo.classDay}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
              🕐 {classInfo.startTime} - {classInfo.finishTime}
            </Text>
            {classInfo.location && (
              <Text style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
                📍 {classInfo.location}
              </Text>
            )}
          </Flex>
        </div>
      )}

      <Tabs 
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        style={styles.tabs}
        tabBarStyle={styles.tabBar}
        type="card"
        size="large"
      />

      {/* Attendance Details Modal */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <CalendarOutlined style={{ color: classColor }} />
            <span>Attendance Details - {selectedHistoryDate ? dayjs(selectedHistoryDate).format('MMMM D, YYYY') : ''}</span>
          </Flex>
        }
        open={isModalVisible}
        onCancel={closeModal}
        footer={[
          isEditing ? (
            <React.Fragment key="edit-footer">
              <Button 
                key="cancel-edit" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                key="save" 
                type="primary" 
                loading={submitting}
                onClick={handleUpdateAttendance} 
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Save Changes
              </Button>
            </React.Fragment>
          ) : (
            <React.Fragment key="view-footer">
              <Button 
                key="delete" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAttendance(selectedHistoryDate)}
              >
                Delete
              </Button>
              <Button 
                key="edit" 
                icon={<EditOutlined />}
                onClick={handleEditToggle}
              >
                Edit
              </Button>
              <Button 
                key="close" 
                type="primary" 
                onClick={closeModal} 
                style={{ background: classColor, borderColor: classColor }}
              >
                Close
              </Button>
            </React.Fragment>
          )
        ]}
        width={600}
      >
        {modalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : historyDetails.length === 0 ? (
          <Empty description="No attendance data" />
        ) : (
          <div>
            {/* Summary Stats */}
            {!isEditing && (
              <Card 
                style={{ marginBottom: 16, background: `${classColor}10`, border: `1px solid ${classColor}30` }}
                styles={{ body: { padding: '16px' } }}
              >
                <Flex justify="space-around">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                      {historyDetails.length}
                    </div>
                    <Text type="secondary">Total Students</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>
                      {isEditing 
                        ? Object.values(editingData).filter(v => v === true).length
                        : historyDetails.filter(r => r.status === 'Present').length
                      }
                    </div>
                    <Text type="secondary">Present</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
                      {isEditing
                        ? Object.values(editingData).filter(v => v === false).length
                        : historyDetails.filter(r => r.status === 'Absent').length
                      }
                    </div>
                    <Text type="secondary">Absent</Text>
                  </div>
                </Flex>
              </Card>
            )}

            {/* Student List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {isEditing ? (
                // Editing mode with checkboxes
                <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: '#f0f0f0',
                    color: '#000000',
                    padding: '12px 20px',
                    fontWeight: 700,
                    fontSize: 16,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto'
                  }}>
                    <span>Name</span>
                    <span>Present</span>
                  </div>
                  {historyDetails.map((record, index) => (
                    <div
                      key={record.attendanceId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        padding: '16px 20px',
                        borderBottom: index < historyDetails.length - 1 ? '1px solid #f0f0f0' : 'none',
                        background: index % 2 === 0 ? 'white' : '#fafafa',
                        alignItems: 'center'
                      }}
                    >
                      <Text strong style={{ fontSize: 15 }}>{record.studentName}</Text>
                      <Checkbox
                        checked={editingData[record.registrationId]}
                        onChange={(e) => handleEditCheckboxChange(record.registrationId, e.target.checked)}
                        style={{
                          transform: 'scale(1.5)',
                          accentColor: classColor
                        }}
                      />
                    </div>
                  ))}
                </Card>
              ) : (
                // View mode with tags
                historyDetails.map((record, index) => (
                  <div
                    key={record.attendanceId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: index < historyDetails.length - 1 ? '1px solid #f0f0f0' : 'none',
                      background: index % 2 === 0 ? 'white' : '#fafafa'
                    }}
                  >
                    <Text strong style={{ fontSize: 15 }}>{record.studentName}</Text>
                    {record.status === 'Present' ? (
                      <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
                        Present
                      </Tag>
                    ) : (
                      <Tag color="red" icon={<CloseCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
                        Absent
                      </Tag>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecordAttendance;