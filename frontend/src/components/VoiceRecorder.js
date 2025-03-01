// frontend/src/components/VoiceRecorder.js
import React, { useState } from 'react';

const VoiceRecorder = ({ token, examPaper, setMessages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          const audioBlob = event.data;
          setAudioUrl(URL.createObjectURL(audioBlob));
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      });
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceSubmit = async () => {
    const formData = new FormData();
    formData.append('audio', audioUrl);
    formData.append('examPaper', examPaper);

    const response = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    setMessages((prevMessages) => [...prevMessages, data.message]);
    setAudioUrl(null);
  };

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start Recording'}
      </button>
      {audioUrl && (
        <div>
          <audio controls src={audioUrl}></audio>
          <button onClick={handleVoiceSubmit}>Send Voice Message</button>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
