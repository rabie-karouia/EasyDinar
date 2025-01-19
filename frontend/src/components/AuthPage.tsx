import React from 'react';
import SignupForm from './SignupForm';
import SignInForm from './SignInForm';
import './AuthPage.css';


const AuthPage = () => {
  return (
    <div className="auth-container">
      <div className="form-container">
        <SignupForm />
      </div>
      <div className="form-container">
        <SignInForm />
      </div>
    </div>
  );
};

export default AuthPage;
