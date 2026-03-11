// src/Pages/StudentPayment.js - With Manual Verification
import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Typography, Spin, message, Button, Modal
} from 'antd';
import {
  LeftOutlined, RightOutlined, CheckCircleOutlined, DollarOutlined, LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getToken } from '../Utils/LocalStorage';

const { Title, Text } = Typography;

const StudentPayment = () => {
  const [payments, setPayments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [monthlyFee, setMonthlyFee] = useState(200);
  const [paying, setPaying] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Rich, solid colors from StaffClasses - good contrast with white text
  const monthColors = {
    1: '#C41E3A', // January - Crimson Red
    2: '#1E4C7A', // February - Deep Blue
    3: '#2E5C4A', // March - Forest Green
    4: '#8B4513', // April - Saddle Brown
    5: '#4A2C6D', // May - Royal Purple
    6: '#B22222', // June - Fire Brick
    7: '#2A5C6E', // July - Teal
    8: '#7D3C1B', // August - Rust
    9: '#1E3A5F', // September - Navy
    10: '#5D3A1A', // October - Dark Brown
    11: '#4A6D8C', // November - Steel Blue
    12: '#7C4D2E', // December - Coffee
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/payments/student?year=${year}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      
      if (res.data.success) {
        setPayments(res.data.data.payments);
        setMonthlyFee(res.data.data.monthlyFee);
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (paymentId) => {
    setVerifying(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/payments/verify/${paymentId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (res.data.success && res.data.status === 'Paid') {
        message.success('Payment successful! 🎉');
        fetchPayments();
        return true;
      } else {
        message.info('Payment not completed. Please complete the payment.');
        return false;
      }
    } catch (error) {
      console.error('Verify error:', error);
      message.error('Could not verify payment status');
      return false;
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    
    // Check if returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    
    if (paymentId) {
      // Verify payment status
      verifyPayment(paymentId);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [year]);

  const handlePayment = async (monthData) => {
    if (monthData.status === 'Paid') {
      message.info('This month has already been paid');
      return;
    }

    setSelectedMonth(monthData);
    
    Modal.confirm({
      title: 'Confirm Payment',
      content: (
        <div>
          <p><strong>Month:</strong> {monthData.monthName} {year}</p>
          <p><strong>Amount:</strong> RM {monthData.amount.toFixed(2)}</p>
          <div style={{ marginTop: 16, padding: 12, background: '#f0f5ff', borderRadius: 8, fontSize: 13 }}>
            <p style={{ margin: 0, marginBottom: 8 }}>
              💳 <strong>Payment Methods Available:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>FPX Online Banking (All Malaysian Banks)</li>
              <li>Credit/Debit Cards</li>
            </ul>
          </div>
        </div>
      ),
      okText: 'Proceed to Payment',
      cancelText: 'Cancel',
      width: 500,
      onOk: async () => {
        setPaying(true);
        try {
          const res = await axios.post(
            'http://localhost:8000/api/payments/create-intent',
            {
              month: monthData.month,
              year: year,
              amount: monthData.amount
            },
            { headers: { Authorization: `Bearer ${getToken()}` } }
          );

          if (res.data.success) {
            // Redirect to payment page
            const checkoutUrl = res.data.data.checkoutUrl;
            window.location.href = checkoutUrl;
          }
        } catch (error) {
          console.error('Payment error:', error);
          message.error(error.response?.data?.message || 'Failed to initiate payment');
          setPaying(false);
          setSelectedMonth(null);
        }
      },
      onCancel: () => {
        setSelectedMonth(null);
      }
    });
  };

  const styles = {
    page: {
      padding: '28px 32px',
      minHeight: '100vh',
      background: '#f7f5ff'
    },
    header: {
      textAlign: 'center',
      marginBottom: 32
    },
    yearSelector: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      marginBottom: 32
    },
    monthCard: {
      height: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
      position: 'relative'
    },
    monthCardContent: {
      padding: '24px',
      height: '200px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    monthName: {
      fontSize: 24,
      fontWeight: 700,
      textAlign: 'center',
      marginBottom: 16,
      color: 'white',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    statusText: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 12,
      color: 'white'
    },
    payButton: {
      width: '100%',
      height: 44,
      fontSize: 16,
      fontWeight: 600,
      border: 'none',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    },
    paidButton: {
      width: '100%',
      height: 44,
      fontSize: 16,
      fontWeight: 600,
      border: '2px solid rgba(255,255,255,0.5)',
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: 'white',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'default'
    },
    monthCardBody: {
      padding: 0
    }
  };

  if (loading || verifying) {
    return (
      <div style={{
        ...styles.page,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16
      }}>
        <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        {verifying && <Text>Verifying payment status...</Text>}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Title level={2} style={{ margin: 0, color: '#3b1fa3' }}>
          PAYMENT
        </Title>
        {/* <Title level={4} style={{ margin: '8px 0 0 0', fontWeight: 400, color: '#666' }}>
          {year}
        </Title> */}
      </div>

      <div style={styles.yearSelector}>
        <Button
          icon={<LeftOutlined />}
          onClick={() => setYear(year - 1)}
          size="large"
          style={{ borderRadius: 8, height: 44 }}
        />
        <Title level={3} style={{ margin: 0, minWidth: 100, textAlign: 'center' }}>
          {year}
        </Title>
        <Button
          icon={<RightOutlined />}
          onClick={() => setYear(year + 1)}
          size="large"
          style={{ borderRadius: 8, height: 44 }}
        />
      </div>

      <Row gutter={[24, 24]}>
        {payments.map((monthData) => {
          const bgColor = monthColors[monthData.month];
          const isPaid = monthData.status === 'Paid';
          
          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={monthData.month}>
              <Card
                style={{
                  ...styles.monthCard,
                  backgroundColor: bgColor
                }}
                styles={{ body: styles.monthCardBody }}
                hoverable={!isPaid}
                onMouseEnter={(e) => {
                  if (!isPaid) {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = `0 12px 24px ${bgColor}80`;
                    e.currentTarget.style.borderColor = bgColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPaid) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={styles.monthCardContent}>
                  <div>
                    <div style={styles.monthName}>
                      {monthData.monthName}
                    </div>
                    <div style={styles.statusText}>
                      Status: {monthData.status}
                    </div>
                    {isPaid && monthData.datePaid && (
                      <div style={{ fontSize: 12, opacity: 0.9, color: 'white' }}>
                        Paid: {new Date(monthData.datePaid).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {isPaid ? (
                    <div style={styles.paidButton}>
                      <CheckCircleOutlined style={{ fontSize: 18 }} />
                      <span>PAID</span>
                    </div>
                  ) : (
                    <Button
                      type="primary"
                      style={{
                        ...styles.payButton,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: bgColor
                      }}
                      loading={paying && selectedMonth?.month === monthData.month}
                      onClick={() => handlePayment(monthData)}
                      icon={<DollarOutlined style={{ fontSize: 18 }} />}
                    >
                      PAY RM{monthData.amount.toFixed(2)}
                    </Button>
                  )}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default StudentPayment;