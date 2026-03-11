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
// import AdminDashboard from '../Pages/AdminDashboard';
import UserManagement from '../UserAccount/UserManagement';
import AddUser from '../UserAccount/AddUser';
import EditUser from '../UserAccount/EditUser';

// Student Pages (uncomment when ready)
// import StudentDashboard from '../Pages/StudentDashboard';
// import StudentProfile from '../Pages/StudentProfile';
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
            {/* <Route path="/staff/dashboard" element={<StaffDashboard />} /> */}
            {/* <Route path="/staff/profile" element={<StaffProfile />} /> */}
            <Route path="/authority/schedule" element={<ViewClassSchedule />} />
            <Route path="/authority/schedule/add" element={<AddClassSchedule />} />
            <Route path="/authority/schedule/edit/:classId" element={<EditClassSchedule />} />
            {/* <Route path="/staff/payment" element={<StaffPayment />} /> */}
            <Route path="/staff/payments" element={<StaffPayment />} />
            <Route path="/staff/materials" element={<StaffClasses />} />
            <Route path="/staff/materials/class/:classId" element={<StaffMaterials />} />
            <Route path="/staff/materials/add" element={<AddMaterial />} />
            <Route path="/staff/materials/edit/:materialId" element={<EditMaterial />} />
            <Route path="/staff/testmarks/class/:classId" element={<StaffTestMarks />} />
            <Route path="/staff/attendance" element={<StaffAttendance />} />
            <Route path="/staff/attendance/class/:classId" element={<RecordAttendance />} />

            {/* Admin Routes (uncomment when ready) */}
            {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users/add" element={<AddUser />} />
            <Route path="/admin/users/edit/:userType/:userId" element={<EditUser />} />
            <Route path="/authority/schedule" element={<ViewClassSchedule />} />
            <Route path="/authority/schedule/add" element={<AddClassSchedule />} />
            <Route path="/authority/schedule/edit/:classId" element={<EditClassSchedule />} />

            {/* Student Routes (uncomment when ready) */}
            {/* <Route path="/student/dashboard" element={<StudentDashboard />} /> */}
            {/* <Route path="/student/profile" element={<StudentProfile />} /> */}
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