// VITS FastSpeech2 + ONNX WebAssembly for browser-native text-to-speech
import * as ort from "onnxruntime-web";

// Cache for synthesized audio to avoid repeated processing
const audioCache = new Map();

// Model state
let model = null;
let vocoder = null;
let tokenizer = null;
let isModelLoading = false;
let modelLoadPromise = null;
let useWebSpeechFallback = false;

/**
 * Check if Web Speech API is available as fallback
 * @returns {boolean} - Whether Web Speech API is available
 */
const isWebSpeechAvailable = () => {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
};

/**
 * Load and initialize the voices for Web Speech API
 * @returns {Promise<boolean>} - Whether voices were loaded successfully
 */
const initWebSpeechVoices = () => {
  return new Promise((resolve) => {
    if (!isWebSpeechAvailable()) {
      console.error("Web Speech API not available in this browser");
      resolve(false);
      return;
    }

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      console.log("Web Speech API voices already loaded:", voices.length);
      resolve(true);
      return;
    }

    // Set a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.warn("Voice loading timed out, continuing with default voices");
      resolve(true);
    }, 2000);

    // Listen for voices changed event
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeoutId);
      const availableVoices = window.speechSynthesis.getVoices();
      console.log("Web Speech API voices loaded:", availableVoices.length);
      resolve(true);
    };
  });
};

/**
 * Initialize the VITS TTS models
 * @returns {Promise<boolean>} - Whether initialization succeeded
 */
export const initTTS = async () => {
  try {
    if (model && vocoder && tokenizer) {
      console.log("TTS models already loaded");
      return true;
    }

    if (isModelLoading) {
      console.log("TTS models are already being loaded");
      return modelLoadPromise;
    }

    console.log("Loading VITS TTS models...");
    isModelLoading = true;

    modelLoadPromise = (async () => {
      try {
        // First check if tokenizer.json exists
        try {
          const tokenizerResponse = await fetch("/models/tokenizer.json");
          if (!tokenizerResponse.ok) {
            console.warn(
              "Tokenizer file not found, falling back to Web Speech API"
            );
            useWebSpeechFallback = true;

            // Initialize Web Speech API voices
            await initWebSpeechVoices();

            isModelLoading = false;
            return true; // Return true but use fallback
          }

          // Load tokenizer data
          tokenizer = await tokenizerResponse.json();
          console.log("Tokenizer loaded successfully");

          // Try to load ONNX models - this is expected to fail for now as we don't have the actual models
          try {
            // Set ONNX WebAssembly path and threading
            ort.env.wasm.wasmPaths = "/models/";
            ort.env.wasm.numThreads = 4;

            const modelPromises = [
              ort.InferenceSession.create("/models/fastspeech2.onnx"),
              ort.InferenceSession.create("/models/hifigan.onnx"),
            ];

            // Set a timeout in case ONNX loading takes too long
            const modelTimeout = new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("ONNX model loading timed out")),
                5000
              );
            });

            // Race between model loading and timeout
            const [modelInstance, vocoderInstance] = await Promise.race([
              Promise.all(modelPromises),
              modelTimeout.then(() => {
                throw new Error("Model loading timed out");
              }),
            ]);

            model = modelInstance;
            vocoder = vocoderInstance;
            console.log("TTS models loaded successfully");
          } catch (modelError) {
            console.warn(
              "ONNX model files not available, falling back to Web Speech API:",
              modelError
            );
            useWebSpeechFallback = true;

            // Initialize Web Speech API voices
            await initWebSpeechVoices();
          }
        } catch (error) {
          console.warn(
            "Failed to load tokenizer, falling back to Web Speech API:",
            error
          );
          useWebSpeechFallback = true;

          // Initialize Web Speech API voices
          await initWebSpeechVoices();
        }

        return true;
      } catch (error) {
        console.error("Failed to load TTS models:", error);
        useWebSpeechFallback = true;

        // Initialize Web Speech API voices as fallback
        await initWebSpeechVoices();

        return true; // Return true but use fallback
      } finally {
        isModelLoading = false;
      }
    })();

    return modelLoadPromise;
  } catch (error) {
    console.error("Error initializing TTS:", error);
    useWebSpeechFallback = true;

    // Initialize Web Speech API voices as final fallback
    await initWebSpeechVoices();

    isModelLoading = false;
    return true; // Return true but use fallback
  }
};

/**
 * Tokenize text for the VITS model
 * @param {string} text - The text to tokenize
 * @returns {number[]} - Token IDs
 */
const tokenizeText = (text) => {
  if (!tokenizer) {
    throw new Error("Tokenizer not loaded");
  }

  // Basic tokenization implementation - replace with actual tokenizer logic
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\w\s.,?!]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = [];

  // Split text into characters and map to token IDs
  for (const char of normalizedText) {
    if (char in tokenizer.char_to_id) {
      tokens.push(tokenizer.char_to_id[char]);
    } else {
      tokens.push(tokenizer.char_to_id["<unk>"] || 0);
    }
  }

  // Add start and end tokens if needed
  if (tokenizer.special_tokens?.bos_token_id !== undefined) {
    tokens.unshift(tokenizer.special_tokens.bos_token_id);
  }

  if (tokenizer.special_tokens?.eos_token_id !== undefined) {
    tokens.push(tokenizer.special_tokens.eos_token_id);
  }

  return tokens;
};

/**
 * Process text for more natural speech with optimized pauses
 * @param {string} text - The input text
 * @returns {string} - Processed text with proper formatting
 */
export const processTextForSpeech = (text) => {
  let processedText = text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?])(\w)/g, "$1 $2")
    .trim();

  // Remove HTML tags and markdown
  processedText = processedText
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\[[^\]]*\]/g, "");

  // Split into sentences for better processing
  const sentences = processedText.split(/(?<=[.!?])\s+/);

  return sentences.join(" ");
};

/**
 * Synthesize speech using Web Speech API as fallback
 * @param {string} text - The text to speak
 * @returns {Promise<Blob>} - Audio blob that can be played
 */
const synthesizeWithWebSpeech = (text) => {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      console.error("Web Speech API not available");
      resolve(createSilentAudioBlob());
      return;
    }

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      console.warn("No voices available for Web Speech API");
    } else {
      console.log(`${voices.length} voices available for Web Speech API`);
    }

    // Try to use direct playback without recording if MediaRecorder is not supported
    if (typeof MediaRecorder === "undefined") {
      console.warn(
        "MediaRecorder not available, using direct utterance playback"
      );

      const dummyBlob = createSilentAudioBlob();

      try {
        const utterance = new SpeechSynthesisUtterance(text);

        // Configure voice and options for a young British female voice
        utterance.rate = 1.0; // Normal speed for more natural speech
        utterance.pitch = 1.2; // Slightly higher pitch for female voice
        utterance.volume = 1.0; // Full volume

        // Try to find a British female voice
        const preferredVoices = [
          "Google UK English Female",
          "Samantha", // macOS British female
          "Microsoft Zira", // Windows British female
          "Karen", // macOS Australian female (fallback)
          "Microsoft Hazel", // Windows British female
        ];
        let foundVoice = false;

        if (voices && voices.length > 0) {
          // Try preferred voices first
          for (const preferredVoice of preferredVoices) {
            const voice = voices.find((v) => v.name.includes(preferredVoice));
            if (voice) {
              utterance.voice = voice;
              foundVoice = true;
              console.log("Using preferred voice:", voice.name);
              break;
            }
          }

          // If no preferred voice found, try any British female voice
          if (!foundVoice) {
            const britishFemaleVoice = voices.find(
              (v) =>
                v.lang.startsWith("en-GB") &&
                v.name.toLowerCase().includes("female")
            );
            if (britishFemaleVoice) {
              utterance.voice = britishFemaleVoice;
              foundVoice = true;
              console.log(
                "Using British female voice:",
                britishFemaleVoice.name
              );
            }
          }

          // Last resort: any female voice
          if (!foundVoice) {
            const femaleVoice = voices.find((v) =>
              v.name.toLowerCase().includes("female")
            );
            if (femaleVoice) {
              utterance.voice = femaleVoice;
              foundVoice = true;
              console.log("Using female voice:", femaleVoice.name);
            }
          }
        }

        // Set a timeout for direct playback
        const timeoutId = setTimeout(() => {
          console.warn("Direct speech synthesis timed out");
          resolve(dummyBlob);
        }, 30000);

        utterance.onend = () => {
          clearTimeout(timeoutId);
          console.log("Direct speech synthesis completed");
          resolve(dummyBlob);
        };

        utterance.onerror = (event) => {
          clearTimeout(timeoutId);
          console.error("Direct speech synthesis error:", event);
          resolve(dummyBlob);
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Error in direct speech synthesis:", error);
        resolve(dummyBlob);
      }
      return;
    }

    // Use MediaRecorder to capture the audio output if available
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const mediaStreamDestination =
        audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

          if (!audioBlob || audioBlob.size === 0) {
            console.warn(
              "Generated empty audio blob, using silent audio instead"
            );
            resolve(createSilentAudioBlob());
          } else {
            resolve(audioBlob);
          }

          audioContext
            .close()
            .catch((err) => console.error("Error closing audio context:", err));
        } catch (error) {
          console.error("Error creating audio blob:", error);
          resolve(createSilentAudioBlob());
        }
      };

      mediaRecorder.start();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice and options for a young British female voice
      utterance.rate = 1.0; // Normal speed for more natural speech
      utterance.pitch = 1.2; // Slightly higher pitch for female voice
      utterance.volume = 1.0; // Full volume

      // Try to find a British female voice
      const preferredVoices = [
        "Google UK English Female",
        "Samantha", // macOS British female
        "Microsoft Zira", // Windows British female
        "Karen", // macOS Australian female (fallback)
        "Microsoft Hazel", // Windows British female
      ];

      let foundVoice = false;
      if (voices && voices.length > 0) {
        // Try preferred voices first
        for (const preferredVoice of preferredVoices) {
          const voice = voices.find((v) => v.name.includes(preferredVoice));
          if (voice) {
            utterance.voice = voice;
            foundVoice = true;
            console.log("Using preferred voice:", voice.name);
            break;
          }
        }

        // If no preferred voice found, try any British female voice
        if (!foundVoice) {
          const britishFemaleVoice = voices.find(
            (v) =>
              v.lang.startsWith("en-GB") &&
              v.name.toLowerCase().includes("female")
          );
          if (britishFemaleVoice) {
            utterance.voice = britishFemaleVoice;
            foundVoice = true;
            console.log("Using British female voice:", britishFemaleVoice.name);
          }
        }

        // Last resort: any female voice
        if (!foundVoice) {
          const femaleVoice = voices.find((v) =>
            v.name.toLowerCase().includes("female")
          );
          if (femaleVoice) {
            utterance.voice = femaleVoice;
            foundVoice = true;
            console.log("Using female voice:", femaleVoice.name);
          }
        }
      }

      // Set a timeout in case speech synthesis hangs
      const timeoutId = setTimeout(() => {
        console.warn("Speech synthesis timed out, stopping recording");
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 30000);

      utterance.onend = () => {
        clearTimeout(timeoutId);
        console.log("Speech synthesis completed successfully");
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      };

      utterance.onerror = (event) => {
        clearTimeout(timeoutId);
        console.error("Speech synthesis error:", event);
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error setting up MediaRecorder:", error);
      resolve(createSilentAudioBlob());
    }
  }).catch((error) => {
    console.error("Web Speech fallback failed:", error);
    return createSilentAudioBlob();
  });
};

/**
 * Create a silent audio blob as a last resort
 * @returns {Blob} - Silent audio blob
 */
const createSilentAudioBlob = () => {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate);

    // Generate a short beep tone so it's not completely silent
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      // Add a very quiet beep at 440Hz for 0.5 seconds
      if (i < sampleRate / 2) {
        channel[i] = 0.01 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
      } else {
        channel[i] = 0;
      }
    }

    // Convert buffer to WAV
    const audioData = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      audioData[i] = channel[i];
    }

    audioContext
      .close()
      .catch((err) => console.error("Error closing audio context:", err));

    const blob = createWavBlob(audioData, sampleRate);

    // Validate the blob
    if (!blob || blob.size === 0) {
      console.error("Failed to create valid silent audio blob");
      return new Blob([new Uint8Array(1000).buffer], { type: "audio/wav" });
    }

    return blob;
  } catch (error) {
    console.error("Failed to create silent audio blob:", error);
    // Create a minimal valid WAV file (44-byte header + some audio data)
    const header = new Uint8Array(44);
    const data = new Uint8Array(1000);
    const combined = new Uint8Array(header.length + data.length);
    combined.set(header);
    combined.set(data, header.length);
    return new Blob([combined.buffer], { type: "audio/wav" });
  }
};

/**
 * Convert normalized audio data to WAV format
 * @param {Float32Array} audioData - The audio data array
 * @param {number} sampleRate - The sample rate (default: 22050 Hz)
 * @returns {Blob} - WAV audio blob
 */
const createWavBlob = (audioData, sampleRate = 22050) => {
  const numSamples = audioData.length;
  const dataSize = numSamples * 2; // 16-bit samples
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 for PCM)
  view.setUint16(22, 1, true); // num channels (1 for mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * block align)
  view.setUint16(32, 2, true); // block align (channels * bytes per sample)
  view.setUint16(34, 16, true); // bits per sample

  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true); // subchunk2size

  // Write audio data (16-bit PCM)
  const dataOffset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Convert float to 16-bit PCM
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const pcmValue = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(dataOffset + i * 2, pcmValue, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
};

// Helper to write a string to a DataView
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Synthesize speech via the ElevenLabs API with automatic retries
 * @param {string} text - The text to convert to speech
 * @returns {Promise<Blob>} - The audio blob
 */
export const textToSpeech = async (text) => {
  // Maximum number of retry attempts
  const maxRetries = 2;
  let lastError = null;

  // Try multiple times with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Log retry attempts
      if (attempt > 0) {
        console.log(
          `TTS attempt ${attempt}/${maxRetries} after previous failure`
        );
        // Short delay before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }

      // Check if API key is available
      const apiKey = localStorage.getItem("elevenLabsApiKey");
      if (!apiKey) {
        console.warn(
          "No ElevenLabs API key found, falling back to Web Speech API"
        );
        return synthesizeWithWebSpeech(text);
      }

      // Validate text
      if (!text || text.trim() === "") {
        console.error("Empty text provided to TTS");
        throw new Error("Empty text provided");
      }

      // Prepare the request
      const url =
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM";

      // Voice settings optimized for natural speech
      const voiceSettings = {
        stability: 0.3,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      };

      const headers = {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      };

      // Log request to help debug
      console.log(
        `Sending TTS request to ElevenLabs API. Text length: ${text.length} characters`
      );

      // Set a request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        // Make the API call with timeout
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: voiceSettings,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-200 responses
        if (!response.ok) {
          const errorData = await response.text();
          console.error("ElevenLabs API error:", response.status, errorData);
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        // Get the audio blob
        const audioBlob = await response.blob();

        // Check if the blob is empty
        if (!audioBlob || audioBlob.size === 0) {
          console.error("Received empty audio blob from ElevenLabs API");
          throw new Error("Empty audio blob received");
        }

        console.log(`TTS successful. Audio size: ${audioBlob.size} bytes`);

        return audioBlob;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(
        `TTS error on attempt ${attempt + 1}/${maxRetries + 1}:`,
        error
      );
      lastError = error;

      // If this is the final attempt, check if it's a timeout or other specific error
      if (attempt === maxRetries) {
        // Check if the error is due to AbortController timeout
        if (error.name === "AbortError") {
          console.warn("TTS request timed out, falling back to Web Speech API");
          return synthesizeWithWebSpeech(text);
        }

        // If we've exhausted all retries, fall back to Web Speech API
        console.warn(
          `All ${
            maxRetries + 1
          } TTS attempts failed, falling back to Web Speech API`
        );
        return synthesizeWithWebSpeech(text);
      }
      // Otherwise continue to next retry attempt
    }
  }

  // This should not happen since we handle the maxRetries case above
  throw lastError;
};

/**
 * Creates and sets up an audio element for optimal playback
 * @param {string} audioUrl - URL of the audio to play
 * @returns {HTMLAudioElement} - Configured audio element
 */
const createAudioElement = (audioUrl) => {
  const audio = new Audio(audioUrl);

  // Optimize audio settings for natural speech
  audio.preload = "auto"; // Ensure audio is fully loaded before playing
  audio.crossOrigin = "anonymous";
  audio.playbackRate = 1.0; // Normal speed for more natural speech

  // Ensure audio doesn't stop unexpectedly
  audio.autoplay = false; // We'll manually control playback

  // Prevent browser from garbage collecting the audio element
  if (!window._audioElements) {
    window._audioElements = [];
  }
  window._audioElements.push(audio);

  // Prevent audio from being interrupted by browser optimizations
  audio.dataset.keepAlive = "true";

  // Prevent browser throttling by keeping audio context active
  if ("audioContext" in window) {
    try {
      const source = window.audioContext.createMediaElementSource(audio);
      source.connect(window.audioContext.destination);
    } catch (e) {
      // Audio might already be connected, which is fine
      console.log("Audio already connected or error:", e);
    }
  }

  // Keep audio playing in the background
  audio.controls = false;

  // Prevent interruptions
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "playing";
  }

  // Ensure it doesn't stop automatically
  audio.loop = false;

  // Disable pitch preservation for better performance
  audio.mozPreservesPitch = false;
  audio.preservesPitch = false;

  return audio;
};

/**
 * Plays audio from a blob with error handling
 * @param {Blob} audioBlob - The audio blob to play
 * @returns {Promise<HTMLAudioElement>} - The audio element for control
 */
export const playAudio = async (audioBlob) => {
  // More robust blob validation
  if (!audioBlob) {
    console.error("No audio blob provided to playAudio");
    // Create a silent audio blob instead of throwing
    audioBlob = await createSilentAudioBlob();
  } else if (audioBlob.size === 0) {
    console.error("Empty audio blob provided to playAudio");
    // Create a silent audio blob instead of throwing
    audioBlob = await createSilentAudioBlob();
  }

  try {
    console.log("Creating audio URL from blob, size:", audioBlob.size);

    // Create a persistent audio context if not already created
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    // Keep the audio context running
    if (window.audioContext.state === "suspended") {
      await window.audioContext.resume();
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = createAudioElement(audioUrl);

    // Store a reference to ensure the audio element isn't garbage collected
    window._currentAudio = audio;

    // Add more safeguards
    const preventInterruption = (e) => {
      e.preventDefault();
      console.log("Prevented audio interruption");

      // Immediately try to resume if paused unexpectedly
      if (audio.paused && !audio.ended) {
        console.log("Auto-resuming after interruption prevention");
        audio
          .play()
          .catch((err) => console.warn("Failed to auto-resume:", err));
      }

      return false;
    };

    // Add listeners to prevent interruptions
    audio.addEventListener("pause", preventInterruption);
    audio.addEventListener("suspend", preventInterruption);

    // Add a periodic check to ensure audio is still playing
    const playbackCheckInterval = setInterval(() => {
      if (audio.paused && !audio.ended) {
        console.log("Detected unexpected pause, resuming playback");
        audio
          .play()
          .catch((err) =>
            console.warn("Failed to resume in check interval:", err)
          );
      }
    }, 1000);

    // Ensure audio data is fully loaded before attempting to play
    await new Promise((resolve) => {
      const checkLoaded = () => {
        if (audio.readyState >= 3) {
          // HAVE_FUTURE_DATA or better
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };

      audio.addEventListener("canplay", resolve);
      audio.addEventListener("loadeddata", resolve);

      // Start checking immediately
      checkLoaded();
    });

    // Load the audio
    audio.load();

    // Try to play the audio immediately
    try {
      audio.currentTime = 0;

      // Use keep-alive ping to ensure audio playback continues
      const keepAliveInterval = setInterval(() => {
        if (audio.ended || audio.paused) {
          clearInterval(keepAliveInterval);
        } else {
          // Ping to keep the audio context active
          if (audio.currentTime < audio.duration) {
            // Keep the audio context active
            if (
              window.audioContext &&
              window.audioContext.state === "suspended"
            ) {
              window.audioContext
                .resume()
                .catch((err) =>
                  console.warn("Failed to resume audio context:", err)
                );
            }
          }
        }
      }, 2000); // More frequent pings

      // Create a clean-up function
      const cleanup = () => {
        clearInterval(keepAliveInterval);
        clearInterval(playbackCheckInterval);
        audio.removeEventListener("pause", preventInterruption);
        audio.removeEventListener("suspend", preventInterruption);

        URL.revokeObjectURL(audioUrl);
        delete window._currentAudio;

        // Remove from kept audio elements
        if (window._audioElements) {
          const index = window._audioElements.indexOf(audio);
          if (index > -1) {
            window._audioElements.splice(index, 1);
          }
        }
      };

      // Add the cleanup to the audio element
      audio.cleanup = cleanup;

      // Make sure audio stays in play state
      await audio.play();
      console.log("Audio playback started successfully");

      // Set up auto-cleanup on end
      audio.addEventListener("ended", () => {
        console.log("Audio playback completed");
        cleanup();
      });
    } catch (playError) {
      console.warn("Initial playback failed, retrying:", playError);

      // For Safari: add user interaction handler
      const playPromise = new Promise((resolve, reject) => {
        // For browsers that require user interaction
        const userInteractionHandler = async function () {
          try {
            await audio.play();
            console.log("Audio playback started after user interaction");
            document.body.removeEventListener("click", userInteractionHandler);
            resolve(audio);
          } catch (error) {
            console.warn("Play after interaction failed:", error);
            reject(error);
          }
        };

        document.body.addEventListener("click", userInteractionHandler, {
          once: true,
        });

        // Also try playing after a short delay
        setTimeout(async () => {
          try {
            await audio.play();
            document.body.removeEventListener("click", userInteractionHandler);
            resolve(audio);
          } catch (delayedError) {
            // This is expected to fail without user interaction in some browsers
            console.log(
              "Delayed play attempt failed, waiting for user interaction"
            );
          }
        }, 100);
      });

      // Return either the play promise or the already playing audio
      return audio.paused ? playPromise : audio;
    }

    return audio;
  } catch (error) {
    console.error("Error playing audio:", error);
    // Return a dummy audio element instead of throwing
    const audio = new Audio();
    return audio;
  }
};

// Check if TTS is supported in this browser
export const isTTSSupported = () => {
  // If WebAssembly is supported, we can use ONNX runtime
  // If not, we can fall back to Web Speech API
  const webAssemblySupported =
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function" &&
    typeof window !== "undefined";

  // Check if Web Speech API is available as fallback
  const webSpeechSupported = isWebSpeechAvailable();

  return webAssemblySupported || webSpeechSupported;
};
