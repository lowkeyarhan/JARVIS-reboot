import { useState, useEffect, useRef } from "react";
import "../styles/voiceToText.css";

const VoiceToText = ({ onTranscript, isActive, setIsActive }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported in this browser");
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    // Configure speech recognition
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    // Handle speech recognition results
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Process the results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Set the transcript and pass it to parent component
      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    // Handle errors
    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setIsActive(false);
    };

    // Handle when recognition ends
    recognitionRef.current.onend = () => {
      if (isListening) {
        // Restart if we're still supposed to be listening
        recognitionRef.current.start();
      } else {
        setIsActive(false);
      }
    };

    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, isListening, setIsActive]);

  // Start/stop listening based on isActive prop
  useEffect(() => {
    if (isActive && !isListening) {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    } else if (!isActive && isListening) {
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      }
    }
  }, [isActive, isListening]);

  return (
    <div className={`voice-indicator ${isActive ? "active" : ""}`}>
      {isActive && (
        <>
          <div className="voice-waves">
            <div className="wave wave1"></div>
            <div className="wave wave2"></div>
            <div className="wave wave3"></div>
          </div>
          <div className="voice-status">Listening...</div>
        </>
      )}
    </div>
  );
};

export default VoiceToText;
