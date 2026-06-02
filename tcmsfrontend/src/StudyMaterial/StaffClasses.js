import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Spin, Empty, message, Tag, Button
} from 'antd';
import {
  BookOutlined, ClockCircleOutlined, EnvironmentOutlined,
  ReloadOutlined, FolderOpenOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title, Text } = Typography;

const StaffClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const user = getUser();

  const fetchMyClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl('/api/study-materials/my-classes'), {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) {
        setClasses(res.data.data);
        if (res.data.data.length === 0) {
          message.info('You are not assigned to any classes yet');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load your classes');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClasses();
  }, []);

  // Rich, solid colors - good contrast with white text
  const classColors = [
    '#C41E3A', // Crimson Red
    '#1E4C7A', // Deep Blue
    '#2E5C4A', // Forest Green
    '#8B4513', // Saddle Brown
    '#4A2C6D', // Royal Purple
    '#B22222', // Fire Brick
    '#2A5C6E', // Teal
    '#7D3C1B', // Rust
    '#1E3A5F', // Navy
    '#5D3A1A', // Dark Brown
    '#4A6D8C', // Steel Blue
    '#7C4D2E', // Coffee
    '#3A5F5F', // Dark Slate
    '#8B0000', // Dark Red
    '#2F4F4F', // Dark Slate Gray
    '#6B4F3C', // Taupe
    '#4A6B4A', // Sage Green
    '#7B3F3F', // Rosewood
    '#2C5F5F', // Deep Teal
    '#6A4E3A', // Umber
    '#3A5F7A', // Slate Blue
    '#8B5A2B', // Golden Brown
    '#4A6B8C', // Denim
    '#7A4A3F', // Terracotta
    '#9B2C2C', // Deep Red
    '#0B4F6C', // Dark Cyan
    '#4A704A', // Moss Green
    '#8B5F5F', // Dusty Rose
    '#4A3F6B', // Deep Lavender
    '#6B4A3F', // Sepia
    '#2C5F5F', // Pine Green
    '#8B3F3F', // Brick Red
    '#3F6B8B', // Steel Blue
    '#6B8B3F', // Olive
    '#8B6B3F', // Bronze
    '#4A2C2C', // Maroon
    '#2C4A4A', // Deep Teal
    '#6B4A6B', // Plum
    '#4A6B6B', // Slate
    '#8B4A2C', // Terracotta
    '#2C4A2C', // Forest
    '#6B2C4A', // Berry
    '#4A2C6B', // Indigo
    '#8B6B4A', // Tan
    '#2C6B6B', // Cyan
    '#6B4A2C', // Copper
    '#4A6B2C', // Leaf Green
    '#8B2C4A', // Raspberry
    '#2C2C6B', // Midnight Blue
    '#6B2C6B', // Purple
  ];

  const getClassColor = (classItem) => {
    // Create a unique string combining multiple properties including classId for uniqueness
    const colorKey = `${classItem.subjectName}-${classItem.form}-${classItem.classId}`;
    
    // Use djb2 hashing algorithm for better distribution
    let hash = 5381;
    for (let i = 0; i < colorKey.length; i++) {
      hash = ((hash << 5) + hash) + colorKey.charCodeAt(i); // hash * 33 + c
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get index
    const index = Math.abs(hash) % classColors.length;
    
    return classColors[index];
  };

  const handleClassClick = (classData) => {
    const classColor = getClassColor(classData);
    navigate(`/staff/materials/class/${classData.classId}`, {
      state: { 
        classInfo: classData,
        classColor: classColor
      }
    });
  };

  const dayColors = {
    Monday: '#1890ff',
    Tuesday: '#52c41a',
    Wednesday: '#fa8c16',
    Thursday: '#722ed1',
    Friday: '#13c2c2',
    Saturday: '#eb2f96',
    Sunday: '#f5222d'
  };

  const styles = {
    page: {
      padding: '28px 32px',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32
    },
    classCard: {
      height: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
      position: 'relative'
    },
    classCardBody: {
      padding: '20px',
      background: 'white'
    },
    subjectTitle: {
      fontSize: 20,
      fontWeight: 700,
      color: 'white',
      marginBottom: 8,
      lineHeight: 1.2,
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    formTag: {
      background: 'rgba(255,255,255,0.25)',
      border: '1px solid rgba(255,255,255,0.4)',
      color: 'white',
      fontWeight: 600
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      color: '#666'
    },
    emptyState: {
      padding: '60px 20px',
      textAlign: 'center'
    }
  };

  if (pageLoading) {
    return (
      <div style={{
        ...styles.page,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#3b1fa3' }}>
            My Classes
          </Title>
          <Text type="secondary">
            Click on a class to view and manage study materials
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchMyClasses}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card style={styles.emptyState}>
          <Empty
            image={<BookOutlined style={{ fontSize: 80, color: '#3b1fa3' }} />}
            description={
              <div>
                <Title level={4} style={{ color: '#3b1fa3', marginTop: 16 }}>
                  No Classes Assigned
                </Title>
                <Text type="secondary">
                  You haven't been assigned to any classes yet. Please contact your admin.
                </Text>
              </div>
            }
          />
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {classes.map((cls) => {
            const classColor = getClassColor(cls);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={cls.classId}>
                <Card
                  style={styles.classCard}
                  hoverable
                  onClick={() => handleClassClick(cls)}
                  bodyStyle={{ padding: 0 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px ${classColor}80`;
                    e.currentTarget.style.borderColor = classColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{
                    backgroundColor: classColor,
                    padding: '20px',
                    color: 'white',
                    minHeight: 120
                  }}>
                    <div style={styles.subjectTitle}>
                      {cls.subjectName}
                    </div>
                    <Tag style={styles.formTag}>
                      {cls.form}
                    </Tag>
                  </div>

                  <div style={styles.classCardBody}>
                    <div style={styles.infoRow}>
                      <Tag
                        color={dayColors[cls.classDay]}
                        style={{ fontWeight: 600, fontSize: 12 }}
                      >
                        {cls.classDay}
                      </Tag>
                    </div>

                    <div style={styles.infoRow}>
                      <ClockCircleOutlined style={{ color: classColor }} />
                      <Text strong style={{ fontSize: 13 }}>
                        {cls.startTime} - {cls.finishTime}
                      </Text>
                    </div>

                    {cls.location && (
                      <div style={styles.infoRow}>
                        <EnvironmentOutlined style={{ color: classColor }} />
                        <Text style={{ fontSize: 13 }}>{cls.location}</Text>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        color: classColor,
                        fontWeight: 600
                      }}
                    >
                      <FolderOpenOutlined />
                      <span>View Materials</span>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default StaffClasses;
