// src/Pages/StudentMaterials.js
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Flex, Empty, Spin,
  Tabs
} from 'antd';
import {
  DownloadOutlined,
  FilePdfOutlined, FileImageOutlined, VideoCameraOutlined, LinkOutlined,
  ReloadOutlined, FileZipOutlined, ArrowLeftOutlined,
  BookOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import StudentTestMarks from './StudentTestMarks';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StudentMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials');
  const navigate = useNavigate();
  const { classId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor || '#3b1fa3';

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/study-materials/class/${classId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.data.success) {
        setMaterials(res.data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('Failed to load materials');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [classId]);

  const getFileIcon = (fileType) => {
    const icons = {
      pdf: <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />,
      image: <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      video: <VideoCameraOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      zip: <FileZipOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      link: <LinkOutlined style={{ fontSize: 24, color: '#722ed1' }} />
    };
    return icons[fileType] || icons.pdf;
  };

  const handleDownload = (material) => {
    if (material.fileType === 'link') {
      window.open(material.fileUrl, '_blank');
    } else {
      window.open(`http://localhost:8000${material.fileUrl}`, '_blank');
    }
  };

  const styles = {
    page: { padding: '28px 32px', minHeight: '100vh', background: '#f7f5ff' },
    header: { marginBottom: 24 },
    classInfoCard: {
      backgroundColor: classColor,
      color: 'white',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
      boxShadow: `0 8px 16px ${classColor}80`
    },
    dateSection: {
      background: '#fff',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      border: `1px solid ${classColor}40`
    },
    dateHeader: {
      fontSize: 14,
      fontWeight: 600,
      color: classColor,
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    },
    materialItem: {
      background: '#fff',
      border: `1px solid ${classColor}30`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'all 0.3s ease'
    },
    materialTitle: {
      fontWeight: 600,
      color: classColor,
      fontSize: 14
    },
    tabs: {
      marginTop: 16
    },
    tabBar: {
      marginBottom: 20
    }
  };

  if (pageLoading) {
    return (
      <div style={{
        ...styles.page,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/student/materials')}
          style={{ marginBottom: 16 }}
        >
          Back to My Classes
        </Button>
      </div>

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
            {classInfo.teacherName && (
              <Text style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
                👤 {classInfo.teacherName}
              </Text>
            )}
          </Flex>
        </div>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={styles.tabs}
        tabBarStyle={styles.tabBar}
        type="card"
        size="large"
      >
        <TabPane 
          tab={
            <span>
              <BookOutlined style={{ marginRight: 8 }} />
              Study Materials
            </span>
          } 
          key="materials"
        >
          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, color: classColor }}>
              Study Materials
            </Title>
            <Button icon={<ReloadOutlined />} onClick={fetchMaterials} loading={loading}>
              Refresh
            </Button>
          </Flex>

          {loading ? (
            <Card loading />
          ) : materials.length === 0 ? (
            <Card>
              <Empty 
                description="No materials available for this class yet"
                image={<BookOutlined style={{ fontSize: 60, color: classColor }} />}
              />
            </Card>
          ) : (
            materials.map((dateGroup, idx) => (
              <div key={idx} style={styles.dateSection}>
                <div style={styles.dateHeader}>
                  <span style={{ 
                    backgroundColor: classColor,
                    color: 'white',
                    padding: '2px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {dateGroup.date}
                  </span>
                </div>
                {dateGroup.items.map((material) => (
                  <div 
                    key={material.materialId} 
                    style={styles.materialItem}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 6px 16px ${classColor}40`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = classColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = `${classColor}30`;
                    }}
                  >
                    <Flex align="center" gap={12} style={{ flex: 1 }}>
                      {getFileIcon(material.fileType)}
                      <div>
                        <div style={styles.materialTitle}>
                          {material.title}
                        </div>
                        {material.description && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            {material.description}
                          </div>
                        )}
                        {material.uploadedBy && (
                          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                            Uploaded by: {material.uploadedBy}
                          </div>
                        )}
                      </div>
                    </Flex>
                    <Button
                      size="small"
                      type="primary"
                      icon={material.fileType === 'link' ? <LinkOutlined /> : <DownloadOutlined />}
                      onClick={() => handleDownload(material)}
                      style={{ background: classColor, borderColor: classColor }}
                    >
                      {material.fileType === 'link' ? 'Open' : 'Open'}
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FileTextOutlined style={{ marginRight: 8 }} />
              My Test Marks
            </span>
          } 
          key="testmarks"
        >
          <StudentTestMarks />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default StudentMaterials;