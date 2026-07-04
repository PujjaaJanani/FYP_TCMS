// ContentArea.js - Updated to handle mobile sidebar header spacing
import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Footer from './Footer';
//import { useAuth } from '../context/AuthContext';

// Layout Components
import SideBar from './SideBar';

// Auth
import ProtectedRoute from '../components/ProtectedRoute';
import Unauthorized from '../components/Unauthorized';

// Public Pages
import LandingPage from '../Component/LandingPage';
import Login from '../Component/Login';
import Register from '../Component/Register';
import AboutUs from '../Component/AboutUs';
import ContactUs from '../Component/ContactUs';
import Enrollment from '../Component/Enrollment';
import ForgotPassword from '../Component/ForgotPassword';
import ResetPassword from '../Component/ResetPassword';

// Staff Pages
import ViewApplications from '../Applications/ViewApplications';
import ViewDashboard from '../Dashboard/ViewDashboard';
import ViewProfile from '../UserAccount/ViewProfile';
import ViewClassSchedule from '../ClassSchedule/ViewClassSchedule';
import AddClassSchedule from '../ClassSchedule/AddClassSchedule';
import EditClassSchedule from '../ClassSchedule/EditClassSchedule';
import StaffClasses from '../StudyMaterial/StaffClasses';
import StaffMaterials from '../StudyMaterial/StaffMaterials';
import AddMaterial from '../StudyMaterial/AddMaterial';
import EditMaterial from '../StudyMaterial/EditMaterial';
import StaffTestMarks from '../StudyMaterial/StaffTestMarks';
import StudentClasses from '../StudyMaterial/StudentClasses';
import StudentMaterials from '../StudyMaterial/StudentMaterials';
import RecordAttendance from '../Attendance/RecordAttendance';
import StaffAttendance from '../Attendance/StaffAttendance';
import PastClassAttendanceView from '../Attendance/PastClassAttendanceView';
import StaffPayment from '../Payment/StaffPayment';
import PastClassAcademicView from '../StudyMaterial/PastClassAcademicView';

// Admin Pages
import UserManagement from '../UserAccount/UserManagement';
import AddUser from '../UserAccount/AddUser';
import EditUser from '../UserAccount/EditUser';

// Parent Pages
import ParentDashboard from '../Dashboard/ParentDashboard';
import ParentPayment from '../Payment/ParentPayment';

const { Content } = Layout;

const ContentArea = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Routes where Sidebar should NOT appear
  const publicRoutes = ['/', '/login', '/register', '/about', '/contact', '/forgot-password', '/reset-password', '/unauthorized'];
  const showSidebar = !publicRoutes.includes(location.pathname);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>

      {/* Sidebar — only shown on authenticated pages */}
      {showSidebar && (
        <SideBar
          collapsed={collapsed}
          toggleCollapse={() => setCollapsed(!collapsed)}
        />
      )}

      <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        <Content style={{ flexShrink: 0, marginTop: (isMobile && showSidebar) ? 60 : 0 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/class-schedule" element={<ViewClassSchedule />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/enrollment" element={<Enrollment />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Any authenticated role */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff', 'student', 'parent']}>
                  <ViewProfile />
                </ProtectedRoute>
              }
            />

            {/* Staff Routes (admin + staff) */}
            <Route path="/staff/applications" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ViewApplications /></ProtectedRoute>} />
            <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ViewDashboard /></ProtectedRoute>} />
            <Route path="/authority/schedule" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><ViewClassSchedule /></ProtectedRoute>} />
            <Route path="/authority/schedule/add" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AddClassSchedule /></ProtectedRoute>} />
            <Route path="/authority/schedule/edit/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><EditClassSchedule /></ProtectedRoute>} />
            <Route path="/staff/payments" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffPayment /></ProtectedRoute>} />
            <Route path="/staff/materials" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffClasses /></ProtectedRoute>} />
            <Route path="/staff/materials/class/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffMaterials /></ProtectedRoute>} />
            <Route path="/staff/materials/add" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><AddMaterial /></ProtectedRoute>} />
            <Route path="/staff/materials/edit/:materialId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><EditMaterial /></ProtectedRoute>} />
            <Route path="/staff/testmarks/class/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffTestMarks /></ProtectedRoute>} />
            <Route path="/staff/attendance" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><StaffAttendance /></ProtectedRoute>} />
            <Route path="/staff/attendance/class/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><RecordAttendance /></ProtectedRoute>} />
            <Route path="/staff/attendance/archive/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><PastClassAttendanceView /></ProtectedRoute>} />
            <Route path="/staff/class-archive/:classId" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><PastClassAcademicView /></ProtectedRoute>} />

            {/* Admin Routes (admin only) */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><ViewDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/users/add" element={<ProtectedRoute allowedRoles={['admin']}><AddUser /></ProtectedRoute>} />
            <Route path="/admin/users/edit/:userType/:userId" element={<ProtectedRoute allowedRoles={['admin']}><EditUser /></ProtectedRoute>} />

            {/* Student Routes (student only) */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><ViewDashboard /></ProtectedRoute>} />
            <Route path="/student/schedule" element={<ProtectedRoute allowedRoles={['student']}><ViewClassSchedule /></ProtectedRoute>} />
            <Route path="/student/materials" element={<ProtectedRoute allowedRoles={['student']}><StudentClasses /></ProtectedRoute>} />
            <Route path="/student/materials/class/:classId" element={<ProtectedRoute allowedRoles={['student']}><StudentMaterials /></ProtectedRoute>} />

            {/* Parent Routes (parent only) */}
            <Route path="/parent/dashboard" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/payment" element={<ProtectedRoute allowedRoles={['parent']}><ParentPayment /></ProtectedRoute>} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
        <Footer />
      </Layout>

    </Layout>
  );
};

export default ContentArea;