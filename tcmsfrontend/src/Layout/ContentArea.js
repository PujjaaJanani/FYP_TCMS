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
// Uncomment when you create these pages
// import StaffDashboard from '../Pages/StaffDashboard';
// import StaffProfile from '../Pages/StaffProfile';
import ViewClassSchedule from '../ClassSchedule/ViewClassSchedule';
import AddClassSchedule from '../ClassSchedule/AddClassSchedule';
import EditClassSchedule from '../ClassSchedule/EditClassSchedule';
// import Payment from '../Pages/Payment';
import StaffClasses from '../StudyMaterial/StaffClasses';
import StaffMaterials from '../StudyMaterial/StaffMaterials';
import AddMaterial from '../StudyMaterial/AddMaterial';
import EditMaterial from '../StudyMaterial/EditMaterial';
import StaffTestMarks from '../StudyMaterial/StaffTestMarks';
import StudentClasses from '../StudyMaterial/StudentClasses';
import StudentMaterials from '../StudyMaterial/StudentMaterials';

// Admin Pages (uncomment when ready)
// import AdminDashboard from '../Pages/AdminDashboard';
// import UserManagement from '../Pages/UserManagement';

// Student Pages (uncomment when ready)
// import StudentDashboard from '../Pages/StudentDashboard';
// import StudentProfile from '../Pages/StudentProfile';

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
            {/* <Route path="/staff/dashboard" element={<StaffDashboard />} /> */}
            {/* <Route path="/staff/profile" element={<StaffProfile />} /> */}
            <Route path="/staff/schedule" element={<ViewClassSchedule />} />
            <Route path="/staff/schedule/add" element={<AddClassSchedule />} />
            <Route path="/staff/schedule/edit/:classId" element={<EditClassSchedule />} />
            {/* <Route path="/staff/payment" element={<Payment />} /> */}
            <Route path="/staff/materials" element={<StaffClasses />} />
            <Route path="/staff/materials/class/:classId" element={<StaffMaterials />} />
            <Route path="/staff/materials/add" element={<AddMaterial />} />
            <Route path="/staff/materials/edit/:materialId" element={<EditMaterial />} />

            {/* Admin Routes (uncomment when ready) */}
            {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
            {/* <Route path="/admin/users" element={<UserManagement />} /> */}
            <Route path="/admin/schedule" element={<ViewClassSchedule />} />
            <Route path="/admin/schedule/add" element={<AddClassSchedule />} />
            <Route path="/admin/schedule/edit/:classId" element={<EditClassSchedule />} />
            <Route path="/staff/testmarks/class/:classId" element={<StaffTestMarks />} />
            

            {/* Student Routes (uncomment when ready) */}
            {/* <Route path="/student/dashboard" element={<StudentDashboard />} /> */}
            {/* <Route path="/student/profile" element={<StudentProfile />} /> */}
            <Route path="/student/schedule" element={<ViewClassSchedule />} />
            {/* <Route path="/student/payment" element={<Payment />} /> */}
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