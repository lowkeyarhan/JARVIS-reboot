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
  const [isResponsiveVoiceReady, setIsResponsiveVoiceReady] = useState(false);

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
    return true;
  };

  // Initialize ResponsiveVoice
  const initializeResponsiveVoice = () => {
    // Check if already loaded
    if (window.responsiveVoice) {
      setIsResponsiveVoiceReady(true);
      return;
    }

    // Load ResponsiveVoice script dynamically
    const script = document.createElement("script");
    script.src =
      "https://code.responsivevoice.org/responsivevoice.js?key=cGTCJPOj";
    script.async = true;
    script.onload = () => {
      if (window.responsiveVoice) {
        window.responsiveVoice.init();
        console.log(
          "ResponsiveVoice loaded with voices:",
          window.responsiveVoice.getVoices()
        );
        setIsResponsiveVoiceReady(true);
      }
    };
    document.body.appendChild(script);

    // Add fallback in case the script fails to load
    script.onerror = () => {
      console.error("Failed to load ResponsiveVoice, using native speech");
      setIsResponsiveVoiceReady(false);
    };
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

    // For some responses, add pauses and emphasis in key places
    if (processedText.length > 20) {
      // Add subtle emphasis to key phrases
      processedText = processedText
        .replace(
          /(I believe|In my opinion|As you requested|If you prefer)/g,
          ", $1,"
        )
        .replace(
          /(however|moreover|furthermore|in addition|alternatively)/gi,
          ", $1,"
        );
    }

    return processedText;
  };

  // Text-to-speech function using ResponsiveVoice when available, fallback to native TTS
  const speakText = (text) => {
    // Ensure we don't have any ongoing speech
    cancelSpeech();

    // Wait a bit before starting new speech (helps prevent cutoffs)
    setTimeout(() => {
      // Process the text for more natural speech
      const processedText = processTextForSpeech(text);

      // Try to use ResponsiveVoice (preferred)
      if (
        isResponsiveVoiceReady &&
        window.responsiveVoice &&
        window.responsiveVoice.voiceSupport()
      ) {
        console.log("Using ResponsiveVoice for speech");

        // JARVIS from Iron Man style voice parameters
        const jarvisVoiceParams = {
          pitch: 1.0, // Natural pitch
          rate: 0.85, // Slower pace for clarity and sophistication
          volume: 0.9, // Slightly soft but clear

          // Timbre/tone adjustments
          equalizer: {
            1: -2, // Reduce lowest frequencies for clarity
            2: 0, // Keep low-mids natural
            3: 1, // Slight boost to mid-range for warmth
            4: -1, // Slight reduction in high-mids
            5: -3, // Reduce highest frequencies for softness
          },

          // Premium voice enhancements
          variant: "male",

          // Events
          onstart: () => console.log("JARVIS voice started speaking"),
          onend: () => {
            console.log("JARVIS voice finished speaking");
            // Wait a bit before resuming listening to avoid self-triggering
            setTimeout(() => {
              // Resume listening after speaking
              if (isActive && !isListening) {
                startListening();
              }
            }, 300);
          },
          onerror: (error) => console.error("ResponsiveVoice error:", error),
        };

        // JARVIS-like voice options in order of preference
        const jarvisVoiceOptions = [
          "UK English Male", // Most widely available
          "British Male",
          "Daniel", // Premium British voices
          "George", // Cultured British accent
          "James", // Refined British accent
          "Microsoft George - English (United Kingdom)",
          "Microsoft Hazel - English (United Kingdom)",
        ];

        // Find the best available voice
        let jarvisVoice = "UK English Male"; // default
        for (const voice of jarvisVoiceOptions) {
          if (
            window.responsiveVoice.getVoices().some((v) => v.name === voice)
          ) {
            jarvisVoice = voice;
            console.log(`Selected JARVIS voice: ${jarvisVoice}`);
            break;
          }
        }

        // Create speech parameters based on text length
        const speechParams = { ...jarvisVoiceParams };

        // For longer responses, speak in a single continuous stream
        if (processedText.length > 100) {
          speechParams.rate = 0.88; // Slightly faster for longer content
        }

        // Speak with the selected voice
        try {
          window.responsiveVoice.speak(
            processedText,
            jarvisVoice,
            speechParams
          );
        } catch (error) {
          console.error("ResponsiveVoice speak error:", error);
          // Fallback to native speech if ResponsiveVoice fails
          useFallbackSpeech(processedText);
        }
        return;
      }

      // Fallback to native Web Speech API
      console.log("Fallback to native speech synthesis");
      useFallbackSpeech(processedText);
    }, 100); // Short delay before starting speech
  };

  // Fallback to native Web Speech API with better handling
  const useFallbackSpeech = (text) => {
    if (!synthRef.current) return;

    try {
      // Cancel any existing speech first
      synthRef.current.cancel();

      // Create utterance for the entire text
      const utterance = new SpeechSynthesisUtterance(text);

      // Get all available voices
      const voices = synthRef.current.getVoices();

      // JARVIS-like British voice options in priority order
      const jarvisVoiceOptions = [
        "Daniel (Enhanced)",
        "Daniel",
        "Microsoft George - English (United Kingdom)",
        "Google UK English Male",
        "UK English Male",
        "British Male",
        "English United Kingdom", // Safari often has this one
      ];

      // Find the most JARVIS-like voice available
      let selectedVoice = null;
      for (const voiceName of jarvisVoiceOptions) {
        const foundVoice = voices.find(
          (v) =>
            v.name.includes(voiceName) ||
            (v.name.toLowerCase().includes("uk") &&
              v.name.toLowerCase().includes("male"))
        );
        if (foundVoice) {
          selectedVoice = foundVoice;
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
      }

      // Final fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find((voice) => voice.lang.includes("en"));
      }

      // Set the voice if found
      if (selectedVoice) {
        console.log("Using JARVIS-like native voice:", selectedVoice.name);
        utterance.voice = selectedVoice;
      }

      // Configure for a JARVIS-like voice
      utterance.lang = "en-GB";
      utterance.rate = 0.88; // Slower for clarity and gravitas
      utterance.pitch = 0.95; // Slightly lower for authority
      utterance.volume = 0.95; // Clear but not too loud

      // Use a single utterance for the entire text to avoid interruptions
      utterance.onstart = () => {
        console.log("JARVIS native speech started");
      };

      utterance.onend = () => {
        console.log("JARVIS native speech ended");
        // Wait a bit before resuming listening
        setTimeout(() => {
          if (isActive && !isListening) {
            startListening();
          }
        }, 300);
      };

      utterance.onerror = (event) => {
        console.error("JARVIS speech synthesis error:", event);
        // Try to recover if possible
        if (isActive && !isListening) {
          startListening();
        }
      };

      // Speak the text in one go to prevent interruptions
      synthRef.current.speak(utterance);
    } catch (error) {
      console.error("Native speech error:", error);
      // Ensure we recover from errors
      if (isActive && !isListening) {
        startListening();
      }
    }
  };

  // Cancel any ongoing speech
  const cancelSpeech = () => {
    try {
      // Ensure we stop any ResponsiveVoice speech
      if (window.responsiveVoice && window.responsiveVoice.isPlaying()) {
        console.log("Canceling ResponsiveVoice speech");
        window.responsiveVoice.cancel();
      }

      // Also stop any Web Speech API speech
      if (synthRef.current && synthRef.current.speaking) {
        console.log("Canceling native speech");
        synthRef.current.cancel();
      }

      // Double-check cancelation worked
      setTimeout(() => {
        if (window.responsiveVoice && window.responsiveVoice.isPlaying()) {
          window.responsiveVoice.cancel();
        }
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
    initializeResponsiveVoice();

    // Initialize voices with detailed logging
    const initVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        console.log(
          "Available native voices:",
          voices.map((v) => `${v.name} (${v.lang})`)
        );
      }
    };

    // Initialize voices
    initVoices();

    // Chrome requires an event listener for voices to be loaded
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = initVoices;
    }

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

    // Force immediate cancellation of all speech with higher priority
    try {
      // Cancel ResponsiveVoice with higher priority
      if (window.responsiveVoice) {
        window.responsiveVoice.cancel();
        // Force another cancellation to be sure
        setTimeout(() => window.responsiveVoice.cancel(), 10);
      }

      // Cancel native speech synthesis with higher priority
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
