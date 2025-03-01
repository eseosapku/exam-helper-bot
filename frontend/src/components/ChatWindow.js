// frontend/src/components/ChatWindow.js
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MessageInput from './MessageInput';
import VoiceRecorder from './VoiceRecorder';
import './ChatWindow.css';

const ChatWindow = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [examPaper, setExamPaper] = useState(null); // State to store the selected exam paper for chat history

  // Fetching chat history based on the selected exam paper
  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/api/chat-history?exam=${examPaper}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data.messages);
    };

    if (examPaper) {
      fetchMessages();
    }
  }, [examPaper, token]);

  return (
    <div className="chat-window-container">
      <Sidebar setExamPaper={setExamPaper} />
      <div className="chat-content">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className="message">
              <p>{message.text}</p>
              {message.image && <img src={message.image} alt="upload" />}
              {message.audio && <audio controls src={message.audio} />}
            </div>
          ))}
        </div>
        <MessageInput token={token} examPaper={examPaper} setMessages={setMessages} />
        <VoiceRecorder token={token} examPaper={examPaper} setMessages={setMessages} />
      </div>
    </div>
  );
};

export default ChatWindow;
