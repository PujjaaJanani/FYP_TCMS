import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Card, message, Typography, Flex, Upload, Row, Col, Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ALLOWED_TYPES = {
  pdf:   { mimes: ['application/pdf'], exts: ['.pdf'], label: 'PDF (.pdf)' },
  image: { mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'], exts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'], label: 'Image (.jpg, .jpeg, .png, .gif, .webp, .svg)' },
  // video: { mimes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'], exts: ['.mp4', '.webm', '.ogg', '.mov', '.avi'], label: 'Video (.mp4, .webm, .ogg, .mov, .avi)' },
  zip:   { mimes: ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed'], exts: ['.zip', '.rar', '.7z'], label: 'Archive (.zip, .rar, .7z)' },
};

const validateFileType = (file, selectedType) => {
  const allowed = ALLOWED_TYPES[selectedType];
  if (!allowed) return true;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const mimeOk = allowed.mimes.includes(file.type);
  const extOk  = allowed.exts.includes(ext);
  if (!mimeOk && !extOk) {
    message.error(`Invalid file type. For "${selectedType}" please upload: ${allowed.label}`);
    return false;
  }
  return true;
};

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
  
  const preselectedClassId = location.state?.preselectedClassId;
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor;

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    setPageLoading(true);
    try {
      const res = await axios.get(apiUrl('/api/study-materials/my-classes'), {
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
    // Academic year will be set automatically on the backend

    if (fileType === 'link') {
      formData.append('fileUrl', values.fileUrl);
    } else if (fileList.length > 0) {
      formData.append('file', fileList[0]);
    }

    try {
      const res = await axios.post(
        apiUrl('/api/study-materials'),
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
        navigate(`/staff/materials/class/${preselectedClassId}`, {
          state: { 
            classInfo: classInfo,
            classColor: classColor
          }
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstErrorKey = Object.keys(errors)[0];
        const firstError = errors[firstErrorKey][0];
        message.error(`Validation error: ${firstError}`);
      } else if (err.response?.data?.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Failed to upload material');
      }
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
                  classInfo: classInfo,
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
                    <Select onChange={(val) => { setFileType(val); setFileList([]); }}>
                      <Option value="pdf">PDF Document</Option>
                      <Option value="image">Image</Option>
                      {/* <Option value="video">Video</Option> */}
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
                          const valid = validateFileType(file, fileType);
                          if (valid) setFileList([file]);
                          return false;
                        }}
                        onRemove={() => setFileList([])}
                        fileList={fileList.map(f => ({ name: f.name, uid: f.uid }))}
                        maxCount={1}
                        accept={ALLOWED_TYPES[fileType]?.exts.join(',')}
                      >
                        <Button icon={<UploadOutlined />} size="large">
                          Select File (Max 50MB)
                        </Button>
                      </Upload>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                        Max file size: 50MB
                      </Typography.Text>
                      {ALLOWED_TYPES[fileType] && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                          Accepted: {ALLOWED_TYPES[fileType].label}
                        </Typography.Text>
                      )}
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
