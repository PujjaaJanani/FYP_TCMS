// ContentArea.js
import React from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layout Components
import SideBar from './SideBar';
import Footer from './Footer';

// Public Pages
import LandingPage from '../Component/LandingPage';
import Login from '../Component/Login';
import Register from '../Component/Register';

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
import StaffPayment from '../Payment/StaffPayment';

// Admin Pages (uncomment when ready)
import UserManagement from '../UserAccount/UserManagement';
import AddUser from '../UserAccount/AddUser';
import EditUser from '../UserAccount/EditUser';

// Student Pages (uncomment when ready)
import StudentPayment from '../Payment/StudentPayment';

const { Content } = Layout;

const ContentArea = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();

  // Routes where Sidebar + Footer should NOT appear
  const publicRoutes = ['/', '/login', '/register'];
  const showSidebar = !publicRoutes.includes(location.pathname);

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* Sidebar — only shown on authenticated pages */}
      {showSidebar && (
        <SideBar
          collapsed={collapsed}
          toggleCollapse={() => setCollapsed(!collapsed)}
        />
      )}

      <Layout>
        <Content>
          <Routes>
            {/* Public Routes */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

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

            {/* Admin Routes (uncomment when ready) */}
            <Route path="/admin/dashboard" element={<ViewDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users/add" element={<AddUser />} />
            <Route path="/admin/users/edit/:userType/:userId" element={<EditUser />} />
            <Route path="/authority/schedule" element={<ViewClassSchedule />} />
            <Route path="/authority/schedule/add" element={<AddClassSchedule />} />
            <Route path="/authority/schedule/edit/:classId" element={<EditClassSchedule />} />

            {/* Student Routes (uncomment when ready) */}
            <Route path="/student/dashboard" element={<ViewDashboard />} />
            <Route path="/student/schedule" element={<ViewClassSchedule />} />
            <Route path="/student/payment" element={<StudentPayment />} />
            <Route path="/student/materials" element={<StudentClasses />} />
            <Route path="/student/materials/class/:classId" element={<StudentMaterials />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>

        {/* Footer — only shown on authenticated pages */}
        {showSidebar && <Footer />}
      </Layout>

    </Layout>
  );
};

export default ContentArea;