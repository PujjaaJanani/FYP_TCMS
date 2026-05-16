import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  message,
  Button,
  Modal,
  Tag,
} from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  LoadingOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { getToken } from "../Utils/LocalStorage";

const { Title, Text } = Typography;

const ParentPayment = () => {
  const [payments, setPayments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [monthlyFee, setMonthlyFee] = useState(200);
  const [paying, setPaying] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [hasRegistration, setHasRegistration] = useState(true);
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // Rich, solid colors from StaffClasses - good contrast with white text
  const monthColors = {
  1: "#1A4D6B", // January - Darkest Indigo
  2: "#0D2B4D", // February - Dark Navy
  3: "#0D3D2B", // March - Dark Emerald
  4: "#0D3D5C", // April - Dark Azure
  5: "#2D0D5C", // May - Dark Violet
  6: "#0D5C4D", // June - Dark Peacock
  7: "#1A3D6B", // July - Dark Lapis
  8: "#3D1A5C", // August - Dark Plum
  9: "#0D2D5C", // September - Dark Royal
  10: "#4D0D6B", // October - Dark Grape
  11: "#0D5C6B", // November - Dark Turquoise
  12: "#1A4D6B", // December - Dark Cerulean
};

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/payments/student?year=${year}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (res.data.success) {
        setPayments(res.data.data.payments);
        setMonthlyFee(res.data.data.monthlyFee);
        setHasRegistration(true);
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.response?.status === 404) {
        setHasRegistration(false);
        message.warning(
          error.response?.data?.message ||
            "No registration found for this year",
        );
      } else {
        message.error("Failed to load payment history");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (paymentId) => {
    setVerifying(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/api/payments/verify/${paymentId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (res.data.success && res.data.status === "Paid") {
        message.success("Payment successful! 🎉");
        fetchPayments();
        return true;
      } else {
        message.info("Payment not completed. Please complete the payment.");
        return false;
      }
    } catch (error) {
      console.error("Verify error:", error);
      message.error("Could not verify payment status");
      return false;
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Check if returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("payment_id");

    if (paymentId) {
      // Verify payment status
      verifyPayment(paymentId);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [year]);

  const handlePayment = async (monthData) => {
    if (monthData.status === "Paid") {
      message.info("This month has already been paid");
      return;
    }

    setSelectedMonth(monthData);

    Modal.confirm({
      title: "Confirm Payment",
      content: (
        <div>
          <p>
            <strong>Month:</strong> {monthData.monthName} {year}
          </p>
          <p>
            <strong>Amount:</strong> RM {monthData.amount.toFixed(2)}
          </p>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f0f5ff",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <p style={{ margin: 0, marginBottom: 8 }}>
              💳 <strong>Payment Methods Available:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>FPX Online Banking (All Malaysian Banks)</li>
            </ul>
          </div>
        </div>
      ),
      okText: "Proceed to Payment",
      cancelText: "Cancel",
      width: 500,
      onOk: async () => {
        setPaying(true);
        try {
          const res = await axios.post(
            "http://localhost:8000/api/payments/create-intent",
            {
              month: monthData.month,
              year: year,
              amount: monthData.amount,
            },
            { headers: { Authorization: `Bearer ${getToken()}` } },
          );

          if (res.data.success) {
            // Redirect to payment page
            const checkoutUrl = res.data.data.checkoutUrl;
            window.location.href = checkoutUrl;
          }
        } catch (error) {
          console.error("Payment error:", error);
          message.error(
            error.response?.data?.message || "Failed to initiate payment",
          );
          setPaying(false);
          setSelectedMonth(null);
        }
      },
      onCancel: () => {
        setSelectedMonth(null);
      },
    });
  };

  const styles = {
    page: {
      padding: "28px 32px",
      minHeight: "100vh",
      background: "#f7f5ff",
    },
    header: {
      textAlign: "center",
      marginBottom: 32,
    },
    yearDisplay: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      marginBottom: 32,
    },
    monthCard: {
      height: "100%",
      borderRadius: 12,
      overflow: "hidden",
      cursor: "pointer",
      transition: "all 0.3s ease",
      border: "2px solid transparent",
      position: "relative",
    },
    monthCardContent: {
      padding: "24px",
      height: "200px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },
    monthName: {
      fontSize: 24,
      fontWeight: 700,
      textAlign: "center",
      marginBottom: 16,
      color: "white",
      textShadow: "0 2px 4px rgba(0,0,0,0.2)",
    },
    statusText: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 12,
      color: "white",
    },
    payButton: {
      width: "100%",
      height: 44,
      fontSize: 16,
      fontWeight: 600,
      border: "none",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    paidButton: {
      width: "100%",
      height: 44,
      fontSize: 16,
      fontWeight: 600,
      border: "2px solid rgba(255,255,255,0.5)",
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.15)",
      color: "white",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      cursor: "default",
    },
    monthCardBody: {
      padding: 0,
    },
    noRegistrationCard: {
      textAlign: "center",
      padding: "60px 20px",
      background: "#fff",
      borderRadius: 12,
    },
  };

  if (loading || verifying) {
    return (
      <div
        style={{
          ...styles.page,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Spin
          size="large"
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        />
        {verifying && <Text>Verifying payment status...</Text>}
      </div>
    );
  }

  // If no registration for current year
  if (!hasRegistration) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <Title level={2} style={{ margin: 0, color: "#3b1fa3" }}>
            PAYMENT
          </Title>
        </div>
        <Card style={styles.noRegistrationCard}>
          <CalendarOutlined
            style={{ fontSize: 64, color: "#faad14", marginBottom: 16 }}
          />
          <Title level={4} style={{ color: "#3b1fa3" }}>
            No Registration for {year}
          </Title>
          <Text type="secondary">
            You are not enrolled for the academic year {year}. Please contact
            the administration for assistance.
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Title level={2} style={{ margin: 0, color: "#3b1fa3" }}>
          PAYMENT
        </Title>
      </div>

      {/* Display current year as static text - no navigation */}
      <div style={styles.yearDisplay}>
        <Tag
          color="#3b1fa3"
          style={{
            fontSize: 22,
            padding: "8px 24px",
            borderRadius: 30,
            fontWeight: 600,
          }}
        >
          {year}
        </Tag>
      </div>

      <Row gutter={[24, 24]}>
        {payments.map((monthData) => {
          const bgColor = monthColors[monthData.month];
          const isPaid = monthData.status === "Paid";
          const isCurrentMonth = monthData.month === currentMonth;
          const isPastMonth =
            year < today.getFullYear() ||
            (year === today.getFullYear() && monthData.month < currentMonth);
          const isFutureMonth =
            year > today.getFullYear() ||
            (year === today.getFullYear() && monthData.month > currentMonth);
          const isCurrentMonthAfter15th = isCurrentMonth && currentDay > 15;
          const isOverdue = !isPaid && (isPastMonth || isCurrentMonthAfter15th);
          const isCurrentMonthBeforeOrOn15th =
            isCurrentMonth && currentDay <= 15;

          // Future unpaid months: white button; past/current unpaid: yellow or red
          const payButtonBg =
            isFutureMonth && !isPaid
              ? "rgba(255,255,255,0.9)"
              : isOverdue
                ? "#ff4d4f"
                : isCurrentMonthBeforeOrOn15th
                  ? "#fadb14"
                  : "rgba(255,255,255,0.9)";
          const payButtonText =
            isFutureMonth && !isPaid
              ? bgColor
              : isOverdue || isCurrentMonthBeforeOrOn15th
                ? "#1f1f1f"
                : bgColor;

          // Only show status for: paid months, past months, or current month
          const showStatus = isPaid || isPastMonth || isCurrentMonth;

          return (
            <Col xs={24} sm={12} lg={8} xl={6} key={monthData.month}>
              <Card
                style={{ ...styles.monthCard, backgroundColor: bgColor }}
                styles={{ body: styles.monthCardBody }}
                hoverable={!isPaid}
                onMouseEnter={(e) => {
                  if (!isPaid) {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow = `0 12px 24px ${bgColor}80`;
                    e.currentTarget.style.borderColor = bgColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPaid) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                <div style={styles.monthCardContent}>
                  <div>
                    <div style={styles.monthName}>{monthData.monthName}</div>

                    {/* Only show status for paid, past, or current month */}
                    {showStatus && (
                      <div style={styles.statusText}>
                        Status: {monthData.status}
                      </div>
                    )}

                    {isPaid && monthData.datePaid && (
                      <div
                        style={{ fontSize: 12, opacity: 0.9, color: "white" }}
                      >
                        Paid:{" "}
                        {new Date(monthData.datePaid).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {isPaid ? (
                    // ← green paid button
                    <div
                      style={{
                        ...styles.paidButton,
                        backgroundColor: "#389e0d",
                        border: "2px solid #52c41a",
                      }}
                    >
                      <CheckCircleOutlined style={{ fontSize: 18 }} />
                      <span>PAID</span>
                    </div>
                  ) : (
                    <Button
                      type="primary"
                      style={{
                        ...styles.payButton,
                        backgroundColor: payButtonBg,
                        color: payButtonText,
                      }}
                      loading={
                        paying && selectedMonth?.month === monthData.month
                      }
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

export default ParentPayment;
