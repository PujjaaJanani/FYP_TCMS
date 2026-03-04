import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Card, message, Typography, Flex, Upload, Row, Col, Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AddMaterial = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [fileType, setFileType] = useState('pdf');
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  
  // Get the preselected class ID from navigation state
  const preselectedClassId = location.state?.preselectedClassId;
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor;

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    setPageLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/study-materials/my-classes', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) {
        setClasses(res.data.data);
        
        if (res.data.data.length === 0) {
          message.warning('You are not assigned to any classes yet');
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      message.error('Failed to load your classes');
    } finally {
      setPageLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('fileType', fileType);
    formData.append('classId', preselectedClassId);
    formData.append('authorityId', user.id);

    if (fileType === 'link') {
      formData.append('fileUrl', values.fileUrl);
    } else if (fileList.length > 0) {
      formData.append('file', fileList[0]);
    }

    try {
      const res = await axios.post(
        'http://localhost:8000/api/study-materials',
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (res.data.success) {
        message.success('Material uploaded successfully!');
        // Navigate back to the class materials page with class info and color
        // Use the original classInfo from props instead of finding it again
        navigate(`/staff/materials/class/${preselectedClassId}`, {
          state: { 
            classInfo: classInfo, // Use the original classInfo from props
            classColor: classColor
          }
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      message.error(err.response?.data?.message || 'Failed to upload material');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{
        padding: '24px',
        height: '100vh',
        width: '100%',
        background: '#f7f5ff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      height: '100%',
      width: '100%',
      background: '#f7f5ff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (preselectedClassId) {
              navigate(`/staff/materials/class/${preselectedClassId}`, {
                state: { 
                  classInfo: classInfo, // Use the original classInfo from props
                  classColor: classColor
                }
              });
            } else {
              navigate('/staff/materials');
            }
          }}
        >
          Back
        </Button>
      </div>

      <Row justify="center">
        <Col xs={24} sm={24} md={22} lg={20} xl={18}>
          <Card style={{
            width: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: 8
          }}>
            <Title level={4} style={{ 
              color: '#3b1fa3', 
              marginBottom: 24,
              borderBottom: '2px solid #3b1fa3',
              paddingBottom: 12,
              textAlign: 'left'
            }}>
              Upload New Material {classInfo ? `for ${classInfo.subjectName}` : ''}
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
              initialValues={{
                fileType: 'pdf'
              }}
            >
              <Row gutter={[24, 16]}>
                <Col xs={24}>
                  <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true, message: 'Please enter title' }]}
                  >
                    <Input placeholder="e.g., Chapter 1 notes" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item label="Description" name="description">
                    <TextArea rows={3} placeholder="Optional description" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Type"
                    name="fileType"
                    rules={[{ required: true }]}
                  >
                    <Select onChange={setFileType}>
                      <Option value="pdf">PDF Document</Option>
                      <Option value="image">Image</Option>
                      <Option value="video">Video</Option>
                      <Option value="zip">ZIP Archive</Option>
                      <Option value="link">External Link</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {fileType !== 'link' ? (
                    <Form.Item
                      label="File"
                      required
                      rules={[{ required: true, message: 'Please upload a file' }]}
                    >
                      <Upload
                        beforeUpload={(file) => {
                          setFileList([file]);
                          return false;
                        }}
                        onRemove={() => setFileList([])}
                        fileList={fileList.map(f => ({ name: f.name, uid: f.uid }))}
                        maxCount={1}
                      >
                        <Button icon={<UploadOutlined />} size="large">
                          Select File (Max 50MB)
                        </Button>
                      </Upload>
                    </Form.Item>
                  ) : (
                    <Form.Item
                      label="URL"
                      name="fileUrl"
                      rules={[
                        { required: true, message: 'Please enter URL' },
                        { type: 'url', message: 'Please enter a valid URL' }
                      ]}
                    >
                      <Input placeholder="https://..." />
                    </Form.Item>
                  )}
                </Col>

                <Col xs={24}>
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Flex gap={8} wrap="wrap" justify="center">
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={loading}
                        style={{ 
                          background: '#52c41a', 
                          borderColor: '#52c41a',
                          minWidth: 140
                        }}
                      >
                        Upload Material
                      </Button>
                      <Button 
                        onClick={() => {
                          if (preselectedClassId) {
                            navigate(`/staff/materials/class/${preselectedClassId}`, {
                              state: { 
                                classInfo: classInfo,
                                classColor: classColor
                              }
                            });
                          } else {
                            navigate('/staff/materials');
                          }
                        }}
                        style={{ minWidth: 100 }}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AddMaterial;