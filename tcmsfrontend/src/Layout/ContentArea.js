// ContentArea.js
import React from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Footer from './Footer';

// Layout Components
import SideBar from './SideBar';

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
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();

  // Routes where Sidebar should NOT appear
  const publicRoutes = ['/', '/login', '/register', '/about', '/contact', '/forgot-password', '/reset-password'];
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
        <Content style={{ flexShrink: 0 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/enrollment" element={<Enrollment />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Staff Routes */}
            <Route path="/staff/applications" element={<ViewApplications />} />
            <Route path="/staff/dashboard" element={<ViewDashboard />} />
            <Route path="/profile" element={<ViewProfile />} />
            <Route path="/authority/schedule" element={<ViewClassSchedule />} />
            <Route path="/authority/schedule/add" element={<AddClassSchedule />} />
            <Route path="/authority/schedule/edit/:classId" element={<EditClassSchedule />} />
            <Route path="/staff/payments" element={<StaffPayment />} />
            <Route path="/staff/materials" element={<StaffClasses />} />
            <Route path="/staff/materials/class/:classId" element={<StaffMaterials />} />
            <Route path="/staff/materials/add" element={<AddMaterial />} />
            <Route path="/staff/materials/edit/:materialId" element={<EditMaterial />} />
            <Route path="/staff/testmarks/class/:classId" element={<StaffTestMarks />} />
            <Route path="/staff/attendance" element={<StaffAttendance />} />
            <Route path="/staff/attendance/class/:classId" element={<RecordAttendance />} />
            <Route path="/staff/attendance/archive/:classId" element={<PastClassAttendanceView />} />
            <Route path="/staff/class-archive/:classId" element={<PastClassAcademicView />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ViewDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users/add" element={<AddUser />} />
            <Route path="/admin/users/edit/:userType/:userId" element={<EditUser />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ViewDashboard />} />
            <Route path="/student/schedule" element={<ViewClassSchedule />} />
            <Route path="/student/materials" element={<StudentClasses />} />
            <Route path="/student/materials/class/:classId" element={<StudentMaterials />} />

            {/* Parent Routes */}
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/payment" element={<ParentPayment />} />

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
