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
