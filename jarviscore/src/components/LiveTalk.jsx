import { useState, useEffect, useRef } from "react";
import "../styles/liveTalk.css";
import { textToSpeech, playAudio } from "../services/elevenLabsApi";

const LiveTalk = ({
  isActive,
  setIsActive,
  onSendMessage,
  onReceiveResponse,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const errorCountRef = useRef(0);
  const wakewordDetectorRef = useRef(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported in this browser");
      return false;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const displayTranscript = finalTranscript || interimTranscript;
        if (displayTranscript) {
          setTranscript(displayTranscript);
        }

        if (finalTranscript) {
          handleSendMessage(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        errorCountRef.current++;

        if (errorCountRef.current > 3) {
          setIsListening(false);
          return;
        }

        if (isActive && isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart after error:", e);
            setIsListening(false);
          }
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening && isActive) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart on end:", e);
            setIsListening(false);
          }
        }
      };

      return true;
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      return false;
    }
  };

  // Initialize wake-word detection if available
  const initializeWakeWord = () => {
    console.log("Using browser speech recognition for wake word detection");

    try {
      const createWakeWordDetector = () => {
        if (
          !("webkitSpeechRecognition" in window) &&
          !("SpeechRecognition" in window)
        ) {
          return false;
        }

        const WakeWordRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        const wakeWordRecognition = new WakeWordRecognition();
        wakeWordRecognition.continuous = false;
        wakeWordRecognition.interimResults = false;
        wakeWordRecognition.maxAlternatives = 5;
        wakeWordRecognition.lang = "en-US";

        wakeWordRecognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          console.log("Wake word check:", transcript);

          if (
            transcript.includes("jarvis") ||
            transcript.includes("hey jarvis") ||
            transcript.includes("okay jarvis")
          ) {
            console.log("Wake word detected:", transcript);
            if (!isActive) {
              setIsActive(true);
            }
          }

          setTimeout(() => {
            if (!isActive) startWakeWordDetection();
          }, 1000);
        };

        wakeWordRecognition.onend = () => {
          if (!isActive) {
            setTimeout(() => {
              startWakeWordDetection();
            }, 1000);
          }
        };

        wakeWordRecognition.onerror = (event) => {
          console.error("Wake word detection error:", event.error);
          setTimeout(() => {
            if (!isActive) startWakeWordDetection();
          }, 2000);
        };

        return wakeWordRecognition;
      };

      const startWakeWordDetection = () => {
        if (!wakewordDetectorRef.current) {
          wakewordDetectorRef.current = createWakeWordDetector();
        }

        if (wakewordDetectorRef.current && !isActive) {
          try {
            wakewordDetectorRef.current.start();
            console.log("Wake word detection started");
          } catch (e) {
            console.error("Error starting wake word detection:", e);
          }
        }
      };

      if (!isActive) {
        startWakeWordDetection();
      }

      return true;
    } catch (error) {
      console.error("Error initializing wake word detection:", error);
      return false;
    }
  };

  // Handle sending message to API
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    setTranscript("");

    if (onSendMessage) {
      try {
        const response = await onSendMessage(message);
        if (response && response.content) {
          await speakText(response.content);

          if (onReceiveResponse) {
            onReceiveResponse(response);
          }
        }
      } catch (error) {
        console.error("Error in live talk processing:", error);
      }
    }
  };

  // Process text for more natural speech
  const processTextForSpeech = (text) => {
    let processedText = text
      .replace(/\s+/g, " ")
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/([.,;:!?])(\w)/g, "$1 $2")
      .trim();

    processedText = processedText
      .replace(/<[^>]*>/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\[[^\]]*\]/g, "");

    return processedText;
  };

  // Text-to-speech function using ElevenLabs API
  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      const processedText = processTextForSpeech(text);
      const audioBlob = await textToSpeech(processedText);
      await playAudio(audioBlob);
    } catch (error) {
      console.error("Error in text-to-speech:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) {
      if (!initializeSpeechRecognition()) {
        return;
      }
    }

    setIsListening(true);
    errorCountRef.current = 0;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
    }
  };

  // Stop listening
  const stopListening = () => {
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      }
    }
  };

  // Toggle listening state
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Initialize on component mount
  useEffect(() => {
    initializeSpeechRecognition();
    initializeWakeWord();

    if (isActive) {
      startListening();
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition during cleanup:", e);
        }
      }
    };
  }, [isActive]);

  // Start/stop listening based on isActive prop
  useEffect(() => {
    if (isActive && !isListening) {
      startListening();
    } else if (!isActive && isListening) {
      stopListening();
    }
  }, [isActive, isListening]);

  // Close the modal
  const handleClose = () => {
    stopListening();
    setIsActive(false);
  };

  if (!isActive) return null;

  return (
    <div className="live-talk-overlay">
      <div className="live-talk-modal">
        <div className="live-header">
          <div className="live-indicator">
            <i className="fa-solid fa-microphone"></i>
            <span>Live</span>
          </div>
        </div>

        <div className="live-content">
          {transcript && (
            <div className="live-transcript">
              <p>{transcript}</p>
            </div>
          )}
        </div>

        <div className="live-gradient"></div>

        <div className="live-controls">
          <button
            className="pause-button"
            onClick={toggleListening}
            disabled={isSpeaking}
            aria-label={isListening ? "Pause" : "Resume"}
          >
            {isListening ? (
              <i className="fa-solid fa-pause"></i>
            ) : (
              <i className="fa-solid fa-microphone"></i>
            )}
          </button>

          <button
            className="close-button"
            onClick={handleClose}
            disabled={isSpeaking}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveTalk;
