import { useState, useEffect, useRef } from "react";
import "../styles/liveTalk.css";

const LiveTalk = ({
  isActive,
  setIsActive,
  onSendMessage,
  onReceiveResponse,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
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

  // Initialize speech synthesis
  const initializeSpeechSynthesis = () => {
    if (!("speechSynthesis" in window)) {
      console.error("Speech synthesis not supported in this browser");
      return false;
    }

    synthRef.current = window.speechSynthesis;

    // Force load voices
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      console.log(
        "Available voices:",
        voices.map((v) => `${v.name} (${v.lang})`)
      );
    };

    loadVoices();

    // Chrome requires an event listener for voices to be loaded
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return true;
  };

  // Initialize wake-word detection if available
  const initializeWakeWord = () => {
    // Web Speech API based wake word detection
    console.log("Using browser speech recognition for wake word detection");

    try {
      // Create a simple wake word detector using the Web Speech API
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

          // Check for wake words - "jarvis", "hey jarvis", etc.
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

          // Restart listening for wake word
          setTimeout(() => {
            if (!isActive) startWakeWordDetection();
          }, 1000);
        };

        wakeWordRecognition.onend = () => {
          // Restart if we're not in active mode
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

      // Function to start wake word detection
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

      // Start wake word detection if not in active mode
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
  const handleSendMessage = (message) => {
    if (!message.trim()) return;

    // Reset transcript after sending
    setTranscript("");

    // Send message to parent component to process with API
    if (onSendMessage) {
      onSendMessage(message)
        .then((response) => {
          if (response && response.content) {
            // Speak the response
            speakText(response.content);

            // Pass response to parent if needed
            if (onReceiveResponse) {
              onReceiveResponse(response);
            }
          }
        })
        .catch((error) => {
          console.error("Error in live talk processing:", error);
        });
    }
  };

  // Process text for more natural speech
  const processTextForSpeech = (text) => {
    // Clean up the text
    let processedText = text
      // Fix awkward spacing
      .replace(/\s+/g, " ")
      // Fix spacing around punctuation
      .replace(/\s+([.,;:!?])/g, "$1")
      // Add proper spacing after punctuation
      .replace(/([.,;:!?])(\w)/g, "$1 $2")
      // Clean up any remaining issues
      .trim();

    // Remove any HTML or code-like syntax that might cause issues
    processedText = processedText
      .replace(/<[^>]*>/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\[[^\]]*\]/g, "");

    // Add pauses using commas for natural speech in Web Speech API
    processedText = processedText
      .replace(
        /(I believe|In my opinion|As you requested|If you prefer)/g,
        ", $1,"
      )
      .replace(
        /(however|moreover|furthermore|in addition|alternatively)/gi,
        ", $1,"
      );

    return processedText;
  };

  // Text-to-speech function using Web Speech API
  const speakText = (text) => {
    // Force cancel any existing speech
    cancelSpeech();

    // Wait a bit before starting new speech (helps prevent cutoffs)
    setTimeout(() => {
      // Process the text for more natural speech
      const processedText = processTextForSpeech(text);

      // Use Web Speech API for speech
      useSpeechSynthesis(processedText);
    }, 100); // Short delay before starting speech
  };

  // Use Web Speech API with British voice settings
  const useSpeechSynthesis = (text) => {
    if (!synthRef.current) return;

    try {
      // Make sure any existing speech is canceled
      synthRef.current.cancel();

      // Create utterance for the entire text
      const utterance = new SpeechSynthesisUtterance(text);

      // Get all available voices
      const voices = synthRef.current.getVoices();

      console.log(
        "Finding voice from available options:",
        voices.map((v) => `${v.name} (${v.lang})`).join(", ")
      );

      // British voice options in priority order
      const britishVoiceOptions = [
        "Daniel",
        "Google UK English Male",
        "Microsoft George - English (United Kingdom)",
        "UK English Male",
        "British Male",
        "English United Kingdom",
      ];

      // Find the best British voice available
      let selectedVoice = null;
      for (const voiceName of britishVoiceOptions) {
        const foundVoice = voices.find(
          (v) =>
            v.name.includes(voiceName) ||
            (v.name.toLowerCase().includes("uk") &&
              v.name.toLowerCase().includes("male"))
        );
        if (foundVoice) {
          selectedVoice = foundVoice;
          console.log(`Found matching voice: ${foundVoice.name}`);
          break;
        }
      }

      // If no match found, try broader criteria for British male voices
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (voice) =>
            ((voice.name.toLowerCase().includes("brit") ||
              voice.name.toLowerCase().includes("uk") ||
              voice.name.toLowerCase().includes("engl")) &&
              voice.name.toLowerCase().includes("male")) ||
            (voice.lang === "en-GB" &&
              !voice.name.toLowerCase().includes("female"))
        );

        if (selectedVoice) {
          console.log(`Found broader match voice: ${selectedVoice.name}`);
        }
      }

      // Final fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find((voice) => voice.lang.includes("en"));
        if (selectedVoice) {
          console.log(`Using fallback English voice: ${selectedVoice.name}`);
        } else {
          // Ultimate fallback - use the first available voice
          selectedVoice = voices[0];
          console.log(
            `Using first available voice: ${
              selectedVoice?.name || "None available"
            }`
          );
        }
      }

      // Set the voice if found
      if (selectedVoice) {
        console.log("Selected British voice:", selectedVoice.name);
        utterance.voice = selectedVoice;
      } else {
        console.warn("No suitable voice found, using browser default");
      }

      // Configure for a calm assistant voice as requested
      utterance.lang = "en-GB";
      utterance.rate = 0.85; // Slower for calm, natural pacing
      utterance.pitch = 0.9; // Slightly lower for calm authority
      utterance.volume = 1.0; // Full volume for clarity

      console.log("Speech settings:", {
        voice: utterance.voice?.name || "default",
        rate: utterance.rate,
        pitch: utterance.pitch,
      });

      // Event handlers
      utterance.onstart = () => {
        console.log("Speech started with Web Speech API");
      };

      utterance.onend = () => {
        console.log("Speech ended with Web Speech API");
        // Wait a bit before resuming listening
        setTimeout(() => {
          if (isActive && !isListening) {
            startListening();
          }
        }, 300);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        // Try to recover if possible
        if (isActive && !isListening) {
          startListening();
        }
      };

      // Speak the text
      synthRef.current.speak(utterance);
    } catch (error) {
      console.error("Speech synthesis error:", error);
      // Ensure we recover from errors
      if (isActive && !isListening) {
        startListening();
      }
    }
  };

  // Cancel any ongoing speech
  const cancelSpeech = () => {
    try {
      // Stop Web Speech API speech
      if (synthRef.current) {
        console.log("Canceling speech");
        synthRef.current.cancel();
      }

      // Double-check cancelation worked
      setTimeout(() => {
        if (synthRef.current && synthRef.current.speaking) {
          synthRef.current.cancel();
        }
      }, 100);
    } catch (error) {
      console.error("Error canceling speech:", error);
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
    initializeSpeechSynthesis();

    // Initialize wake word detection with fallback approach
    initializeWakeWord();

    // Start listening when component mounts
    if (isActive) {
      startListening();
    }

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition during cleanup:", e);
        }
      }

      cancelSpeech();

      if (synthRef.current) {
        synthRef.current.onvoiceschanged = null;
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
    // Stop listening first
    stopListening();

    // Force immediate cancellation of all speech
    try {
      // Cancel speech synthesis with higher priority
      if (synthRef.current) {
        synthRef.current.cancel();
        // Force another cancellation to be sure
        setTimeout(() => synthRef.current.cancel(), 10);
      }
    } catch (e) {
      console.error("Error stopping speech during close:", e);
    }

    // Only after cleanup, set the modal to inactive
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
