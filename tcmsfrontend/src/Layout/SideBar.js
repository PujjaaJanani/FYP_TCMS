// SideBar.js - FIXED VERSION with proper profile highlighting and past record routing
import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
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
  DashboardOutlined
} from '@ant-design/icons';
import { getUserType, getRole, clearAuth } from '../Utils/LocalStorage';

const { Sider } = Layout;

function getItem(label, key, icon, onClick, children) {
  return { key, icon, onClick, children, label };
}

const Sidebar = ({ collapsed, toggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userType = getUserType();
  const role     = getRole();

  // Route mapping - includes past record routes
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
    // Past record view routes - map to Class Schedule
    '/staff/attendance/archive': 'staff-3',
    '/staff/class-archive':      'staff-3',
  };

  // Match current path — also handles sub-routes
  const getSelectedKey = () => {
    const path = location.pathname;
    const currentUserType = getUserType();
    const currentRole = getRole();
    
    // Handle profile page - dynamically based on user type
    if (path === '/profile') {
      if (currentUserType === 'authority') {
        return 'staff-2';  // Profile in staff menu
      } else if (currentUserType === 'student') {
        return 'student-2'; // Profile in student menu
      } else if (currentUserType === 'parent') {
        return 'parent-1';
      }
    }
    
    // Handle class schedule route (shared between admin and staff)
    if (path === '/authority/schedule') {
      if (currentRole === 'Admin') {
        return 'admin-3';
      } else {
        return 'staff-3';
      }
    }
    
    // Handle past record routes
    if (path.startsWith('/staff/attendance/archive')) {
      return 'staff-3';
    }
    
    if (path.startsWith('/staff/class-archive')) {
      return 'staff-3';
    }
    
    // Handle prefix matches for nested routes
    for (const [route, key] of Object.entries(routeKeyMap)) {
      if (path.startsWith(route)) {
        return key;
      }
    }
    
    return '';
  };

  const selectedKey = getSelectedKey();

  // ── Admin menu ────────────────────────────────────────────────
  const adminItems = [
    getItem('Home',            'admin-1', <HomeOutlined />,     () => navigate('/admin/dashboard')),
    getItem(<span style={{ lineHeight: 1.2 }}>User<br />Management</span>, 'admin-2', <TeamOutlined />, () => navigate('/admin/users')),
    getItem('Class Schedule',  'admin-3', <CalendarOutlined />, () => navigate('/authority/schedule')),
    getItem('Logout',          'admin-4', <LogoutOutlined />,   () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // ── Staff menu ────────────────────────────────────────────────
  const staffItems = [
    getItem('Home',           'staff-1', <HomeOutlined />,     () => navigate('/staff/dashboard')),
    getItem('Profile',        'staff-2', <UserOutlined />,     () => navigate('/profile')),
    getItem('Class Schedule', 'staff-3', <CalendarOutlined />, () => navigate('/authority/schedule')),
    getItem('Registrations',  'staff-4', <ProfileOutlined />,  () => navigate('/staff/applications')),
    getItem('Attendance',     'staff-5', <CheckSquareOutlined />,  () => navigate('/staff/attendance')),
    getItem('Payment',        'staff-6', <DollarOutlined />,   () => navigate('/staff/payments')),
    getItem('Study Material', 'staff-7', <BookOutlined />,     () => navigate('/staff/materials')),
    getItem('Logout',         'staff-8', <LogoutOutlined />,   () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // ── Student menu ──────────────────────────────────────────────
  const studentItems = [
    getItem('Home',           'student-1', <HomeOutlined />,     () => navigate('/student/dashboard')),
    getItem('Profile',        'student-2', <UserOutlined />,     () => navigate('/profile')),
    getItem('Class Schedule', 'student-3', <CalendarOutlined />, () => navigate('/student/schedule')),
    getItem('Study Material', 'student-5', <BookOutlined />,     () => navigate('/student/materials')),
    getItem('Logout',         'student-6', <LogoutOutlined />,   () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // —— Parent menu ——————————————————————————————————————————————
  const parentItems = [
    getItem('Dashboard',      'parent-2', <DashboardOutlined />, () => navigate('/parent/dashboard')),
    getItem('Profile',        'parent-1', <UserOutlined />,      () => navigate('/profile')),
    getItem('Payment',        'parent-3', <DollarOutlined />,    () => navigate('/parent/payment')),
    getItem('Logout',         'parent-4', <LogoutOutlined />,    () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // ── Pick correct menu based on role ───────────────────────────
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
    return []; // Not logged in — render nothing
  };

  const items = getMenuItems();

  // Don't render sidebar if no user / not logged in
  if (!userType) return null;

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
      {/* Brand / Logo area */}
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
          fontStyle: 'italic',
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

      <style jsx global>{`
        .custom-sidebar-menu .ant-menu-item {
          height: auto !important;
          min-height: 48px !important;
          line-height: 1.3 !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
          margin: 4px 0 !important;
          border-radius: 8px !important;
          padding-left: 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: rgba(255, 255, 255, 0.85) !important;
          transition: all 0.3s ease !important;
        }

        .custom-sidebar-menu .ant-menu-item:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }

        .custom-sidebar-menu .ant-menu-item-selected {
          background: #ffffff !important;
          color: #3b1fa3 !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }

        .custom-sidebar-menu .ant-menu-item-selected::after {
          display: none !important;
        }

        .custom-sidebar-menu .ant-menu-item .anticon {
          font-size: 18px !important;
          margin-right: 8px !important;
        }

        .custom-sidebar-menu .ant-menu-item-selected .anticon {
          color: #3b1fa3 !important;
        }

        /* Collapsed state styles */
        .ant-layout-sider-collapsed .custom-sidebar-menu {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item {
          margin: 4px 0 !important;
          padding: 8px 0 !important;
          min-height: 48px !important;
          height: auto !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item .anticon {
          margin: 0 !important;
          font-size: 22px !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item .ant-menu-title-content {
          display: none !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item-selected {
          background: #ffffff !important;
          color: #3b1fa3 !important;
          width: 60px !important;
          margin: 4px auto !important;
          left: 0 !important;
          right: 0 !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item-selected .anticon {
          color: #3b1fa3 !important;
        }

        .ant-layout-sider-collapsed .custom-sidebar-menu .ant-menu-item:hover {
          width: 60px !important;
          margin: 4px auto !important;
          left: 0 !important;
          right: 0 !important;
        }

        /* Remove default Ant Design borders */
        .custom-sidebar-menu .ant-menu-item::before {
          display: none !important;
        }

        /* Logout item special styling */
        .custom-sidebar-menu .ant-menu-item:last-child {
          margin-top: 16px !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding-top: 8px !important;
        }

        /* Sider trigger button */
        .ant-layout-sider-trigger {
          background: rgba(0, 0, 0, 0.2) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .ant-layout-sider-trigger:hover {
          background: rgba(0, 0, 0, 0.3) !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;