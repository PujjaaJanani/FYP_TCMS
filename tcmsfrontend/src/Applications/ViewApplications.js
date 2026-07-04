// src/Pages/ViewApplications.jsx
import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Descriptions,
  message, Typography, Card, Input, Flex
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, EyeOutlined, ReloadOutlined,
  UserOutlined, CalendarOutlined
} from '@ant-design/icons';
import api from '../api/axios';
import { getToken } from '../Utils/LocalStorage';
import { apiUrl } from '../api';

const { Title, Text } = Typography;

const ViewApplications = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, record: null });
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchText, setSearchText] = useState('');

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/registrations', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data.success) {
        setRegistrations(res.data.data);
      }
    } catch {
      message.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, []);

  const handleApprove = (registrationId) => {
    Modal.confirm({
      title: 'Approve Registration',
      content: 'Are you sure you want to approve this registration?',
      okText: 'Yes, Approve',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(registrationId + 'Approved');
        try {
          const res = await api.patch(
            `/api/registrations/${registrationId}/status`,
            { status: 'Approved' },
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (res.data.success) {
            message.success('Registration approved successfully');
            setRegistrations(prev =>
              prev.map(r =>
                r.registrationId === registrationId ? { ...r, status: 'Approved' } : r
              )
            );
            if (detailModal.record?.registrationId === registrationId) {
              setDetailModal(prev => ({
                ...prev,
                record: { ...prev.record, status: 'Approved' }
              }));
            }
          }
        } catch {
          message.error('Failed to approve registration');
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleReject = (registrationId) => {
    Modal.confirm({
      title: 'Reject Registration',
      content: 'Are you sure you want to reject this registration?',
      okText: 'Yes, Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(registrationId + 'Rejected');
        try {
          const res = await api.patch(
            `/api/registrations/${registrationId}/status`,
            { status: 'Rejected' },
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );
          if (res.data.success) {
            message.success('Registration rejected successfully');
            setRegistrations(prev =>
              prev.map(r =>
                r.registrationId === registrationId ? { ...r, status: 'Rejected' } : r
              )
            );
            if (detailModal.record?.registrationId === registrationId) {
              setDetailModal(prev => ({
                ...prev,
                record: { ...prev.record, status: 'Rejected' }
              }));
            }
          }
        } catch {
          message.error('Failed to reject registration');
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const statusTag = (status) => {
    const colors = { Pending: 'gold', Approved: 'green', Rejected: 'red' };
    return <Tag color={colors[status] || 'default'} style={{ fontWeight: 600 }}>{status}</Tag>;
  };

  const displayed = registrations.filter(r => {
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    const q = searchText.toLowerCase();
    return matchStatus && (r.studentName.toLowerCase().includes(q) || r.studentEmail.toLowerCase().includes(q));
  });

  const counts = {
    All: registrations.length,
    Pending: registrations.filter(r => r.status === 'Pending').length,
    Approved: registrations.filter(r => r.status === 'Approved').length,
    Rejected: registrations.filter(r => r.status === 'Rejected').length,
  };

  const styles = {
    page: { padding: '28px 32px', minHeight: '100vh', background: '#f7f5ff' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    summaryCard: { borderRadius: 12, textAlign: 'center', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    summaryCardActive: { borderColor: '#3b1fa3', transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(59, 31, 163, 0.15)' },
    summaryCount: { fontSize: 38, fontWeight: 800, lineHeight: 1, marginBottom: 6 },
    summaryLabel: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: '#999' },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: '#3b1fa3', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
    classCard: { background: '#f5f0ff', border: '1px solid #d3adf7', borderRadius: 8, padding: '12px 16px' },
    classSubject: { fontWeight: 700, fontSize: 14, color: '#3b1fa3', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    classForm: { fontSize: 11, fontWeight: 500, background: '#3b1fa3', color: '#fff', borderRadius: 4, padding: '1px 7px' },
    classDetail: { fontSize: 13, color: '#555' }
  };

  const columns = [
    { title: 'ID', dataIndex: 'registrationId', width: 60 },
    {
      title: 'Student',
      key: 'student',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.studentName}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.studentEmail}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.studentPhone}</div>
        </div>
      ),
    },
    {
      title: 'Classes Registered',
      key: 'classes',
      render: (_, r) => (
        <Flex vertical gap={2}>
          {r.classes.map((cls, i) => (
            <Tag key={i} color="purple" style={{ fontSize: 11, margin: 0 }}>
              {cls.subjectName} ({cls.form}) • {cls.classDay} {cls.startTime}–{cls.finishTime}
            </Tag>
          ))}
        </Flex>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: v => new Date(v).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }),
      width: 110,
    },
    { title: 'Status', dataIndex: 'status', render: statusTag, width: 100 },
    {
      title: 'Action',
      key: 'action',
      width: 220,
      render: (_, r) => (
        <Flex gap={8}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailModal({ open: true, record: r })}>
            View
          </Button>
          {r.status === 'Pending' && (
            <>
              <Button 
                size="small" 
                type="primary" 
                icon={<CheckCircleOutlined />} 
                loading={actionLoading === r.registrationId + 'Approved'} 
                onClick={() => handleApprove(r.registrationId)} 
                style={{ background: '#389e0d', borderColor: '#389e0d' }}
              >
                Approve
              </Button>
              <Button 
                size="small" 
                danger 
                icon={<CloseCircleOutlined />} 
                loading={actionLoading === r.registrationId + 'Rejected'} 
                onClick={() => handleReject(r.registrationId)}
              >
                Reject
              </Button>
            </>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Title level={3} style={{ margin: 0, color: '#3b1fa3' }}>Student Registrations</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchRegistrations} loading={loading}>Refresh</Button>
      </div>

      <div className="summary-grid">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <Card key={s} hoverable onClick={() => setFilterStatus(s)} style={{ ...styles.summaryCard, ...(filterStatus === s ? styles.summaryCardActive : {}) }}>
            <div style={{ ...styles.summaryCount, color: s === 'All' ? '#3b1fa3' : s === 'Pending' ? '#d48806' : s === 'Approved' ? '#389e0d' : '#cf1322' }}>
              {counts[s]}
            </div>
            <div style={styles.summaryLabel}>{s}</div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="Search by student name or email…" value={searchText} onChange={e => setSearchText(e.target.value)} allowClear style={{ width: 300 }} />
      </div>

      <Table 
        dataSource={displayed} 
        columns={columns} 
        rowKey="registrationId" 
        loading={loading} 
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} registrations`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: loading ? 'Loading...' : 'No registrations found' }}
      />

      <Modal 
        title={<span style={{ color: '#3b1fa3', fontWeight: 700, fontSize: 18 }}>Registration #{detailModal.record?.registrationId}</span>} 
        open={detailModal.open} 
        onCancel={() => setDetailModal({ open: false, record: null })} 
        footer={detailModal.record?.status === 'Pending' ? (
          <Flex gap={8}>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              loading={actionLoading === detailModal.record?.registrationId + 'Approved'} 
              onClick={() => {
                setDetailModal({ open: false, record: null });
                handleApprove(detailModal.record.registrationId);
              }} 
              style={{ background: '#389e0d', borderColor: '#389e0d' }}
            >
              Approve
            </Button>
            <Button 
              danger 
              icon={<CloseCircleOutlined />} 
              loading={actionLoading === detailModal.record?.registrationId + 'Rejected'} 
              onClick={() => {
                setDetailModal({ open: false, record: null });
                handleReject(detailModal.record.registrationId);
              }}
            >
              Reject
            </Button>
            <Button onClick={() => setDetailModal({ open: false, record: null })}>Close</Button>
          </Flex>
        ) : (
          <Button onClick={() => setDetailModal({ open: false, record: null })}>Close</Button>
        )} 
        width={640}
      >
        {detailModal.record && (
          <>
            <div style={styles.sectionTitle}><UserOutlined /> Student Details</div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Name" span={2}><Text strong>{detailModal.record.studentName}</Text></Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{detailModal.record.studentEmail}</Descriptions.Item>
              <Descriptions.Item label="Parent Email" span={2}>{detailModal.record.parentEmail || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{detailModal.record.studentPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Registered On">{new Date(detailModal.record.createdAt).toLocaleString('en-MY')}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{detailModal.record.studentAddress || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>{statusTag(detailModal.record.status)}</Descriptions.Item>
            </Descriptions>
            <div style={styles.sectionTitle}><CalendarOutlined /> Classes Enrolled ({detailModal.record.classes.length})</div>
            <Flex vertical gap={8}>
              {detailModal.record.classes.map((cls, i) => (
                <div key={i} style={styles.classCard}>
                  <div style={styles.classSubject}>{cls.subjectName}<span style={styles.classForm}>{cls.form}</span></div>
                  <div style={styles.classDetail}>🗓 {cls.classDay} &nbsp;|&nbsp; 🕐 {cls.startTime} – {cls.finishTime}{cls.teacher && <span> &nbsp;|&nbsp; 👤 {cls.teacher}</span>}</div>
                </div>
              ))}
            </Flex>
          </>
        )}
      </Modal>

      <style>{`
        .ant-table-tbody > tr.ant-table-row:hover > td { background: #f0f0f0 !important; }
        
        @media (max-width: 768px) { 
          .ant-table { font-size: 12px; }
        }
        
        /* Responsive summary cards grid */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .summary-grid {
            grid-template-columns: repeat(1, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewApplications;
