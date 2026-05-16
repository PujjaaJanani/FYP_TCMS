import React, { useEffect, useState } from "react";
import { Button, Card, Collapse, Empty, Spin, Table, Tabs, Tag, Typography, message, Flex, Tooltip, Divider, Avatar, Pagination } from "antd";
import { 
  ArrowLeftOutlined, 
  FilePdfOutlined, 
  FileImageOutlined, 
  VideoCameraOutlined, 
  LinkOutlined, 
  FileZipOutlined,
  DownloadOutlined,
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getToken } from "../Utils/LocalStorage";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const PastClassAcademicView = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const academicYear = location.state?.academicYear;
  const classColor = location.state?.classColor || "#3b1fa3";

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [tests, setTests] = useState([]);
  
  // Pagination states for materials
  const [materialsCurrentPage, setMaterialsCurrentPage] = useState(1);
  const [materialsPageSize, setMaterialsPageSize] = useState(10);
  
  // Pagination states for tests
  const [testsCurrentPage, setTestsCurrentPage] = useState(1);
  const [testsPageSize, setTestsPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching materials for archive:', { classId, academicYear });
      const [matRes, testRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/study-materials/class/${classId}?academicYear=${academicYear}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        axios.get(`http://localhost:8000/api/testmarks/class/${classId}?academicYear=${academicYear}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      
      console.log('Materials response:', matRes.data);
      console.log('Tests response:', testRes.data);
      
      if (matRes.data.success) setMaterials(matRes.data.data);
      if (testRes.data.success) setTests(testRes.data.data);
    } catch (error) {
      console.error('Error fetching archive data:', error);
      message.error(error.response?.data?.message || "Failed to load class records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId && academicYear) {
      fetchData();
    }
  }, [classId, academicYear]);

  // Open file in new tab instead of downloading
  const handleOpenFile = (material) => {
    if (material.fileType === 'link') {
      window.open(material.fileUrl, '_blank');
    } else if (material.fileUrl) {
      // Open the file directly in a new tab
      window.open(`http://localhost:8000${material.fileUrl}`, '_blank');
    }
  };

  const getFileIcon = (fileType, size = 28) => {
    const icons = {
      pdf: <FilePdfOutlined style={{ fontSize: size, color: '#ff4d4f' }} />,
      image: <FileImageOutlined style={{ fontSize: size, color: '#52c41a' }} />,
      video: <VideoCameraOutlined style={{ fontSize: size, color: '#1890ff' }} />,
      zip: <FileZipOutlined style={{ fontSize: size, color: '#fa8c16' }} />,
      link: <LinkOutlined style={{ fontSize: size, color: '#722ed1' }} />
    };
    return icons[fileType] || <FileTextOutlined style={{ fontSize: size, color: '#666' }} />;
  };

  // Get paginated materials
  const getPaginatedMaterials = () => {
    const startIndex = (materialsCurrentPage - 1) * materialsPageSize;
    const endIndex = startIndex + materialsPageSize;
    return materials.slice(startIndex, endIndex);
  };

  // Get paginated tests
  const getPaginatedTests = () => {
    const startIndex = (testsCurrentPage - 1) * testsPageSize;
    const endIndex = startIndex + testsPageSize;
    return tests.slice(startIndex, endIndex);
  };

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
      borderRadius: 12,
      padding: "12px 20px",
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
    },
    materialCard: {
      marginBottom: 12,
      borderRadius: 12,
      transition: "all 0.3s ease",
      cursor: "pointer",
      border: `1px solid ${classColor}20`
    },
    panelHeader: {
      fontSize: 16,
      fontWeight: 600,
      color: classColor,
      display: "flex",
      alignItems: "center",
      gap: 8
    },
    testCard: {
      marginBottom: 16,
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${classColor}30`
    },
    testHeader: {
      background: `${classColor}10`,
      padding: "16px 20px",
      borderBottom: `2px solid ${classColor}`
    },
    paginationContainer: {
      marginTop: 24,
      display: "flex",
      justifyContent: "flex-end"
    }
  };

  // Calculate stats
  const totalMaterials = materials.reduce((sum, group) => sum + group.items.length, 0);
  const totalTests = tests.length;

  if (loading) {
    return (
      <div style={styles.page}>
        <Card style={{ borderRadius: 16, textAlign: "center", padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading class records...</div>
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
              📚 {classInfo?.subjectName || "Class"} Records
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
              {classInfo?.form} • Academic Year {academicYear}
            </Text>
          </div>
          <Flex gap={16}>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 700, color: classColor }}>{totalMaterials}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Materials</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ fontSize: 24, fontWeight: 700, color: classColor }}>{totalTests}</div>
              <div style={{ fontSize: 12, color: "#666" }}>Tests</div>
            </div>
          </Flex>
        </Flex>
      </div>

      <Tabs
        items={[
          {
            key: "materials",
            label: (
              <span>
                <FileTextOutlined /> Study Materials ({totalMaterials})
              </span>
            ),
            children: materials.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: "center", padding: 60 }}>
                <Empty 
                  description="No study materials for this class/year"
                  image={<FileTextOutlined style={{ fontSize: 60, color: classColor }} />}
                />
              </Card>
            ) : (
              <>
                <Collapse 
                  defaultActiveKey={[getPaginatedMaterials()[0]?.date]}
                  expandIconPosition="end"
                  style={{ background: "transparent", border: "none" }}
                >
                  {getPaginatedMaterials().map((g, idx) => (
                    <Panel
                      header={
                        <div style={styles.panelHeader}>
                          <CalendarOutlined /> {g.date}
                          <Tag color={classColor} style={{ marginLeft: 8 }}>{g.items.length} items</Tag>
                        </div>
                      }
                      key={idx}
                      style={{ 
                        marginBottom: 16, 
                        borderRadius: 12,
                        background: "#fff",
                        border: `1px solid ${classColor}20`
                      }}
                    >
                      {g.items.map((m) => (
                        <Card 
                          key={m.materialId} 
                          size="small" 
                          style={styles.materialCard}
                          hoverable
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateX(4px)";
                            e.currentTarget.style.boxShadow = `0 4px 12px ${classColor}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateX(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                            <Flex align="center" gap={12} style={{ flex: 1 }}>
                              {getFileIcon(m.fileType, 32)}
                              <div style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: 15, color: classColor }}>
                                  {m.title}
                                </Text>
                                {m.description && (
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>{m.description}</Text></div>
                                )}
                                <Flex gap={8} style={{ marginTop: 6 }}>
                                  <Tag color="purple" style={{ fontSize: 11 }}>{m.fileType.toUpperCase()}</Tag>
                                  <Tag color="blue" style={{ fontSize: 11 }}>
                                    <UserOutlined /> {m.uploadedBy || "Unknown"}
                                  </Tag>
                                </Flex>
                              </div>
                            </Flex>
                            <Tooltip title={m.fileType === 'link' ? 'Open Link' : 'Open File'}>
                              <Button
                                type="primary"
                                size="small"
                                icon={m.fileType === 'link' ? <LinkOutlined /> : <EyeOutlined />}
                                onClick={() => handleOpenFile(m)}
                                style={{ 
                                  background: classColor, 
                                  borderColor: classColor,
                                  borderRadius: 20
                                }}
                              >
                                {m.fileType === 'link' ? 'Open' : 'Open'}
                              </Button>
                            </Tooltip>
                          </Flex>
                        </Card>
                      ))}
                    </Panel>
                  ))}
                </Collapse>
                
                {/* Pagination for Materials */}
                <div style={styles.paginationContainer}>
                  <Pagination
                    current={materialsCurrentPage}
                    pageSize={materialsPageSize}
                    total={materials.length}
                    showSizeChanger={true}
                    showTotal={(total) => `Total ${total} material groups`}
                    pageSizeOptions={['10', '20', '50', '100']}
                    onChange={(page, newPageSize) => {
                      setMaterialsCurrentPage(page);
                      if (newPageSize !== materialsPageSize) {
                        setMaterialsPageSize(newPageSize);
                        setMaterialsCurrentPage(1);
                      }
                    }}
                    onShowSizeChange={(current, size) => {
                      setMaterialsPageSize(size);
                      setMaterialsCurrentPage(1);
                    }}
                  />
                </div>
              </>
            ),
          },
          {
            key: "tests",
            label: (
              <span>
                <FileTextOutlined /> Test Marks ({totalTests})
              </span>
            ),
            children: tests.length === 0 ? (
              <Card style={{ borderRadius: 16, textAlign: "center", padding: 60 }}>
                <Empty 
                  description="No test marks for this class/year"
                  image={<FileTextOutlined style={{ fontSize: 60, color: classColor }} />}
                />
              </Card>
            ) : (
              <>
                <Collapse 
                  defaultActiveKey={[getPaginatedTests()[0]?.testName]}
                  expandIconPosition="end"
                  style={{ background: "transparent", border: "none" }}
                >
                  {getPaginatedTests().map((t, idx) => {
                    const average = t.marks.reduce((sum, m) => sum + m.mark, 0) / t.marks.length;
                    const highest = Math.max(...t.marks.map(m => m.mark));
                    const lowest = Math.min(...t.marks.map(m => m.mark));
                    
                    return (
                      <Panel
                        header={
                          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ flex: 1 }}>
                            <div>
                              <Text strong style={{ color: classColor, fontSize: 16 }}>
                                {t.testName}
                              </Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  <CalendarOutlined /> {dayjs(t.testDate).format("MMMM D, YYYY")}
                                </Text>
                              </div>
                            </div>
                            <Flex gap={16}>
                              <div style={{ textAlign: "center" }}>
                                <Tag color="blue">Average</Tag>
                                <div style={{ fontWeight: 600, color: "#1890ff" }}>{average.toFixed(1)}%</div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <Tag color="green">Highest</Tag>
                                <div style={{ fontWeight: 600, color: "#52c41a" }}>{highest}%</div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <Tag color="orange">Lowest</Tag>
                                <div style={{ fontWeight: 600, color: "#fa8c16" }}>{lowest}%</div>
                              </div>
                            </Flex>
                          </Flex>
                        }
                        key={idx}
                        style={{ 
                          marginBottom: 16, 
                          borderRadius: 12,
                          background: "#fff",
                          border: `1px solid ${classColor}20`,
                          overflow: "hidden"
                        }}
                      >
                        <div style={{ padding: "16px 20px" }}>
                          <Table
                            rowKey="markId"
                            dataSource={t.marks}
                            pagination={false}
                            size="small"
                            columns={[
                              { 
                                title: "Student", 
                                dataIndex: "studentName",
                                render: (text) => <Text strong>{text}</Text>
                              },
                              { 
                                title: "Mark", 
                                dataIndex: "mark", 
                                render: (v) => {
                                  let color = "#52c41a";
                                  if (v < 50) color = "#f5222d";
                                  else if (v < 70) color = "#fa8c16";
                                  return <Text strong style={{ color, fontSize: 16 }}>{v}%</Text>;
                                },
                                align: "center"
                              },
                              {
                                title: "Performance",
                                key: "performance",
                                render: (_, record) => {
                                  if (record.mark >= 80) return <Tag color="green">A - Excellent</Tag>;
                                  if (record.mark >= 70) return <Tag color="cyan">B - Very Good</Tag>;
                                  if (record.mark >= 60) return <Tag color="blue">C - Good</Tag>;
                                  if (record.mark >= 50) return <Tag color="orange">D - Average</Tag>;
                                  return <Tag color="red">F - Needs Improvement</Tag>;
                                }
                              }
                            ]}
                          />
                        </div>
                      </Panel>
                    );
                  })}
                </Collapse>
                
                {/* Pagination for Tests */}
                <div style={styles.paginationContainer}>
                  <Pagination
                    current={testsCurrentPage}
                    pageSize={testsPageSize}
                    total={tests.length}
                    showSizeChanger={true}
                    showTotal={(total) => `Total ${total} tests`}
                    pageSizeOptions={['10', '20', '50', '100']}
                    onChange={(page, newPageSize) => {
                      setTestsCurrentPage(page);
                      if (newPageSize !== testsPageSize) {
                        setTestsPageSize(newPageSize);
                        setTestsCurrentPage(1);
                      }
                    }}
                    onShowSizeChange={(current, size) => {
                      setTestsPageSize(size);
                      setTestsCurrentPage(1);
                    }}
                  />
                </div>
              </>
            ),
          },
        ]}
        tabBarStyle={{ 
          backgroundColor: "#fff", 
          padding: "8px 16px",
          borderRadius: 12,
          marginBottom: 20
        }}
      />
    </div>
  );
};

export default PastClassAcademicView;