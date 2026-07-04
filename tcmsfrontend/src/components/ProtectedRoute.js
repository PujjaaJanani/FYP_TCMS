import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// allowedRoles should match your token abilities: 'admin', 'staff', 'student', 'parent'
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // swap for a spinner component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role ? user.role.toLowerCase() : user.userType; // covers admin/staff (role) vs student/parent (userType)

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}