import { useState, useEffect, useRef } from "react";
import "../styles/voiceToText.css";

const VoiceToText = ({ onTranscript, isActive, setIsActive }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [errorCount, setErrorCount] = useState(0);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    // Check if browser supports speech recognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported in this browser");
      return false;
    }

    try {
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

        // Handle different error types
        if (event.error === "aborted" || event.error === "network") {
          // For aborted errors, we'll reinitialize and try again
          setErrorCount((prev) => prev + 1);

          // If we get too many errors in a row, stop trying
          if (errorCount > 3) {
            setIsListening(false);
            setIsActive(false);
            return;
          }

          // Allow some time before reinitializing
          setTimeout(() => {
            if (isActive) {
              initializeSpeechRecognition();
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to restart after error:", e);
                setIsListening(false);
                setIsActive(false);
              }
            }
          }, 300);
        } else {
          // For other errors, just stop
          setIsListening(false);
          setIsActive(false);
        }
      };

      // Handle when recognition ends
      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart if we're still supposed to be listening
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart on end:", e);
            // If restarting fails, reinitialize
            setTimeout(() => {
              if (isListening) {
                initializeSpeechRecognition();
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.error("Failed to restart after reinitializing:", err);
                  setIsListening(false);
                  setIsActive(false);
                }
              }
            }, 300);
          }
        } else {
          setIsActive(false);
        }
      };

      return true;
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      return false;
    }
  };

  // Initialize on component mount
  useEffect(() => {
    initializeSpeechRecognition();

    return () => {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition during cleanup:", e);
        }
      }
    };
  }, []);

  // Reset error count when activating/deactivating
  useEffect(() => {
    if (isActive) {
      setErrorCount(0);
    }
  }, [isActive]);

  // Start/stop listening based on isActive prop
  useEffect(() => {
    if (isActive && !isListening) {
      // Make sure we have a recognition object
      if (!recognitionRef.current) {
        if (!initializeSpeechRecognition()) {
          setIsActive(false);
          return;
        }
      }

      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        // If start fails, try reinitializing
        setTimeout(() => {
          if (isActive) {
            if (initializeSpeechRecognition()) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to start after reinitializing:", e);
                setIsListening(false);
                setIsActive(false);
              }
            } else {
              setIsListening(false);
              setIsActive(false);
            }
          }
        }, 300);
      }
    } else if (!isActive && isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Failed to stop speech recognition:", error);
        }
      }
    }
  }, [isActive, isListening, setIsActive]);

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
