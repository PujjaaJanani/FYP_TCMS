import React, { useRef } from "react";
import { Card, Typography, Button, Row, Col, Divider, message } from "antd";
import { CheckCircleOutlined, PrinterOutlined, DownloadOutlined } from "@ant-design/icons";
import html2pdf from "html2pdf.js";

const { Title, Text } = Typography;

const ParentReceipt = ({ payment, onBack }) => {
  const receiptRef = useRef(null);

  const downloadPDF = () => {
    const element = receiptRef.current;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Receipt_${payment.paymentId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opt).from(element).save();
    message.success("Receipt downloaded!");
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 600, margin: "0 auto" }}>
      {/* ✅ RECEIPT CONTENT - This gets downloaded */}
      <div ref={receiptRef}>
        <Card style={{ borderRadius: 12, textAlign: "center" }}>
          <Title level={2} style={{ color: "#3b1fa3", marginBottom: 8 }}>
            HARI'S TUITION CENTER
          </Title>
          <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
            Official Payment Receipt
          </Text>
          
          <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a", marginBottom: 16 }} />
          <Title level={3}>Payment Successful!</Title>
          
          <Divider />
          
          {payment.children && payment.children.length > 0 && (
            <>
              <Row gutter={[16, 12]}>
                <Col span={12}><Text strong>Children:</Text></Col>
                <Col span={12}><Text>{payment.children.join(', ')}</Text></Col>
              </Row>
            </>
          )}
          
          <Row gutter={[16, 12]}>
            <Col span={12}><Text strong>Receipt No:</Text></Col>
            <Col span={12}><Text>{payment.paymentId}</Text></Col>
            
            <Col span={12}><Text strong>Month:</Text></Col>
            <Col span={12}><Text>{payment.monthName} {payment.year}</Text></Col>
            
            <Col span={12}><Text strong>Amount Paid:</Text></Col>
            <Col span={12}><Text style={{ fontSize: 18, color: "#3b1fa3" }}>RM {payment.amount}</Text></Col>
            
            <Col span={12}><Text strong>Payment Method:</Text></Col>
            <Col span={12}><Text>{payment.method}</Text></Col>
            
            <Col span={12}><Text strong>Transaction ID:</Text></Col>
            <Col span={12}><Text>{payment.transactionId}</Text></Col>
            
            <Col span={12}><Text strong>Date Paid:</Text></Col>
            <Col span={12}><Text>{new Date(payment.datePaid).toLocaleDateString()}</Text></Col>
          </Row>
          
          <Divider />
          
          <Text type="secondary">Thank you for your payment!</Text>
        </Card>
      </div>
      
      {/* ✅ BUTTONS - Outside the ref, not included in PDF */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <Button icon={<DownloadOutlined />} onClick={downloadPDF} type="primary">
          Download PDF
        </Button>
        
        <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ marginLeft: 12 }}>
          Print
        </Button>
        
        <Button onClick={onBack} style={{ marginLeft: 12 }}>
          Back to Payments
        </Button>
      </div>
    </div>
  );
};

export default ParentReceipt;