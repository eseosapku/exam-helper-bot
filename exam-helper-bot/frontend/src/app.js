// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);
  
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/">
            {token ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
          </Route>
          <Route path="/login">
            <Login setToken={setToken} />
          </Route>
          <Route path="/register">
            <Register setToken={setToken} />
          </Route>
          <Route path="/dashboard">
            {token ? <Dashboard token={token} setToken={setToken} /> : <Redirect to="/login" />}
          </Route>
          <Route path="/payment-success">
            <PaymentSuccess token={token} />
          </Route>
          <Route path="/payment-cancel">
            <PaymentCancel />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;

// src/components/Login.js
import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import '../styles/Auth.css';

function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
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
      
      setToken(data.token);
      localStorage.setItem('userId', data.user_id);
      localStorage.setItem('subscriptionStatus', data.subscription_status);
      history.push('/dashboard');
    } catch (err) {
      setError(err.message);
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

// src/components/Register.js
import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import '../styles/Auth.css';

function Register({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      setToken(data.token);
      localStorage.setItem('userId', data.user_id);
      localStorage.setItem('subscriptionStatus', 'inactive');
      history.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div className="auth-container">
      <h2>Register for Exam Helper</h2>
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
        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Register;

// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import '../styles/Dashboard.css';

function Dashboard({ token, setToken }) {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [answer, setAnswer] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(
    localStorage.getItem('subscriptionStatus') || 'inactive'
  );
  const history = useHistory();
  
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setSelectedMatch(null);
    setAnswer('');
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question }),
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        setToken(null);
        history.push('/login');
        return;
      }
      
      if (response.status === 403) {
        // Subscription required
        setSubscriptionStatus('inactive');
        return;
      }
      
      const data = await response.json();
      setResponse(data);
    } catch (err) {
      console.error('Error asking question:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGetAnswer = async (paperId, questionNumber) => {
    setLoading(true);
    setAnswer('');
    
    try {
      const response = await fetch(`/api/answer/${paperId}/${questionNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      
      const data = await response.json();
      setAnswer(data.answer);
      setSelectedMatch({
        paper_id: paperId,
        number: questionNumber
      });
    } catch (err) {
      console.error('Error getting answer:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async (paperId) => {
    try {
      window.open(`/api/download/${paperId}?token=${token}`, '_blank');
    } catch (err) {
      console.error('Error downloading paper:', err);
    }
  };
  
  const handleSubscribe = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      const session = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = session.id;
    } catch (err) {
      console.error('Error creating checkout session:', err);
    }
  };
  
  const handleLogout = () => {
    setToken(null);
    history.push('/login');
  };
  
  return (
    <div className="dashboard">
      <header>
        <h1>Exam Helper</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>
      
      {subscriptionStatus !== 'active' && (
        <div className="subscription-banner">
          <p>Subscribe to access all features</p>
          <button onClick={handleSubscribe}>Subscribe for $50/month</button>
        </div>
      )}
      
      <div className="content">
        <div className="question-section">
          <h2>Ask a Question</h2>
          <form onSubmit={handleAskQuestion}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here..."
              required
            />
            <button type="submit" disabled={loading || subscriptionStatus !== 'active'}>
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </form>
        </div>
        
        {response && (
          <div className="response-section">
            <h3>{response.message}</h3>
            
            {response.matches && response.matches.length > 0 && (
              <div className="matches">
                <h4>Similar Questions:</h4>
                <ul>
                  {response.matches.map((match, index) => (
                    <li key={index}>
                      <div className="match-details">
                        <p>
                          <strong>Subject:</strong> {match.subject} ({match.year})
                        </p>
                        <p>
                          <strong>Question {match.number}:</strong> {match.text.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="match-actions">
                        <button
                          onClick={() => handleGetAnswer(match.paper_id, match.number)}
                          disabled={loading}
                        >
                          Get Answer
                        </button>
                        <button
                          onClick={() => handleDownload(match.paper_id)}
                          disabled={loading}
                        >
                          Download Paper
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {response.answer && (
              <div className="direct-answer">
                <h4>Answer:</h4>
                <p>{response.answer}</p>
              </div>
            )}
          </div>
        )}
        
        {selectedMatch && answer && (
          <div className="answer-section">
            <h3>Answer for Question {selectedMatch.number}</h3>
            <div className="answer-content">
              <p>{answer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

// src/components/PaymentSuccess.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function PaymentSuccess({ token }) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Update subscription status in local storage
    localStorage.setItem('subscriptionStatus', 'active');
    
    // Simulate checking the subscription status
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);
  
  return (
    <div className="payment-result">
      <h2>Payment Successful!</h2>
      {loading ? (
        <p>Updating your subscription status...</p>
      ) : (
        <>
          <p>Your subscription is now active. You can now access all features of Exam Helper.</p>
          <Link to="/dashboard">
            <button>Go to Dashboard</button>
          </Link>
        </>
      )}
    </div>
  );
}

export default PaymentSuccess;

// src/components/PaymentCancel.js
import React from 'react';
import { Link } from 'react-router-dom';

function PaymentCancel() {
  return (
    <div className="payment-result">
      <h2>Payment Canceled</h2>
      <p>Your subscription payment was canceled. You can try again later.</p>
      <Link to="/dashboard">
        <button>Back to Dashboard</button>
      </Link>
    </div>
  );
}

export default PaymentCancel;