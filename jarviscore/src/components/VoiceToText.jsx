import { useState, useEffect, useRef } from "react";
import "../styles/voiceToText.css";

const VoiceToText = ({ onTranscript, isActive, setIsActive }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [errorCount, setErrorCount] = useState(0);
  const lastTranscriptRef = useRef("");
  const finalResultsRef = useRef([]); // Track all final results in the current session

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

      // Configure speech recognition for better responsiveness
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = "en-US";

      // Handle speech recognition results with improved responsiveness
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        // Process the results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Store this final result segment to avoid reprocessing it
            if (!finalResultsRef.current.includes(i)) {
              finalResultsRef.current.push(i);
              finalTranscript += transcript;
            }
          } else {
            interimTranscript += transcript;
          }
        }

        // Set the transcript for UI display
        const displayTranscript = finalTranscript || interimTranscript;
        if (displayTranscript) {
          setTranscript(displayTranscript);
        }

        // Handle final results - only send new content to parent
        if (finalTranscript) {
          // Avoid sending the same text again
          if (finalTranscript !== lastTranscriptRef.current) {
            lastTranscriptRef.current = finalTranscript;
            onTranscript(finalTranscript);
          }
        }
        // Handle interim results - only for immediate feedback
        else if (interimTranscript) {
          const cleanInterim = interimTranscript.trim();

          // Only process significant interim results (> 3 chars) that are different from last sent
          if (
            cleanInterim.length > 3 &&
            cleanInterim !== lastTranscriptRef.current &&
            !lastTranscriptRef.current.includes(cleanInterim) &&
            !cleanInterim.includes(lastTranscriptRef.current)
          ) {
            lastTranscriptRef.current = cleanInterim;
            onTranscript(cleanInterim);
          }
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

          // Reinitialize more quickly
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
            // If restarting fails, reinitialize immediately
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

  // Handle Enter key press to stop voice recognition
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && isActive) {
        e.preventDefault();
        setIsActive(false);
      }
    };

    if (isActive) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isActive, setIsActive]);

  // Reset error count and last transcript when activating/deactivating
  useEffect(() => {
    if (isActive) {
      setErrorCount(0);
      lastTranscriptRef.current = "";
      finalResultsRef.current = []; // Reset final results tracking
      setTranscript(""); // Clear transcript display
    }
  }, [isActive]);

  // Start/stop listening based on isActive prop with improved responsiveness
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
        // If start fails, try reinitializing immediately
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
            <div className="wave wave4"></div>
            <div className="wave wave5"></div>
            <div className="wave wave6"></div>
            <div className="wave wave7"></div>
            <div className="wave wave8"></div>
            <div className="wave wave9"></div>
          </div>
          <div className="voice-status">Listening...</div>
        </>
      )}
    </div>
  );
};

export default VoiceToText;
