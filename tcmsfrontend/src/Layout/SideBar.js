// SideBar.js
import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  BookOutlined,
  TeamOutlined,
  LogoutOutlined,
  ProfileOutlined,
  CheckSquareOutlined 
} from '@ant-design/icons';
import { getUserType, getRole, clearAuth } from '../Utils/LocalStorage';

const { Sider } = Layout;

function getItem(label, key, icon, onClick, children) {
  return { key, icon, onClick, children, label };
}

const Sidebar = ({ collapsed, toggleCollapse }) => {
  const navigate = useNavigate();

  const userType = getUserType();   // 'authority' | 'student' | null
  const role     = getRole();       // 'Admin' | 'Staff' | 'student' | null

  // ── Admin menu ────────────────────────────────────────────────
  const adminItems = [
    getItem('Home',            'admin-1', <HomeOutlined />,     () => navigate('/admin/dashboard')),
    getItem('User Management', 'admin-2', <TeamOutlined />,     () => navigate('/admin/users')),
    getItem('Class Schedule',  'admin-3', <CalendarOutlined />, () => navigate('/admin/schedule')),
    getItem('Logout',          'admin-4', <LogoutOutlined />,   () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // ── Staff menu ────────────────────────────────────────────────
  const staffItems = [
    getItem('Home',           'staff-1', <HomeOutlined />,     () => navigate('/staff/dashboard')),
    getItem('Profile',        'staff-2', <UserOutlined />,     () => navigate('/staff/profile')),
    getItem('Class Schedule', 'staff-3', <CalendarOutlined />, () => navigate('/staff/schedule')),
    getItem('Registrations',  'staff-4', <ProfileOutlined />,  () => navigate('/staff/registrations')),
    getItem('Attendance',     'staff-5', <CheckSquareOutlined  />,  () => navigate('/staff/attendance')),
    getItem('Payment',        'staff-6', <DollarOutlined />,   () => navigate('/staff/payment')),
    getItem('Study Material', 'staff-7', <BookOutlined />,     () => navigate('/staff/materials')),
    getItem('Logout',         'staff-8', <LogoutOutlined />,   () => {
      clearAuth();
      navigate('/login');
    }),
  ];

  // ── Student menu ──────────────────────────────────────────────
  const studentItems = [
    getItem('Home',           'student-1', <HomeOutlined />,     () => navigate('/student/dashboard')),
    getItem('Profile',        'student-2', <UserOutlined />,     () => navigate('/student/profile')),
    getItem('Class Schedule', 'student-3', <CalendarOutlined />, () => navigate('/student/schedule')),
    getItem('Payment',        'student-4', <DollarOutlined />,   () => navigate('/student/payment')),
    getItem('Study Material', 'student-5', <BookOutlined />,     () => navigate('/student/materials')),
    getItem('Logout',         'student-6', <LogoutOutlined />,   () => {
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
      breakpoint="md"
      style={{ background: '#3b1fa3' }} // purple from screenshots
    >
      {/* Brand / Logo area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: collapsed ? '16px 8px' : '24px 16px',
          transition: 'padding 0.3s',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: collapsed ? 10 : 13,
          textAlign: 'center',
          lineHeight: 1.3,
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {!collapsed && (
          <>
            Hari's Tuition
            <br />
            Center
          </>
        )}
        {collapsed && 'HTC'}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={['staff-4']} // Changed default selected to Registrations
        items={items}
        style={{ background: '#3b1fa3', borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;