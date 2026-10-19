import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import TeacherHub from './TeacherHub';
import AdminHub from './AdminHub';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('sgs_token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/hub" 
          element={
            <PrivateRoute>
              <TeacherHub />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={<AdminHub />} 
        />
        <Route path="*" element={<Navigate to="/hub" />} />
      </Routes>
    </Router>
  );
}
