import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();  // useNavigate instead of history.push

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');  // Reset previous errors

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Successfully logged in
      setToken(data.token);  // Update the token in the parent component
      localStorage.setItem('userId', data.user_id);
      localStorage.setItem('subscriptionStatus', data.subscription_status);
      
      // Reset form fields
      setEmail('');
      setPassword('');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);  // Display error message
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Exam Helper</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;
