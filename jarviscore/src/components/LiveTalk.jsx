import { useState, useEffect, useRef } from "react";
import "../styles/liveTalk.css";
import {
  textToSpeech,
  playAudio,
  isTTSSupported,
  initTTS,
} from "../services/vitsTTS";

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
  const [ttsStatus, setTtsStatus] = useState("initializing"); // initializing, ready, error

  // Conversation history state - stored in a ref to avoid re-renders
  const conversationHistoryRef = useRef([]);
  const maxHistoryLength = 10; // Maximum number of conversation turns to store

  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);
  const transcriptTimerRef = useRef(null);
  const assistantTimerRef = useRef(null);
  const isRecognitionActiveRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const wakewordDetectorRef = useRef(null);

  // Add a mutex ref to prevent overlapping operations
  const audioMutexRef = useRef(false);

  // Initialize TTS on component mount
  useEffect(() => {
    const loadTTS = async () => {
      try {
        // Check if TTS is supported
        if (!isTTSSupported()) {
          console.error(
            "WebAssembly required for TTS is not supported in this browser"
          );
          setTtsStatus("error");
          return;
        }

        setTtsStatus("initializing");

        // Set a timeout to prevent hanging in initializing state
        const timeoutId = setTimeout(() => {
          console.warn("TTS initialization timed out, using fallback");
          setTtsStatus("ready"); // Still mark as ready but will use fallback
        }, 5000);

        try {
          // Initialize TTS models
          const initialized = await initTTS();

          clearTimeout(timeoutId);

          if (initialized) {
            console.log("TTS initialized successfully");
            setTtsStatus("ready");
          } else {
            console.error("Failed to initialize TTS");
            setTtsStatus("error");
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error("Error initializing TTS:", error);
          setTtsStatus("error");
        }
      } catch (error) {
        console.error("Error in TTS initialization process:", error);
        setTtsStatus("error");
      }
    };

    loadTTS();

    // Try to load conversation history from localStorage
    try {
      const savedHistory = localStorage.getItem("liveTalkHistory");
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          conversationHistoryRef.current = parsedHistory;
          console.log(
            `Loaded ${parsedHistory.length} conversation turns from history`
          );
        }
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
    }

    // Clean up any speech synthesis on unmount
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save conversation history to localStorage when it changes
  const saveConversationHistory = () => {
    try {
      localStorage.setItem(
        "liveTalkHistory",
        JSON.stringify(conversationHistoryRef.current)
      );
    } catch (error) {
      console.error("Error saving conversation history:", error);
    }
  };

  // Add a message to the conversation history
  const addToConversationHistory = (role, content) => {
    if (!content || content.trim() === "") return;

    // Add the new message
    conversationHistoryRef.current.push({ role, content: content.trim() });

    // Trim history if it exceeds the maximum length
    if (conversationHistoryRef.current.length > maxHistoryLength * 2) {
      // *2 because each turn has user+assistant
      conversationHistoryRef.current = conversationHistoryRef.current.slice(
        -maxHistoryLength * 2
      );
    }

    // Save to localStorage in the background
    setTimeout(saveConversationHistory, 0);

    console.log(
      `Added ${role} message to history. History size: ${conversationHistoryRef.current.length}`
    );
  };

  // Get the recent conversation history for context
  const getConversationContext = () => {
    return conversationHistoryRef.current;
  };

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

      // Enhanced configuration for better accuracy
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3; // Increase to get multiple alternatives

      // Use British English to match TTS voice
      recognition.lang = "en-GB";

      // Improve accuracy with speech recognition settings
      if ("audioContext" in recognition) {
        // Some browsers support audio context configuration
        recognition.audioContext = {
          sampleRate: 48000, // Higher sample rate for better quality
        };
      }

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
      // Don't start if audio is playing
      if (audioMutexRef.current) {
        console.log("Audio mutex is locked, stopping recognition");
        try {
          recognition.stop();
        } catch (e) {
          // Ignore errors
        }
        return;
      }

      console.log("Speech recognition started");
      isRecognitionActiveRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Skip processing if audio is playing to prevent self-recognition
      if (audioMutexRef.current) {
        console.log("Audio mutex is locked, ignoring recognition result");
        return;
      }

      let interimTranscript = "";
      let finalTranscript = "";

      // Process multiple alternatives for better accuracy
      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Check if any of the alternatives has high confidence
        let bestTranscript = "";
        let highestConfidence = 0;

        // Review all alternatives for this result
        for (let j = 0; j < event.results[i].length; j++) {
          const alternative = event.results[i][j];
          const confidence = alternative.confidence;

          // If we find a higher confidence alternative, use it
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestTranscript = alternative.transcript;
          }
        }

        // Log confidence levels for debugging
        if (event.results[i].isFinal) {
          console.log(
            `Recognition confidence: ${(highestConfidence * 100).toFixed(1)}%`
          );
        }

        // Use the highest confidence transcript
        if (event.results[i].isFinal) {
          // Apply post-processing to improve accuracy
          const processedTranscript = postProcessTranscript(bestTranscript);
          finalTranscript += processedTranscript;
        } else {
          interimTranscript += bestTranscript;
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
        case "audio-capture":
          // Microphone issues
          showAssistantSpeech(
            "I can't hear you. Please check your microphone."
          );
          break;
        case "not-allowed":
          // Permission issues
          showAssistantSpeech(
            "Please allow microphone access to use Live Talk."
          );
          break;
        case "network":
          // Network issues
          showAssistantSpeech(
            "Network issue detected. Please check your connection."
          );
          break;
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

  // Post-process transcript to improve accuracy
  const postProcessTranscript = (transcript) => {
    if (!transcript) return "";

    // Convert to lowercase for processing
    let processed = transcript.trim();

    // Fix common misrecognitions
    const corrections = {
      jarvis: "JARVIS",
      "java script": "JavaScript",
      "type script": "TypeScript",
      "react js": "React.js",
      "node js": "Node.js",
      "i don't": "I don't",
      "i'm": "I'm",
      "i'll": "I'll",
      "i've": "I've",
      "i'd": "I'd",
      "i believe": "I believe",
      "can not": "cannot",
      "ain't": "isn't",
      gbt: "GPT",
      "ji piti": "GPT",
      "chat gbt": "ChatGPT",
      "chat ji piti": "ChatGPT",
      // Add more common corrections as needed
    };

    // Apply corrections
    Object.entries(corrections).forEach(([incorrect, correct]) => {
      const regex = new RegExp(`\\b${incorrect}\\b`, "gi");
      processed = processed.replace(regex, correct);
    });

    // Capitalize first letter of sentences
    processed = processed.replace(
      /(^\s*|[.!?]\s+)([a-z])/g,
      (match, p1, p2) => p1 + p2.toUpperCase()
    );

    // Ensure proper spacing after punctuation
    processed = processed.replace(/([.,!?])([a-zA-Z])/g, "$1 $2");

    // Fix repeated words (common recognition error)
    processed = processed.replace(/\b(\w+)\s+\1\b/gi, "$1");

    return processed;
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
        wakeWordRecognition.maxAlternatives = 5; // Increase alternatives for wake word
        wakeWordRecognition.lang = "en-GB"; // Match main recognition language

        wakeWordRecognition.onresult = (event) => {
          // Check all alternatives for the wake word
          let wakeWordDetected = false;
          let bestTranscript = "";

          for (let i = 0; i < event.results[0].length; i++) {
            const transcript = event.results[0][i].transcript.toLowerCase();
            console.log(
              `Wake word alternative ${i + 1}: "${transcript}" (confidence: ${(
                event.results[0][i].confidence * 100
              ).toFixed(1)}%)`
            );

            // Check for various forms of the wake word
            if (
              transcript.includes("jarvis") ||
              transcript.includes("hey jarvis") ||
              transcript.includes("okay jarvis") ||
              transcript.includes("hey jarvis") ||
              transcript.includes("hi jarvis") ||
              transcript.includes("yo jarvis") ||
              // Phonetic variations
              transcript.includes("javis") ||
              transcript.includes("jarves") ||
              transcript.includes("jarvus")
            ) {
              wakeWordDetected = true;
              bestTranscript = transcript;
              break;
            }
          }

          if (wakeWordDetected) {
            console.log("Wake word detected:", bestTranscript);
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
          console.log("Stopping current audio before new request");
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
          currentAudioRef.current = null;
        }

        // Temporarily pause speech recognition to prevent self-recognition
        const wasListening = isListening;
        if (wasListening) {
          console.log("Pausing speech recognition during API call");
          stopListening();
        }

        // Add user message to history
        addToConversationHistory("user", message);

        // Get conversation context
        const conversationContext = getConversationContext();
        console.log(`Using ${conversationContext.length} messages for context`);

        // Use the provided onSendMessage which is now our direct API call
        console.log("Sending message to API:", message);
        const response = await onSendMessage(message, conversationContext);

        // Resume speech recognition if it was active before
        if (wasListening && isActive && !audioMutexRef.current) {
          console.log("Resuming speech recognition after API call");
          setTimeout(() => {
            initializeSpeechRecognition();
            startListening();
          }, 500);
        }

        if (!response) {
          console.error("No response received from API");
          showAssistantSpeech(
            "I apologize, but I didn't receive a response from the server."
          );
          return;
        }

        if (response && response.content) {
          // Add assistant response to history
          addToConversationHistory("assistant", response.content);

          // Display assistant response as captions
          showAssistantSpeech(response.content);

          // Try to speak the response with retry logic
          const maxRetries = 2;
          let retryCount = 0;
          let success = false;

          while (retryCount <= maxRetries && !success) {
            try {
              console.log(`TTS attempt ${retryCount + 1}/${maxRetries + 1}`);
              await speakText(response.content);
              success = true;
            } catch (ttsError) {
              console.error(`TTS attempt ${retryCount + 1} failed:`, ttsError);
              retryCount++;

              if (retryCount <= maxRetries) {
                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else {
                // All retries failed
                console.error("All TTS attempts failed");
                showAssistantSpeech(
                  "I apologize, but I encountered an error with the text-to-speech system."
                );
              }
            }
          }
        } else {
          console.error("Response missing content:", response);
          showAssistantSpeech(
            "I apologize, but I received an incomplete response."
          );
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

  // Stop listening - enhanced approach with cleanup
  const stopListening = () => {
    setIsListening(false);
    isRecognitionActiveRef.current = false;

    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        // Remove all event handlers to prevent any processing
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;

        // Stop the recognition
        recognitionRef.current.stop();
        console.log("Speech recognition forcibly stopped");
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      }

      // Set to null to ensure complete cleanup
      recognitionRef.current = null;
    }

    console.log("Speech recognition fully disabled");
  };

  // Text-to-speech function using VITS + ONNX WebAssembly
  const speakText = async (text) => {
    // Even if status shows initializing, try to speak after a reasonable delay
    if (ttsStatus === "initializing") {
      console.warn(
        "TTS still initializing, will try anyway after a short delay"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Only block on error, not on initializing
    if (ttsStatus === "error") {
      console.warn("TTS in error state");
      showAssistantSpeech(
        "I apologize, but the text-to-speech system encountered an error."
      );
      return;
    }

    try {
      setIsSpeaking(true);

      // CRITICAL: Completely disable speech recognition while audio plays
      const wasListening = isListening;
      console.log("Audio playback starting - disabling speech recognition");

      // Set the audio mutex to prevent speech recognition
      audioMutexRef.current = true;

      // Force stop recognition and remove all handlers
      stopListening();

      // Stop any currently playing audio before starting new one
      if (currentAudioRef.current) {
        console.log("Stopping current audio");
        try {
          // Properly clean up previous audio if it has a cleanup function
          if (typeof currentAudioRef.current.cleanup === "function") {
            currentAudioRef.current.cleanup();
          }
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;

          // Remove listeners to avoid memory leaks
          currentAudioRef.current.onended = null;
          currentAudioRef.current.onerror = null;

          // Set to null to allow garbage collection
          currentAudioRef.current = null;
        } catch (err) {
          console.warn("Error stopping previous audio:", err);
        }
      }

      // Process text to improve naturalness
      const processedText = enhanceTextForSpeech(text);
      console.log(
        "Processing text for speech synthesis:",
        processedText.substring(0, 30) + "..."
      );

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TTS synthesis timed out")), 60000);
      });

      // Race between regular synthesis and timeout
      const audioBlob = await Promise.race([
        textToSpeech(processedText),
        timeoutPromise,
      ]).catch((error) => {
        console.error("TTS synthesis error or timeout:", error);
        // Return null to indicate error
        return null;
      });

      if (!audioBlob) {
        // Try a second time with a shorter text if the first attempt failed
        if (processedText.length > 100) {
          console.log("Retrying with shorter text");
          const shorterText = processedText.substring(0, 100) + "...";
          showAssistantSpeech(shorterText);

          // Try again with shorter text
          const retryAudioBlob = await textToSpeech(shorterText).catch(
            (err) => {
              console.error("Retry TTS synthesis failed:", err);
              return null;
            }
          );

          if (retryAudioBlob) {
            console.log("Starting audio playback with shorter text");
            const audio = await playAudio(retryAudioBlob);
            currentAudioRef.current = audio;

            // Function to properly restart speech recognition
            const restartSpeechRecognition = () => {
              if (wasListening && isActive) {
                console.log(
                  "Audio finished - fully reinitializing speech recognition"
                );
                // Release the audio mutex
                audioMutexRef.current = false;
                setTimeout(() => {
                  // Completely reinitialize with new instance
                  initializeSpeechRecognition();
                  startListening();
                }, 500);
              } else {
                // Release the audio mutex even if we're not restarting
                audioMutexRef.current = false;
              }
            };

            // Add event listener to restart speech recognition when audio finishes
            audio.addEventListener("ended", () => {
              console.log("Audio playback ended");
              // Clear any backup timer
              if (audio.backupTimerId) {
                clearTimeout(audio.backupTimerId);
              }
              restartSpeechRecognition();
            });

            // Also add a backup timer to resume speech recognition in case the ended event doesn't fire
            const audioBackupTimer = setTimeout(() => {
              console.log("Audio backup timer triggered");
              if (!isRecognitionActiveRef.current) {
                restartSpeechRecognition();
              }
            }, (shorterText.length / 10) * 1000 + 5000); // Estimate based on text length + buffer

            // Store the backup timer
            audio.backupTimerId = audioBackupTimer;

            return;
          }
        }

        // Release the audio mutex if we failed to get audio
        audioMutexRef.current = false;
        throw new Error("Failed to synthesize speech");
      }

      console.log("Starting audio playback");
      const audio = await playAudio(audioBlob);
      currentAudioRef.current = audio;

      // Function to properly restart speech recognition
      const restartSpeechRecognition = () => {
        if (wasListening && isActive) {
          console.log(
            "Audio finished - fully reinitializing speech recognition"
          );
          // Release the audio mutex
          audioMutexRef.current = false;
          setTimeout(() => {
            // Completely reinitialize with new instance
            initializeSpeechRecognition();
            startListening();
          }, 500);
        } else {
          // Release the audio mutex even if we're not restarting
          audioMutexRef.current = false;
        }
      };

      // Add event listener to restart speech recognition when audio finishes
      audio.addEventListener("ended", () => {
        console.log("Audio playback ended");
        // Clear any backup timer
        if (audio.backupTimerId) {
          clearTimeout(audio.backupTimerId);
        }
        restartSpeechRecognition();
      });

      // Ensure playback continues even through browser throttling
      audio.addEventListener("pause", (e) => {
        if (!audio.ended && isActive) {
          console.log("Audio was paused unexpectedly, attempting to resume");
          audio
            .play()
            .catch((err) => console.warn("Failed to resume audio:", err));
        }
      });

      // Add a backup timer to resume speech recognition in case the ended event doesn't fire
      const estimatedDuration = Math.max(
        30,
        (processedText.length / 10) * 1000
      ); // Rough estimate: ~10 chars per second
      const audioBackupTimer = setTimeout(() => {
        console.log("Audio backup timer triggered");
        if (!isRecognitionActiveRef.current) {
          restartSpeechRecognition();
        }
      }, estimatedDuration + 5000); // Estimated duration + 5 second buffer

      // Store the backup timer
      audio.backupTimerId = audioBackupTimer;
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      showAssistantSpeech(
        "I apologize, but I encountered an error with the text-to-speech system."
      );

      // Release the audio mutex if we encountered an error
      audioMutexRef.current = false;

      // Resume speech recognition if it was active before
      if (isActive) {
        console.log("Resuming speech recognition after TTS error");
        setTimeout(() => {
          initializeSpeechRecognition();
          startListening();
        }, 500);
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  // Enhance text for more natural speech
  const enhanceTextForSpeech = (text) => {
    if (!text) return "";

    // Simple text cleaning instead of complex SSML
    let enhanced = text.trim();

    // Clean up any potential HTML/SSML tags already in the text
    enhanced = enhanced.replace(/<[^>]*>/g, "");

    // Replace multiple spaces with single space
    enhanced = enhanced.replace(/\s+/g, " ");

    // Ensure proper spacing after punctuation
    enhanced = enhanced.replace(/([.,;:!?])(\w)/g, "$1 $2");

    // Fix common abbrevations
    enhanced = enhanced.replace(/(\w)\.(\w)/g, "$1. $2"); // Fix abbrevs like "e.g." -> "e. g."

    // Replace em dashes with commas for better pausing
    enhanced = enhanced.replace(/—/g, ", ");

    // Add periods to make sure sentences end properly
    if (
      !enhanced.endsWith(".") &&
      !enhanced.endsWith("!") &&
      !enhanced.endsWith("?")
    ) {
      enhanced += ".";
    }

    // Add space after numbered lists for better parsing
    enhanced = enhanced.replace(/(\d+\.)(\w)/g, "$1 $2");

    return enhanced;
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

    // Add audio detection to prevent self-recognition
    const audioDetectionInterval = setInterval(() => {
      // Check if any audio is playing in the document
      const audioElements = document.querySelectorAll("audio, video");
      let isAudioPlaying = false;

      audioElements.forEach((audio) => {
        if (!audio.paused && !audio.ended && audio.volume > 0) {
          isAudioPlaying = true;
        }
      });

      // If audio is playing and recognition is active, pause it
      if (isAudioPlaying && isRecognitionActiveRef.current) {
        console.log("Audio detected playing - pausing speech recognition");
        stopListening();
        // Set the audio mutex to prevent speech recognition
        audioMutexRef.current = true;

        // Set a timer to release the mutex after a reasonable time
        setTimeout(() => {
          audioMutexRef.current = false;
          console.log("Audio mutex released after timeout");
        }, 10000); // 10 seconds should be enough for most audio to finish
      }
    }, 500);

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

      // Clear the audio detection interval
      clearInterval(audioDetectionInterval);
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
      console.log("Stopping audio on close");
      try {
        // Properly clean up previous audio if it has a cleanup function
        if (typeof currentAudioRef.current.cleanup === "function") {
          currentAudioRef.current.cleanup();
        }
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (err) {
        console.warn("Error stopping audio on close:", err);
      }
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

  // Clear conversation history
  const clearConversationHistory = () => {
    conversationHistoryRef.current = [];
    saveConversationHistory();
    console.log("Conversation history cleared");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Save conversation history one last time before unmounting
      saveConversationHistory();

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
            {ttsStatus === "initializing" && (
              <span className="tts-status initializing">Loading TTS...</span>
            )}
            {ttsStatus === "error" && (
              <span className="tts-status error">TTS Error</span>
            )}
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
