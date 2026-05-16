import React from 'react';
import { Button, Card, Row, Col, Typography, Divider } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  TrophyOutlined,
  StarOutlined,
  RocketOutlined,
  HeartOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../Layout/Header';

const { Title, Paragraph, Text } = Typography;

const AboutUs = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: <BookOutlined style={{ fontSize: 36, color: '#4a2b8c' }} />,
      title: 'Quality Education',
      description: 'We provide top-tier educational support with experienced teachers and proven teaching methods.'
    },
    {
      icon: <HeartOutlined style={{ fontSize: 36, color: '#e74c3c' }} />,
      title: 'Student-Centered',
      description: 'Every student is unique. We tailor our approach to meet individual learning needs and goals.'
    },
    {
      icon: <TrophyOutlined style={{ fontSize: 36, color: '#f39c12' }} />,
      title: 'Proven Results',
      description: 'Our students consistently achieve excellent grades and gain admission to top universities.'
    },
    {
      icon: <TeamOutlined style={{ fontSize: 36, color: '#27ae60' }} />,
      title: 'Expert Teachers',
      description: 'Our dedicated team of qualified teachers brings years of experience and passion to every class.'
    }
  ];

  const achievements = [
    '15+ years of educational excellence',
    'Small class sizes for personalized attention'
  ];

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
      padding: '0'
    },
    contentSection: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '60px 40px'
    },
    sectionTitle: {
      textAlign: 'center',
      color: '#4a2b8c',
      marginBottom: 16,
      fontSize: 32,
      fontWeight: 700
    },
    sectionSubtitle: {
      textAlign: 'center',
      color: '#666',
      fontSize: 16,
      marginBottom: 48,
      maxWidth: 600,
      margin: '0 auto 48px'
    },
    valueCard: {
      height: '100%',
      textAlign: 'center',
      padding: 32,
      borderRadius: 16,
      border: '2px solid #e8eaf6',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    storySection: {
      background: 'white',
      borderRadius: 16,
      padding: 40,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
    },
    achievementItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      fontSize: 16
    },
    ctaSection: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 16,
      padding: 48,
      textAlign: 'center',
      color: 'white',
      marginTop: 60
    }
  };

  return (
    <div style={styles.page}>
      <Header />

      {/* Main Content */}
      <div style={styles.contentSection}>
        {/* Our Story */}
        <div style={styles.storySection}>
          <Title level={2} style={{ color: '#4a2b8c', marginBottom: 24 }}>
            Our Story
          </Title>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#444' }}>
            Founded in 2009, Hari's Tuition Center began with a simple mission: to provide quality education 
            that makes a real difference in students' lives. What started as a small tutoring center with just 
            a handful of students has grown into one of the most trusted educational institutions in the region.
          </Paragraph>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#444' }}>
            Our founder, Mr. Hari, recognized that every student has unique learning needs and potential. 
            This belief became the cornerstone of our teaching philosophy. Today, we continue to maintain 
            small class sizes, provide personalized attention, and employ innovative teaching methods that 
            cater to different learning styles.
          </Paragraph>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 0 }}>
            Over the years, we've helped hundreds of students not just pass their examinations, but truly 
            understand and excel in their subjects. Our success is measured not in grades alone, but in the 
            confidence, critical thinking skills, and love for learning we instill in every student.
          </Paragraph>
        </div>

        <Divider style={{ margin: '60px 0' }} />

        {/* Our Values */}
        <div>
          <Title level={2} style={styles.sectionTitle}>
            Our Core Values
          </Title>
          <Paragraph style={styles.sectionSubtitle}>
            The principles that guide everything we do
          </Paragraph>

          <Row gutter={[32, 32]}>
            {values.map((value, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card
                  style={styles.valueCard}
                  hoverable
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.2)';
                    e.currentTarget.style.borderColor = '#4a2b8c';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e8eaf6';
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    {value.icon}
                  </div>
                  <Title level={4} style={{ color: '#4a2b8c', marginBottom: 12 }}>
                    {value.title}
                  </Title>
                  <Text style={{ color: '#666', fontSize: 14 }}>
                    {value.description}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider style={{ margin: '60px 0' }} />

        {/* Achievements */}
        <div>
          <Row gutter={48} align="middle">
            <Col xs={24} lg={12}>
              <Title level={2} style={{ color: '#4a2b8c', marginBottom: 24 }}>
                Our Achievements
              </Title>
              <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
                We're proud of what we've accomplished, but we're even more proud of our students' success stories.
              </Paragraph>
              {achievements.map((achievement, index) => (
                <div key={index} style={styles.achievementItem}>
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  <Text strong style={{ fontSize: 16 }}>{achievement}</Text>
                </div>
              ))}
            </Col>
            <Col xs={24} lg={12}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 16,
                padding: 48,
                textAlign: 'center',
                color: 'white'
              }}>
                <StarOutlined style={{ fontSize: 64, marginBottom: 24 }} />
                <Title level={2} style={{ color: 'white', marginBottom: 16 }}>
                  Excellence in Education
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 0 }}>
                  Join hundreds of successful students who have achieved their academic goals with us. 
                  Your journey to excellence starts here.
                </Paragraph>
              </div>
            </Col>
          </Row>
        </div>

        {/* Call to Action */}
        <div style={styles.ctaSection}>
          <Title level={2} style={{ color: 'white', marginBottom: 16 }}>
            Ready to Start Your Journey?
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
            Join Hari's Tuition Center today and experience the difference quality education can make.
          </Paragraph>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="large"
              onClick={() => navigate('/register')}
              style={{
                background: 'white',
                color: '#4a2b8c',
                borderColor: 'white',
                fontWeight: 600,
                height: 48,
                padding: '0 32px'
              }}
            >
              Register Now
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/contact')}
              style={{
                background: 'transparent',
                color: 'white',
                borderColor: 'white',
                fontWeight: 600,
                height: 48,
                padding: '0 32px'
              }}
            >
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;