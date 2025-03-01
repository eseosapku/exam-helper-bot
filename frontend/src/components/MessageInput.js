// frontend/src/components/MessageInput.js
import React, { useState } from 'react';
import '../styles/MessageInput.css';  // Updated path

const MessageInput = ({ token, examPaper, setMessages }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', text);
    formData.append('examPaper', examPaper);
    formData.append('file', file);

    const response = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    
    const data = await response.json();
    setMessages((prevMessages) => [...prevMessages, data.message]);
    setText('');
    setFile(null);
  };

  return (
    <form className="message-input" onSubmit={handleTextSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        required
      />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Send</button>
    </form>
  );
};

export default MessageInput;
