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
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  const transcriptTimerRef = useRef(null);
  const assistantTimerRef = useRef(null);
  const isRecognitionActiveRef = useRef(false);
  const restartTimeoutRef = useRef(null);

  // Simple function to create a new speech recognition instance
  const createSpeechRecognition = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported in this browser");
      return null;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-US";

      return recognition;
    } catch (error) {
      console.error("Error creating speech recognition:", error);
      return null;
    }
  };

  // Initialize speech recognition with a clean slate
  const initializeSpeechRecognition = () => {
    // First, stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }

    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Reset the active flag
    isRecognitionActiveRef.current = false;

    // Create a new recognition instance
    const recognition = createSpeechRecognition();
    if (!recognition) {
      return false;
    }

    // Set up event handlers
    recognition.onstart = () => {
      console.log("Speech recognition started");
      isRecognitionActiveRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
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

        // Clear any existing timer
        if (transcriptTimerRef.current) {
          clearTimeout(transcriptTimerRef.current);
        }

        // Set timer to clear transcript after speaking
        if (finalTranscript) {
          transcriptTimerRef.current = setTimeout(() => {
            setTranscript("");
          }, 3000);
        }
      }

      if (finalTranscript) {
        handleSendMessage(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // Handle specific error types
      switch (event.error) {
        case "no-speech":
          // This is not a serious error, just continue
          break;
        case "aborted":
          // This happens when we manually stop recognition
          isRecognitionActiveRef.current = false;
          setIsListening(false);
          return;
        default:
          // For other errors, try to restart
          isRecognitionActiveRef.current = false;

          // Only restart if we're supposed to be listening
          if (isActive && isListening) {
            // Clear any existing restart timeout
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
            }

            // Try to restart after a delay
            restartTimeoutRef.current = setTimeout(() => {
              // Create a completely new instance
              initializeSpeechRecognition();
              startListening();
            }, 1000);
          }
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      isRecognitionActiveRef.current = false;

      // Only restart if we're supposed to be listening
      if (isListening && isActive) {
        // Clear any existing restart timeout
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }

        // Try to restart after a delay
        restartTimeoutRef.current = setTimeout(() => {
          // Create a completely new instance
          initializeSpeechRecognition();
          startListening();
        }, 500);
      } else {
        setIsListening(false);
      }
    };

    // Store the recognition instance
    recognitionRef.current = recognition;
    return true;
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

    // Don't clear transcript immediately to allow displaying what user said
    // It will auto-clear after the timeout

    if (onSendMessage) {
      try {
        // Stop any currently playing audio
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
          currentAudioRef.current = null;
        }

        // Use the provided onSendMessage which is now our direct API call
        const response = await onSendMessage(message);
        if (response && response.content) {
          // Display assistant response as captions
          showAssistantSpeech(response.content);
          // Speak the response
          await speakText(response.content);
        }
      } catch (error) {
        console.error("Error in live talk processing:", error);
        showAssistantSpeech(
          "I apologize, but I encountered an error processing your request."
        );
      }
    }
  };

  // Show assistant speech as captions
  const showAssistantSpeech = (text) => {
    setAssistantTranscript(text);

    // Clear previous timer if exists
    if (assistantTimerRef.current) {
      clearTimeout(assistantTimerRef.current);
    }

    // Auto-clear assistant transcript after speaking
    // Calculate display time based on text length and speaking speed
    const wordsPerMinute = 150; // Average speaking speed
    const words = text.split(/\s+/).length;
    const speakingTimeMs = (words / wordsPerMinute) * 60 * 1000;
    const minDisplayTime = 3000; // Minimum display time
    const displayTime = Math.max(speakingTimeMs, minDisplayTime);

    assistantTimerRef.current = setTimeout(() => {
      setAssistantTranscript("");
    }, displayTime + 1000); // Add 1 second buffer
  };

  // Text-to-speech function using ElevenLabs API with faster speed
  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      const processedText = processTextForSpeech(text);

      // Stop any currently playing audio before starting new one
      if (currentAudioRef.current) {
        console.log("Stopping current audio");
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      console.log("Processing full text without chunking:", processedText);
      const audioBlob = await textToSpeech(processedText);
      console.log("Playing full audio response");
      currentAudioRef.current = await playAudio(audioBlob);
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      showAssistantSpeech(
        "I apologize, but I encountered an error with the text-to-speech system."
      );
    } finally {
      setIsSpeaking(false);
    }
  };

  // Process text for more natural speech with optimized speed
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

    // Add strategic pauses for more natural speech flow
    processedText = processedText
      .replace(/\. /g, ". <break time='300ms'> ")
      .replace(/\! /g, "! <break time='300ms'> ")
      .replace(/\? /g, "? <break time='300ms'> ");

    return processedText;
  };

  // Start listening - simplified approach
  const startListening = () => {
    // Don't start if recognition is already active
    if (isRecognitionActiveRef.current) {
      console.log("Recognition already active, skipping start");
      return;
    }

    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Initialize recognition if needed
    if (!recognitionRef.current) {
      if (!initializeSpeechRecognition()) {
        console.error("Failed to initialize speech recognition");
        return;
      }
    }

    setIsListening(true);

    try {
      console.log("Starting speech recognition");
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);

      // If we get an "already started" error, just reset the flag
      if (
        error.name === "InvalidStateError" &&
        error.message.includes("already started")
      ) {
        console.log("Recognition was already started, resetting state");
        isRecognitionActiveRef.current = true;
        return;
      }

      // For other errors, try to reinitialize
      initializeSpeechRecognition();

      if (isActive) {
        // Try again after a delay
        setTimeout(() => {
          if (!isRecognitionActiveRef.current) {
            startListening();
          }
        }, 1000);
      }
    }
  };

  // Stop listening - simplified approach
  const stopListening = () => {
    setIsListening(false);

    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      }
    }

    isRecognitionActiveRef.current = false;
  };

  // Toggle listening state
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      // Create a completely new recognition instance
      initializeSpeechRecognition();
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
      // Clean up on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition during cleanup:", e);
        }
      }

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      if (transcriptTimerRef.current) {
        clearTimeout(transcriptTimerRef.current);
      }

      if (assistantTimerRef.current) {
        clearTimeout(assistantTimerRef.current);
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
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Clear any timers
    if (transcriptTimerRef.current) {
      clearTimeout(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
    }

    if (assistantTimerRef.current) {
      clearTimeout(assistantTimerRef.current);
      assistantTimerRef.current = null;
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    setIsActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }

      if (transcriptTimerRef.current) {
        clearTimeout(transcriptTimerRef.current);
      }

      if (assistantTimerRef.current) {
        clearTimeout(assistantTimerRef.current);
      }

      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

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
            <div className="user-transcript caption">
              <p>{transcript}</p>
            </div>
          )}

          {assistantTranscript && (
            <div className="assistant-transcript caption">
              <p>{assistantTranscript}</p>
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
