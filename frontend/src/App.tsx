import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import AuthPage from './components/AuthPage';
import NewPasswordForm from './components/NewPasswordForm'; // Import the NewPasswordForm component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} /> {/* Route for Signup and Sign In */}
        <Route path="/dashboard" element={<Dashboard />} /> {/* Route for Dashboard */}
        <Route path="/reset-password" element={<NewPasswordForm />} /> {/* Route for Reset Password */}
      </Routes>
    </Router>
  );
}

export default App;
