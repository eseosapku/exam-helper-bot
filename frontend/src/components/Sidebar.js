// frontend/src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';  // Updated path


const Sidebar = ({ setExamPaper }) => {
  const [examPapers, setExamPapers] = useState([]);

  useEffect(() => {
    // Fetch the list of saved exam papers
    const fetchExamPapers = async () => {
      const response = await fetch('/api/exam-papers');
      const data = await response.json();
      setExamPapers(data.examPapers);
    };
    
    fetchExamPapers();
  }, []);

  return (
    <div className="sidebar">
      <h3>Saved Exam Chats</h3>
      <ul>
        {examPapers.map((exam, index) => (
          <li key={index} onClick={() => setExamPaper(exam)}>
            {exam}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
