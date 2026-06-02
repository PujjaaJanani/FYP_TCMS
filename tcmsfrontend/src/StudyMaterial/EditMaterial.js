import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Card, message, Typography, Flex, Upload, Spin, Row, Col
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getToken, getUser } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ALLOWED_TYPES = {
  pdf:   { mimes: ['application/pdf'], exts: ['.pdf'], label: 'PDF (.pdf)' },
  image: { mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'], exts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'], label: 'Image (.jpg, .jpeg, .png, .gif, .webp, .svg)' },
  video: { mimes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'], exts: ['.mp4', '.webm', '.ogg', '.mov', '.avi'], label: 'Video (.mp4, .webm, .ogg, .mov, .avi)' },
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

const EditMaterial = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [fileType, setFileType] = useState('pdf');
  const [currentClassId, setCurrentClassId] = useState(null);
  const navigate = useNavigate();
  const { materialId } = useParams();
  const location = useLocation();
  const classInfo = location.state?.classInfo;
  const classColor = location.state?.classColor;

  useEffect(() => {
    fetchData();
  }, [materialId]);

  const fetchData = async () => {
    setPageLoading(true);
    try {
      const [classesRes, materialRes] = await Promise.all([
        axios.get(apiUrl('/api/study-materials/my-classes'), {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get(apiUrl(`/api/study-materials/${materialId}`), {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);

      if (classesRes.data.success) setClasses(classesRes.data.data);
      
      if (materialRes.data.success) {
        const material = materialRes.data.data;
        
        // Verify this material belongs to the logged-in user
        if (material.authorityId !== parseInt(getUser().id)) {
          message.error('You can only edit your own materials');
          navigate('/staff/materials');
          return;
        }
        
        setCurrentClassId(material.classId);
        setFileType(material.fileType);
        form.setFieldsValue({
          title: material.title,
          description: material.description,
          fileType: material.fileType,
          fileUrl: material.fileType === 'link' ? material.fileUrl : undefined
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load material');
      navigate('/staff/materials');
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
    formData.append('classId', currentClassId);
    // Academic year will be set automatically on the backend

    if (fileType === 'link') {
      formData.append('fileUrl', values.fileUrl);
    } else if (fileList.length > 0) {
      formData.append('file', fileList[0]);
    }

    try {
      const res = await axios.post(
        apiUrl(`/api/study-materials/${materialId}?_method=PUT`),
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (res.data.success) {
        message.success('Material updated successfully!');
        navigate(`/staff/materials/class/${currentClassId}`, {
          state: { 
            classInfo: classInfo,
            classColor: classColor
          }
        });
      }
    } catch (err) {
      console.error('Update error:', err);
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstErrorKey = Object.keys(errors)[0];
        const firstError = errors[firstErrorKey][0];
        message.error(`Validation error: ${firstError}`);
      } else if (err.response?.data?.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Failed to update material');
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
            if (currentClassId) {
              navigate(`/staff/materials/class/${currentClassId}`, {
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
              Edit Material
            </Title>

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
            >
              <Row gutter={[24, 16]}>
                <Col xs={24}>
                  <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true, message: 'Please enter title' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item label="Description" name="description">
                    <TextArea rows={3} />
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
                      <Option value="video">Video</Option>
                      <Option value="zip">ZIP Archive</Option>
                      <Option value="link">External Link</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {fileType !== 'link' ? (
                    <Form.Item label="Replace File (Optional)">
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
                          Upload New File
                        </Button>
                      </Upload>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                        Leave empty to keep existing file
                      </Typography.Text>
                      {ALLOWED_TYPES[fileType] && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
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
                      <Input />
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
                        Update Material
                      </Button>
                      <Button 
                        onClick={() => {
                          if (currentClassId) {
                            navigate(`/staff/materials/class/${currentClassId}`, {
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

export default EditMaterial;
