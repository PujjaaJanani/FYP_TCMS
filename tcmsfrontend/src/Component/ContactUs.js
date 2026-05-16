import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography, Form, Input, Select, message, Divider } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  SendOutlined,
  WhatsAppOutlined,
  FacebookOutlined,
  InstagramOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../Layout/Header';
import Footer from '../Layout/Footer';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const getCustomIcon = (color, label) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            <span style="color: white; font-weight: bold; font-size: 14px;">${label}</span>
           </div>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const ContactUs = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeLocation, setActiveLocation] = useState('both');
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setTimeout(() => {
      message.success('Thank you for contacting us! We will get back to you within 24 hours.');
      form.resetFields();
      setSubmitting(false);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: <PhoneOutlined style={{ fontSize: 24, color: '#4a2b8c' }} />,
      title: 'Phone',
      content: '+60123242300',
      link: 'tel:+60123242300'
    },
    {
      icon: <MailOutlined style={{ fontSize: 24, color: '#4a2b8c' }} />,
      title: 'Email',
      content: 'info@haristuition.com',
      link: 'mailto:info@haristuition.com'
    },
    {
      icon: <EnvironmentOutlined style={{ fontSize: 24, color: '#4a2b8c' }} />,
      title: 'Address',
      content: 'Bandar Baru Rawang & Country Homes Rawang',
      link: null
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#4a2b8c' }} />,
      title: 'Office Hours',
      content: 'Mon - Fri: 9AM - 6PM\nSat: 9AM - 2PM',
      link: null
    }
  ];

  const locations = [
    {
      name: 'Bandar Baru Rawang',
      address: 'Bandar Baru Rawang, 48000 Rawang, Selangor',
      coordinates: [3.3175, 101.5739],
      color: '#4a2b8c',
      label: 'B',
      description: 'Main Branch'
    },
    {
      name: 'Country Homes Rawang',
      address: 'Country Homes, 48000 Rawang, Selangor',
      coordinates: [3.3399, 101.5542],
      color: '#25D366',
      label: 'C',
      description: 'Second Branch'
    }
  ];

  const toggleOptions = [
    { key: 'both', label: 'Both Locations', emoji: '🗺️' },
    ...locations.map(loc => ({ key: loc.name, label: loc.name, emoji: '📍' }))
  ];

  const FitBounds = ({ locations }) => {
    const map = useMap();
    useEffect(() => {
      if (locations && locations.length > 0) {
        const bounds = L.latLngBounds(locations.map(loc => loc.coordinates));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [locations, map]);
    return null;
  };

  const LocationController = () => {
    const map = useMap();
    useEffect(() => {
      if (activeLocation !== 'both') {
        const location = locations.find(loc => loc.name === activeLocation);
        if (location) {
          map.flyTo(location.coordinates, 15, { duration: 1.5 });
        }
      } else {
        const bounds = L.latLngBounds(locations.map(loc => loc.coordinates));
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      }
    }, [activeLocation, map]);
    return null;
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
      padding: '0'
    },
    contentSection: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '60px 20px',
    },
    contactCard: {
      height: '100%',
      textAlign: 'center',
      padding: '24px 16px',
      borderRadius: 16,
      border: '2px solid #e8eaf6',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    mapCard: {
      borderRadius: 16,
      overflow: 'hidden',
      border: '2px solid #e8eaf6',
      width: '100%',
      marginBottom: 32,
      position: 'relative',
      zIndex: 1
    },
    quickInfoWrapper: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
      padding: '0 16px'
    },
    quickInfoCard: {
      borderRadius: 16,
      border: '2px solid #e8eaf6',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      width: '100%',
      maxWidth: 500,
      margin: '0 auto'
    }
  };

  return (
    <div style={styles.page}>
      <Header />

      <div style={styles.contentSection}>
        {/* Contact Information Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 60 }}>
          {contactInfo.map((info, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                style={styles.contactCard}
                hoverable={!!info.link}
                onClick={() => info.link && window.open(info.link, '_blank')}
                onMouseEnter={(e) => {
                  if (info.link) {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.2)';
                    e.currentTarget.style.borderColor = '#4a2b8c';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e8eaf6';
                }}
              >
                <div style={{ marginBottom: 16 }}>{info.icon}</div>
                <Title level={4} style={{ color: '#4a2b8c', marginBottom: 12, fontSize: '18px' }}>
                  {info.title}
                </Title>
                <Text style={{ color: '#666', fontSize: 14, whiteSpace: 'pre-line' }}>
                  {info.content}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Location Toggle Pill Group ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, padding: '0 8px' }}>
          <div style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            background: 'rgba(74, 43, 140, 0.06)',
            borderRadius: 50,
            padding: '6px 8px',
            border: '1.5px solid rgba(74, 43, 140, 0.18)',
            boxShadow: '0 2px 16px rgba(74, 43, 140, 0.1)',
          }}>
            {toggleOptions.map(item => {
              const isActive = activeLocation === item.key;
              const isHovered = hoveredBtn === item.key && !isActive;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveLocation(item.key)}
                  onMouseEnter={() => setHoveredBtn(item.key)}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 22px',
                    borderRadius: 50,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 14,
                    letterSpacing: '0.2px',
                    transition: 'all 0.22s ease',
                    background: isActive
                      ? 'linear-gradient(135deg, #4a2b8c 0%, #7c3aed 100%)'
                      : isHovered
                        ? 'rgba(74, 43, 140, 0.1)'
                        : 'transparent',
                    color: isActive ? '#fff' : '#4a2b8c',
                    boxShadow: isActive ? '0 4px 16px rgba(74, 43, 140, 0.3)' : 'none',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    whiteSpace: 'nowrap',
                    outline: 'none',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div style={styles.mapCard}>
          <MapContainer
            center={[3.3287, 101.5641]}
            zoom={12}
            style={{ height: '450px', width: '100%', zIndex: 1 }}
            zoomControl={true}
            zoomControlPosition="topright"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {locations.map((location, idx) => (
              <Marker
                key={idx}
                position={location.coordinates}
                icon={getCustomIcon(location.color, location.label)}
              >
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <strong style={{ color: location.color, fontSize: 16 }}>{location.name}</strong>
                    <p style={{ margin: '8px 0 4px 0', fontSize: 12 }}>{location.address}</p>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => window.open(`https://maps.google.com/?q=${location.coordinates[0]},${location.coordinates[1]}`, '_blank')}
                      style={{ marginTop: 8, background: location.color, borderColor: location.color }}
                    >
                      Get Directions
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FitBounds locations={locations} />
            <LocationController />
          </MapContainer>
        </div>

        {/* Quick Info */}
        <div style={styles.quickInfoWrapper}>
          <Card style={styles.quickInfoCard}>
            <div style={{ textAlign: 'center', color: 'white', padding: '0 16px' }}>
              <Title level={4} style={{ color: 'white', marginBottom: 16, fontSize: '20px' }}>
                Need Immediate Assistance?
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 24, fontSize: '14px' }}>
                Call us directly or send a WhatsApp message for quick response
              </Paragraph>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="large"
                  icon={<PhoneOutlined />}
                  onClick={() => window.open('tel:+60123242300')}
                  style={{ background: 'white', color: '#4a2b8c', borderColor: 'white', fontWeight: 600 }}
                >
                  Call Now
                </Button>
                <Button
                  size="large"
                  icon={<WhatsAppOutlined />}
                  onClick={() => window.open('https://wa.me/0123242300', '_blank')}
                  style={{ background: '#25D366', color: 'white', borderColor: '#25D366', fontWeight: 600 }}
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        .leaflet-control-zoom { z-index: 1000 !important; position: relative; }
        .leaflet-control-zoom a { background-color: white !important; color: #4a2b8c !important; border-radius: 4px !important; transition: all 0.3s ease !important; }
        .leaflet-control-zoom a:hover { background-color: #4a2b8c !important; color: white !important; }
        .leaflet-container { width: 100%; height: 100%; z-index: 1; }
        @media (max-width: 768px) { .leaflet-container { height: 350px !important; } }
        @media (max-width: 480px) { .leaflet-container { height: 300px !important; } }
        .leaflet-popup-content { min-width: 200px; max-width: 280px; }
        @media (max-width: 480px) { .leaflet-popup-content { min-width: 180px; max-width: 220px; font-size: 12px; } }
        @media (max-width: 768px) { .leaflet-control-zoom { transform: scale(0.8); transform-origin: top right; } }
      `}</style>
    </div>
  );
};

export default ContactUs;