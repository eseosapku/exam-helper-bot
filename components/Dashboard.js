import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import '../styles/Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const history = useHistory();

  // Fetch user data and dashboard content
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await axios.get('/api/user'); // Fetch user data
        setUser(userData.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    const fetchDashboardContent = async () => {
      try {
        const questionsData = await axios.get('/api/questions'); // Fetch questions
        setQuestions(questionsData.data);
        const matchesData = await axios.get('/api/matches'); // Fetch match data
        setMatches(matchesData.data);
      } catch (error) {
        console.error('Error fetching dashboard content:', error);
      }
    };

    fetchUserData();
    fetchDashboardContent();
  }, []);

  const handleAskQuestion = async (question) => {
    try {
      await axios.post('/api/questions', { question });
      alert('Your question has been submitted!');
    } catch (error) {
      console.error('Error submitting question:', error);
    }
  };

  const handleGetAnswer = async (paperId, questionNumber) => {
    try {
      const response = await axios.get(`/api/answer/${paperId}/${questionNumber}`);
      alert(`Answer: ${response.data.answer}`);
    } catch (error) {
      console.error('Error fetching answer:', error);
    }
  };

  const handleDownload = async (paperId) => {
    try {
      const response = await axios.get(`/api/download/${paperId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper_${paperId}.pdf`;
      document.body.appendChild(a);
      a.click();
    } catch (error) {
      console.error('Error downloading paper:', error);
    }
  };

  const handleLogout = () => {
    // Perform logout logic
    history.push('/login');
  };

  const handleGoToPayment = () => {
    history.push('/payment');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header>
        <h2>Welcome, {user.name}</h2>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      {user.subscription && !subscriptionActive && (
        <div className="subscription-banner">
          <p>Your subscription is active. Enjoy premium features!</p>
        </div>
      )}

      <div className="content">
        <div className="question-section">
          <h3>Ask a Question</h3>
          <textarea
            placeholder="Write your question here"
            onBlur={(e) => handleAskQuestion(e.target.value)}
          />
        </div>

        <div className="matches">
          <h3>Your Matches</h3>
          {matches.length === 0 ? (
            <p>No matches found.</p>
          ) : (
            matches.map((match) => (
              <div key={match.paper_id} className="match">
                <h4>{match.paper_title}</h4>
                <button onClick={() => handleGetAnswer(match.paper_id, match.question_number)}>
                  Get Answer
                </button>
                <button onClick={() => handleDownload(match.paper_id)}>
                  Download Paper
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {user.subscription && !subscriptionActive && (
        <div className="payment-success">
          <h2>Payment Successful!</h2>
          <p>Your subscription has been activated.</p>
          <button onClick={() => setSubscriptionActive(true)}>Go to Dashboard</button>
        </div>
      )}

      {user.subscription && subscriptionActive && (
        <div className="payment-cancel">
          <h2>Payment Cancelled</h2>
          <p>Your payment was not completed. Please try again.</p>
          <button onClick={handleGoToPayment}>Back to Payment</button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
