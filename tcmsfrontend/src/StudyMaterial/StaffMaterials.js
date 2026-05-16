// src/Pages/StaffMaterials.js
import React, { useState, useEffect } from 'react';
import {
  Button, message, Typography, Card, Flex, Empty, Modal, Spin,
  Tabs, Pagination
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, DownloadOutlined,
  FilePdfOutlined, FileImageOutlined, VideoCameraOutlined, LinkOutlined,
  ReloadOutlined, FileZipOutlined, ArrowLeftOutlined,
  BookOutlined, FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import StaffTestMarks from './StaffTestMarks'; 

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StaffMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
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
        setCurrentPage(1); // Reset to first page when new data loads
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

  const handleDelete = (materialId) => {
    Modal.confirm({
      title: 'Delete Material',
      content: 'Are you sure you want to delete this material?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await axios.delete(
            `http://localhost:8000/api/study-materials/${materialId}`,
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (res.data.success) {
            message.success('Material deleted');
            fetchMaterials();
          }
        } catch {
          message.error('Failed to delete material');
        }
      }
    });
  };

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

  // Get current page materials (flattened list for pagination)
  const getCurrentPageMaterials = () => {
    // First flatten all materials from all date groups
    const allMaterials = [];
    materials.forEach(dateGroup => {
      dateGroup.items.forEach(material => {
        allMaterials.push({
          ...material,
          date: dateGroup.date
        });
      });
    });
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allMaterials.slice(startIndex, endIndex);
  };

  // Get total count of all materials
  const getTotalMaterialsCount = () => {
    let total = 0;
    materials.forEach(dateGroup => {
      total += dateGroup.items.length;
    });
    return total;
  };

  // Regroup paginated materials by date for display
  const regroupMaterialsByDate = (paginatedMaterials) => {
    const grouped = {};
    paginatedMaterials.forEach(material => {
      if (!grouped[material.date]) {
        grouped[material.date] = [];
      }
      grouped[material.date].push(material);
    });
    
    // Convert to array format
    return Object.keys(grouped).map(date => ({
      date: date,
      items: grouped[date]
    }));
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
          onClick={() => navigate('/staff/materials')}
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
            <Flex gap={8}>
              <Button icon={<ReloadOutlined />} onClick={fetchMaterials} loading={loading}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/staff/materials/add', {
                  state: { 
                    preselectedClassId: classId,
                    classInfo: classInfo,
                    classColor: classColor
                  }
                })}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Add Material
              </Button>
            </Flex>
          </Flex>

          {loading ? (
            <Card loading />
          ) : materials.length === 0 ? (
            <Card>
              <Empty 
                description="No materials uploaded for this class yet"
                image={<BookOutlined style={{ fontSize: 60, color: classColor }} />}
              />
            </Card>
          ) : (
            <>
              {regroupMaterialsByDate(getCurrentPageMaterials()).map((dateGroup, idx) => (
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
                        </div>
                      </Flex>
                      <Flex gap={8}>
                        <Button
                          size="small"
                          type="primary"
                          icon={material.fileType === 'link' ? <LinkOutlined /> : <DownloadOutlined />}
                          onClick={() => handleDownload(material)}
                          style={{ background: '#1890ff', borderColor: '#1890ff' }}
                        >
                          {material.fileType === 'link' ? 'Open' : 'Open'}
                        </Button>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => navigate(`/staff/materials/edit/${material.materialId}`, {
                            state: { 
                              classInfo: classInfo,
                              classColor: classColor
                            }
                          })}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(material.materialId)}
                        />
                      </Flex>
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Pagination Component */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={getTotalMaterialsCount()}
                  showSizeChanger={true}
                  showTotal={(total) => `Total ${total} materials`}
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
        </TabPane>

        <TabPane 
          tab={
            <span>
              <FileTextOutlined style={{ marginRight: 8 }} />
              Test Marks
            </span>
          } 
          key="testmarks"
        >
          <StaffTestMarks />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default StaffMaterials;