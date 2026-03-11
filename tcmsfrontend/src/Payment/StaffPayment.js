import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Select, DatePicker, Input, message, Card, Row, Col, Statistic, Tag, Space, Typography, Flex
} from 'antd';
import {
  EditOutlined, DollarOutlined, CheckCircleOutlined, 
  ClockCircleOutlined, LeftOutlined, RightOutlined, 
  ReloadOutlined, SearchOutlined, UserOutlined, CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { MonthPicker } = DatePicker;

const StaffPayment = () => {
  const [loading, setLoading] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidCount: 0,
    pendingCount: 0,
    totalAmount: 0,
    paidAmount: 0
  });
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    paymentId: null,
    studentId: null,
    amount: 0,
    paymentStatus: 'Pending',
    method: '',
    datePaid: null
  });

  const fetchStudentsPaymentStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/staff/payments/students-month?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        const data = res.data.data;
        setStudentsData(data.students);
        setFilteredData(data.students);
        
        const paid = data.students.filter(s => s.paymentStatus === 'Paid');
        const paidAmount = paid.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
        
        setStats({
          totalStudents: data.totalStudents,
          paidCount: data.paidCount,
          pendingCount: data.pendingCount,
          totalAmount: data.students.reduce((sum, s) => sum + parseFloat(s.monthlyFee || 0), 0),
          paidAmount: paidAmount
        });
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load students payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsPaymentStatus();
  }, [year, month]);

  useEffect(() => {
    if (!searchText) {
      setFilteredData(studentsData);
    } else {
      const lowerSearch = searchText.toLowerCase();
      const filtered = studentsData.filter(student => 
        student.studentName?.toLowerCase().includes(lowerSearch) ||
        student.email?.toLowerCase().includes(lowerSearch) ||
        student.classes?.toLowerCase().includes(lowerSearch)
      );
      setFilteredData(filtered);
    }
  }, [searchText, studentsData]);

  // Effect to clear datePaid and method when status changes to Pending
  useEffect(() => {
    if (editForm.paymentStatus === 'Pending') {
      setEditForm(prev => ({ 
        ...prev, 
        datePaid: null,
        method: '' // Clear method when status is Pending
      }));
    }
  }, [editForm.paymentStatus]);

  const handleYearChange = (newYear) => {
    setYear(newYear);
  };

  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
  };

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    const currentDate = moment();
    const currentYear = currentDate.year();
    const currentMonth = currentDate.month() + 1;
    
    // Don't allow going to future months
    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      message.info('Cannot view future months');
      return;
    }
    
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleEdit = (record) => {
    setSelectedStudent(record);
    setEditForm({
      paymentId: record.paymentId,
      studentId: record.studentId,
      amount: record.amount || record.monthlyFee,
      paymentStatus: record.paymentStatus,
      method: record.paymentStatus === 'Paid' ? (record.method || '') : '', // Only set method if status is Paid
      datePaid: record.paymentStatus === 'Paid' && record.datePaid ? moment(record.datePaid) : null
    });
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        studentId: editForm.studentId,
        month: month,
        year: year,
        amount: editForm.amount,
        paymentStatus: editForm.paymentStatus,
        method: editForm.paymentStatus === 'Paid' ? editForm.method : null, // Only send method if Paid
        datePaid: editForm.paymentStatus === 'Paid' && editForm.datePaid 
          ? editForm.datePaid.startOf('day').format('YYYY-MM-DD HH:mm:ss') 
          : null
      };

      const res = await axios.post(
        'http://localhost:8000/api/staff/payments/student-payment',
        payload,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success) {
        message.success('Payment updated successfully');
        setModalVisible(false);
        setSelectedStudent(null);
        fetchStudentsPaymentStatus();
      }
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to save payment');
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setSelectedStudent(null);
  };

  // Helper function to clean class names (remove duplicate "Form")
  const formatClassName = (className) => {
    // Check if the className already contains "Form"
    if (className.includes('Form')) {
      return className;
    }
    return className;
  };

  // Columns with larger text and responsive design
  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'studentId', 
      width: 70,
      sorter: (a, b) => a.studentId - b.studentId,
      align: 'center',
      render: (id) => <span style={{ fontSize: 13, fontWeight: 500 }}>{id}</span>
    },
    {
      title: 'Student',
      key: 'student',
      width: 200,
      sorter: (a, b) => a.studentName?.localeCompare(b.studentName),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{record.studentName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.email}</div>
        </div>
      )
    },
    {
      title: 'Classes',
      key: 'classes',
      width: 250,
      render: (_, record) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {record.classes.split(', ').map((cls, i) => (
            <Tag key={i} color="purple" style={{ fontSize: 12, margin: 0, padding: '2px 8px' }}>
              {formatClassName(cls)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Fee',
      dataIndex: 'monthlyFee',
      key: 'monthlyFee',
      width: 80,
      align: 'right',
      render: (fee) => <span style={{ fontSize: 13, fontWeight: 500 }}>RM{parseFloat(fee || 0).toFixed(2)}</span>,
      sorter: (a, b) => a.monthlyFee - b.monthlyFee
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 80,
      align: 'right',
      render: (amount, record) => (
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          RM{parseFloat(amount || record.monthlyFee || 0).toFixed(2)}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 90,
      align: 'center',
      render: (status) => {
        const colors = { Paid: 'green', Pending: 'gold' };
        return (
          <Tag color={colors[status]} style={{ fontWeight: 600, fontSize: 12, padding: '2px 10px' }}>
            {status}
          </Tag>
        );
      },
      filters: [
        { text: 'Paid', value: 'Paid' },
        { text: 'Pending', value: 'Pending' },
      ],
      onFilter: (value, record) => record.paymentStatus === value,
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method) => <span style={{ fontSize: 13 }}>{method || '-'}</span>
    },
    {
      title: 'Date Paid',
      dataIndex: 'datePaid',
      key: 'datePaid',
      width: 100,
      render: (date) => date ? <span style={{ fontSize: 13 }}>{moment(date).format('DD/MM/YYYY')}</span> : '-',
      sorter: (a, b) => {
        if (!a.datePaid) return 1;
        if (!b.datePaid) return -1;
        return moment(a.datePaid).unix() - moment(b.datePaid).unix();
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          size="middle"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          style={{ background: '#3b1fa3', borderColor: '#3b1fa3', height: 32, fontSize: 13 }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const styles = {
    page: { 
      padding: '24px 28px', 
      minHeight: '100vh', 
      background: '#f7f5ff' 
    },
    header: { 
      textAlign: 'center',
      marginBottom: 24
    },
    yearMonthSelector: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24
    },
    summaryGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gap: 14, 
      marginBottom: 20
    },
    summaryCard: { 
      borderRadius: 10, 
      textAlign: 'center', 
      cursor: 'pointer', 
      border: '2px solid transparent', 
      transition: 'all 0.2s ease', 
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    },
    summaryCount: { 
      fontSize: 32, 
      fontWeight: 700, 
      lineHeight: 1, 
      marginBottom: 4 
    },
    summaryLabel: { 
      fontSize: 12, 
      fontWeight: 600, 
      textTransform: 'uppercase', 
      letterSpacing: 0.6, 
      color: '#999' 
    },
    filterCard: { 
      marginBottom: 20, 
      padding: '12px 16px', 
      background: '#fff', 
      borderRadius: 8,
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
    },
    searchContainer: {
      marginBottom: 16
    },
    monthNavigator: { 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      flexWrap: 'wrap'
    },
    tableContainer: {
      background: '#fff',
      borderRadius: 10,
      padding: '16px 20px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: '#3b1fa3',
      marginBottom: 8
    },
    modalSection: {
      marginBottom: 16,
      background: '#f9f9fc',
      padding: 16,
      borderRadius: 8,
      border: '1px solid #f0f0f5'
    },
    modalSectionTitle: {
      fontSize: 14,
      fontWeight: 600,
      color: '#3b1fa3',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    },
    infoRow: {
      display: 'flex',
      marginBottom: 8,
      padding: '4px 0'
    },
    infoLabel: {
      width: 100,
      color: '#666',
      fontSize: 13
    },
    infoValue: {
      flex: 1,
      fontWeight: 500,
      color: '#333'
    },
    summaryCardBody: {
      padding: '16px 8px'
    }
  };

  const summaryCards = [
    { key: 'total', label: 'Total Students', value: stats.totalStudents, color: '#3b1fa3' },
    { key: 'paid', label: 'Paid Count', value: stats.paidCount, color: '#389e0d' },
    { key: 'pending', label: 'Pending Count', value: stats.pendingCount, color: '#d48806' },
    { key: 'amount', label: 'Paid (RM)', value: stats.paidAmount.toFixed(2), color: '#389e0d' }
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Title level={2} style={{ margin: 0, color: '#3b1fa3' }}>
          MONTHLY STUDENT PAYMENTS
        </Title>
        <Title level={4} style={{ margin: '8px 0 0 0', fontWeight: 400, color: '#666' }}>
          {monthNames[month - 1]} {year}
        </Title>
      </div>

      <div style={styles.yearMonthSelector}>
        <Button
          icon={<LeftOutlined />}
          onClick={goToPreviousMonth}
          size="large"
          style={{ borderRadius: 8 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Select 
            value={month} 
            onChange={handleMonthChange}
            style={{ width: 120 }}
            size="large"
          >
            {monthNames.map((name, index) => (
              <Option key={index + 1} value={index + 1}>{name}</Option>
            ))}
          </Select>
          <Select 
            value={year} 
            onChange={handleYearChange}
            style={{ width: 100 }}
            size="large"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <Option key={y} value={y}>{y}</Option>
            ))}
          </Select>
        </div>
        <Button
          icon={<RightOutlined />}
          onClick={goToNextMonth}
          size="large"
          style={{ borderRadius: 8 }}
        />
      </div>

      <div style={styles.summaryGrid} className="summary-grid">
        {summaryCards.map(item => (
          <Card 
            key={item.key} 
            style={styles.summaryCard} 
            hoverable 
            styles={{ body: styles.summaryCardBody }}
          >
            <div style={{ ...styles.summaryCount, color: item.color }}>
              {item.value}
            </div>
            <div style={styles.summaryLabel}>{item.label}</div>
          </Card>
        ))}
      </div>

      <div style={styles.searchContainer}>
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="Search by student name, email or class…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 300 }}
        />
      </div>

      <div style={styles.tableContainer}>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="studentId"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} students`,
            pageSizeOptions: ['15', '30', '50'],
            size: 'default'
          }}
          scroll={{ x: '100%' }}
          size="middle"
          bordered={false}
          showHeader={true}
          tableLayout="auto"
          rowClassName={() => 'payment-table-row'}
        />
      </div>

      {/* Edit Payment Modal */}
      <Modal
        title={
          <div style={styles.modalTitle}>
            Edit Payment
          </div>
        }
        open={modalVisible}
        onCancel={handleCancelModal}
        footer={[
          <Button key="cancel" onClick={handleCancelModal}>
            Cancel
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={handleSaveEdit}
            style={{ background: '#3b1fa3', borderColor: '#3b1fa3' }}
          >
            Save Changes
          </Button>,
        ]}
        width={550}
        centered
      >
        {selectedStudent && (
          <>
            {/* Student Information Section */}
            <div style={styles.modalSection}>
              <div style={styles.modalSectionTitle}>
                <UserOutlined /> Student Information
              </div>
              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>Name:</div>
                <div style={styles.infoValue}>{selectedStudent.studentName}</div>
              </div>
              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>Email:</div>
                <div style={styles.infoValue}>{selectedStudent.email}</div>
              </div>
              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>Classes:</div>
                <div style={styles.infoValue}>
                  <Flex wrap="wrap" gap="4px">
                    {selectedStudent.classes.split(', ').map((cls, i) => (
                      <Tag key={i} color="purple" style={{ margin: 0, fontSize: 12, padding: '2px 8px' }}>{formatClassName(cls)}</Tag>
                    ))}
                  </Flex>
                </div>
              </div>
            </div>

            {/* Payment Details Section */}
            <div style={styles.modalSection}>
              <div style={styles.modalSectionTitle}>
                <DollarOutlined /> Payment Details
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Month/Year</div>
                <Input 
                  value={`${monthNames[month - 1]} ${year}`} 
                  disabled 
                  style={{ background: '#f5f5f5', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Amount (RM)</div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                  prefix="RM"
                  placeholder="Enter amount"
                  style={{ fontSize: 13 }}
                />
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Status</div>
                  <Select
                    value={editForm.paymentStatus}
                    onChange={(value) => setEditForm({ ...editForm, paymentStatus: value })}
                    style={{ width: '100%' }}
                  >
                    <Option value="Pending">Pending</Option>
                    <Option value="Paid">Paid</Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Payment Method</div>
                  <Input
                    value={editForm.method}
                    onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                    placeholder={editForm.paymentStatus === 'Paid' ? "e.g., Cash, FPX" : "No method for pending"}
                    style={{ fontSize: 13 }}
                    disabled={editForm.paymentStatus !== 'Paid'}
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13 }}>Date Paid</div>
                <DatePicker
                  value={editForm.datePaid}
                  onChange={(date) => setEditForm({ ...editForm, datePaid: date })}
                  format="DD MMM YYYY"
                  style={{ width: '100%', fontSize: 13 }}
                  placeholder={editForm.paymentStatus === 'Paid' ? "Select date" : "No date required for pending"}
                  disabled={editForm.paymentStatus !== 'Paid'}
                />
                {editForm.paymentStatus === 'Paid' && !editForm.datePaid && (
                  <div style={{ fontSize: 12, color: '#faad14', marginTop: 4 }}>
                    Please select the payment date
                  </div>
                )}
                {editForm.paymentStatus === 'Pending' && (
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    Date and method will be cleared for pending payments
                  </div>
                )}
              </div>
            </div>

            {/* Original Payment Info (if editing existing) */}
            {selectedStudent.paymentId && (
              <div style={{ fontSize: 12, color: '#999', textAlign: 'right' }}>
                Payment ID: {selectedStudent.paymentId}
              </div>
            )}
          </>
        )}
      </Modal>

      <style>{`
        .payment-table-row:hover > td { 
          background: #f8f7ff !important; 
        }
        .ant-table-thead > tr > th { 
          background: transparent !important; 
          font-weight: 600; 
          color: #3b1fa3;
          border-bottom: 2px solid #eae0ff !important;
          padding: 14px 12px !important;
          font-size: 14px;
          white-space: nowrap;
        }
        .ant-table-tbody > tr > td { 
          border-bottom: 1px solid #f0f0f8 !important;
          padding: 14px 12px !important;
          font-size: 13px;
        }
        .ant-table.ant-table-middle .ant-table-tbody > tr > td {
          padding: 14px 12px !important;
        }
        .ant-table {
          background: transparent !important;
        }
        .ant-table-container {
          border: none !important;
        }
        .ant-table-content {
          overflow-x: auto !important;
        }
        .ant-pagination {
          margin-top: 20px !important;
          margin-bottom: 0 !important;
        }
        .ant-tag {
          border-radius: 4px;
          padding: 2px 8px;
          border: none;
          line-height: 20px;
          font-size: 12px;
        }
        .ant-tag-purple {
          background: #f3e8ff;
          color: #531dab;
        }
        .ant-card-body {
          padding: 16px;
        }
        .ant-modal-content {
          border-radius: 12px;
          overflow: hidden;
        }
        .ant-modal-header {
          border-bottom: 1px solid #f0f0f5;
          padding: 16px 24px;
        }
        .ant-modal-body {
          padding: 20px 24px;
        }
        .ant-modal-footer {
          border-top: 1px solid #f0f0f5;
          padding: 12px 24px;
        }
        
        /* Responsive styles for summary grid */
        @media (max-width: 768px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        /* Table responsive styles */
        @media (max-width: 768px) {
          .ant-table-thead > tr > th {
            padding: 12px 8px !important;
            font-size: 13px;
          }
          .ant-table-tbody > tr > td {
            padding: 12px 8px !important;
            font-size: 12px;
          }
          .ant-table-content {
            overflow-x: auto !important;
          }
        }
        
        @media (max-width: 576px) {
          .ant-table-thead > tr > th {
            padding: 10px 6px !important;
            font-size: 12px;
          }
          .ant-table-tbody > tr > td {
            padding: 10px 6px !important;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default StaffPayment;