// Sidebar.js - Responsive version (sidebar on desktop, top header with hamburger on mobile)
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  DollarOutlined, 
  BookOutlined, 
  TeamOutlined, 
  LogoutOutlined, 
  ProfileOutlined, 
  CheckSquareOutlined,
  DashboardOutlined,
  MenuOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './Sidebar.css';

const { Sider } = Layout;

function getItem(label, key, icon, onClick, children) {
  return { key, icon, onClick, children, label };
}

const Sidebar = ({ collapsed, toggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userType = user?.userType;
  const role = user?.role;

  // Check screen size on mount and on resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu when navigating
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Route mapping
  const routeKeyMap = {
    '/admin/dashboard':        'admin-1',
    '/admin/users':            'admin-2',
    '/authority/schedule':     'admin-3',
    '/staff/dashboard':        'staff-1',
    '/staff/applications':     'staff-4',
    '/staff/attendance':       'staff-5',
    '/staff/payments':         'staff-6',
    '/staff/materials':        'staff-7',
    '/student/dashboard':      'student-1',
    '/student/schedule':       'student-3',
    '/student/materials':      'student-5',
    '/parent/dashboard':       'parent-2',
    '/parent/payment':         'parent-3',
    '/staff/attendance/archive': 'staff-3',
    '/staff/class-archive':      'staff-3',
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    const currentUserType = user?.userType;
    const currentRole = user?.role;
    
    if (path === '/profile') {
      if (currentUserType === 'authority') {
        return 'staff-2';
      } else if (currentUserType === 'student') {
        return 'student-2';
      } else if (currentUserType === 'parent') {
        return 'parent-1';
      }
    }
    
    if (path === '/authority/schedule') {
      if (currentRole === 'Admin') {
        return 'admin-3';
      } else {
        return 'staff-3';
      }
    }
    
    if (path.startsWith('/staff/attendance/archive')) {
      return 'staff-3';
    }
    
    if (path.startsWith('/staff/class-archive')) {
      return 'staff-3';
    }
    
    for (const [route, key] of Object.entries(routeKeyMap)) {
      if (path.startsWith(route)) {
        return key;
      }
    }
    
    return '';
  };

  const selectedKey = getSelectedKey();

  // Menu items definitions
  const adminItems = [
    getItem('Home',            'admin-1', <HomeOutlined />,     () => navigate('/admin/dashboard')),
    getItem('User Management', 'admin-2', <TeamOutlined />,     () => navigate('/admin/users')),
    getItem('Class Schedule',  'admin-3', <CalendarOutlined />, () => navigate('/authority/schedule')),
    getItem('Logout',          'admin-4', <LogoutOutlined />,   () => { void logout(); }),
  ];

  const staffItems = [
    getItem('Home',           'staff-1', <HomeOutlined />,     () => navigate('/staff/dashboard')),
    getItem('Profile',        'staff-2', <UserOutlined />,     () => navigate('/profile')),
    getItem('Class Schedule', 'staff-3', <CalendarOutlined />, () => navigate('/authority/schedule')),
    getItem('Registrations',  'staff-4', <ProfileOutlined />,  () => navigate('/staff/applications')),
    getItem('Attendance',     'staff-5', <CheckSquareOutlined />,  () => navigate('/staff/attendance')),
    getItem('Payment',        'staff-6', <DollarOutlined />,   () => navigate('/staff/payments')),
    getItem('Study Material', 'staff-7', <BookOutlined />,     () => navigate('/staff/materials')),
    getItem('Logout',         'staff-8', <LogoutOutlined />,   () => { void logout(); }),
  ];

  const studentItems = [
    getItem('Home',           'student-1', <HomeOutlined />,     () => navigate('/student/dashboard')),
    getItem('Profile',        'student-2', <UserOutlined />,     () => navigate('/profile')),
    getItem('Class Schedule', 'student-3', <CalendarOutlined />, () => navigate('/student/schedule')),
    getItem('Study Material', 'student-5', <BookOutlined />,     () => navigate('/student/materials')),
    getItem('Logout',         'student-6', <LogoutOutlined />,   () => { void logout(); }),
  ];

  const parentItems = [
    getItem('Dashboard',      'parent-2', <DashboardOutlined />, () => navigate('/parent/dashboard')),
    getItem('Profile',        'parent-1', <UserOutlined />,      () => navigate('/profile')),
    getItem('Payment',        'parent-3', <DollarOutlined />,    () => navigate('/parent/payment')),
    getItem('Logout',         'parent-4', <LogoutOutlined />,    () => { void logout(); }),
  ];

  const getMenuItems = () => {
    if (userType === 'authority') {
      return role === 'Admin' ? adminItems : staffItems;
    }
    if (userType === 'student') {
      return studentItems;
    }
    if (userType === 'parent') {
      return parentItems;
    }
    return [];
  };

  const items = getMenuItems();
  if (!userType) return null;

  // MOBILE VIEW - Top header with hamburger menu
  if (isMobile) {
    return (
      <>
        <header className="mobile-sidebar-header">
          <div className="mobile-sidebar-brand" onClick={() => { navigate('/'); closeMobileMenu(); }}>
            Hari's Tuition Center
          </div>
          <button className="mobile-sidebar-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </header>

        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={closeMobileMenu}
          closable={false}
          width={280}
          styles={{
            body: {
              padding: 0,
              background: 'linear-gradient(180deg, #5B3A9E 0%, #3b1fa3 100%)',
            }
          }}
        >
          <div className="mobile-sidebar-drawer-brand">
            <div style={{ fontSize: 18, marginBottom: 4 }}>Hari's Tuition</div>
            <div style={{ fontSize: 14 }}>Center</div>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items}
            style={{ 
              background: 'transparent', 
              borderRight: 0,
              paddingTop: 8,
              paddingLeft: 12,
              paddingRight: 12
            }}
            className="custom-sidebar-menu"
            onClick={closeMobileMenu}
          />
        </Drawer>
      </>
    );
  }

  // DESKTOP VIEW - Normal collapsible sidebar
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={toggleCollapse}
      breakpoint="lg"
      width={200}
      collapsedWidth={80}
      style={{ 
        background: 'linear-gradient(180deg, #5B3A9E 0%, #3b1fa3 100%)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: collapsed ? '20px 12px' : '28px 20px',
          transition: 'all 0.3s',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: collapsed ? 11 : 15,
          textAlign: 'center',
          lineHeight: 1.4,
          letterSpacing: '0.3px',
          background: 'rgba(0,0,0,0.1)',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          minHeight: collapsed ? 80 : 100
        }}
      >
        {!collapsed ? (
          <>
            <div style={{ fontSize: 16, marginBottom: 2 }}>Hari's Tuition</div>
            <div style={{ fontSize: 14 }}>Center</div>
          </>
        ) : (
          <div style={{ fontSize: 12 }}>HTC</div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        style={{ 
          background: 'transparent', 
          borderRight: 0,
          paddingTop: 8,
          paddingLeft: 12,
          paddingRight: 12
        }}
        className="custom-sidebar-menu"
      />
    </Sider>
  );
};

export default Sidebar;
