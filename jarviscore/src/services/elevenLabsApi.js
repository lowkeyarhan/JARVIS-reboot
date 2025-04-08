// ElevenLabs API integration for text-to-speech
const ELEVEN_LABS_API_KEY =
  "sk_e71e87754f9ce189863d42cf61782a2b3cf8e143d7671749";
const ELEVEN_LABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

// Cache for audio to avoid repeated API calls for same text
const audioCache = new Map();

/**
 * Converts text to speech using ElevenLabs API
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - Optional voice ID to use (defaults to British male voice)
 * @returns {Promise<Blob>} - Audio blob that can be played
 */
export const textToSpeech = async (text, voiceId = DEFAULT_VOICE_ID) => {
  if (!ELEVEN_LABS_API_KEY) {
    throw new Error(
      "ElevenLabs API key not found. Please set REACT_APP_ELEVEN_LABS_API_KEY in your environment variables."
    );
  }

  // Check cache first
  const cacheKey = `${text}:${voiceId}`;
  if (audioCache.has(cacheKey)) {
    console.log("Using cached audio for:", text.substring(0, 30) + "...");
    return audioCache.get(cacheKey);
  }

  try {
    console.log(
      "Calling ElevenLabs API for text:",
      text.substring(0, 30) + "..."
    );

    // Set up options for faster speech
    const voiceSettings = {
      stability: 0.25, // Reduced for faster processing
      similarity_boost: 0.5,
      style: 0.1, // Reduced for faster processing
      use_speaker_boost: true, // Enable speaker boost for clarity
      speed: 1.15, // Increased speed for faster playback
    };

    const response = await fetch(`${ELEVEN_LABS_API_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // Consider using a smaller model if available
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("ElevenLabs API error response:", errorData);
      throw new Error(
        `ElevenLabs API error: ${errorData.detail || response.statusText}`
      );
    }

    const audioBlob = await response.blob();
    console.log("Received audio blob:", audioBlob);

    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("Received empty audio response from ElevenLabs API");
    }

    // Cache the result (limit cache size to avoid memory issues)
    if (audioCache.size > 50) {
      // Remove oldest entry if cache gets too large
      const oldestKey = audioCache.keys().next().value;
      audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, audioBlob);

    return audioBlob;
  } catch (error) {
    console.error("Error in text-to-speech conversion:", error);
    throw error;
  }
};

/**
 * Creates and sets up an audio element for optimal playback
 * @param {string} audioUrl - URL of the audio to play
 * @returns {HTMLAudioElement} - Configured audio element
 */
const createAudioElement = (audioUrl) => {
  const audio = new Audio(audioUrl);

  // Optimize audio settings for faster playback
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";

  // Set playback rate for slightly faster speech
  audio.playbackRate = 1.05;

  // Prioritize performance over quality
  audio.mozPreservesPitch = false;
  audio.preservesPitch = false;

  return audio;
};

/**
 * Plays audio from a blob with optimized settings
 * @param {Blob} audioBlob - The audio blob to play
 * @returns {Promise<HTMLAudioElement>} - The audio element for control
 */
export const playAudio = async (audioBlob) => {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("Invalid audio blob provided");
  }

  try {
    console.log("Creating audio URL from blob, size:", audioBlob.size);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = createAudioElement(audioUrl);

    // Optimize audio loading
    audio.load();

    // Try to play the audio immediately
    try {
      // Force immediate playback attempt
      audio.currentTime = 0;
      await audio.play();
      console.log("Audio playback started successfully");
    } catch (playError) {
      console.warn("Initial playback failed, retrying:", playError);

      // For Safari: add user interaction handler
      document.body.addEventListener(
        "click",
        async function playOnInteraction() {
          try {
            await audio.play();
            console.log("Audio playback started after user interaction");
            document.body.removeEventListener("click", playOnInteraction);
          } catch (retryError) {
            console.error("Retry playback failed:", retryError);
          }
        },
        { once: true }
      );
    }

    // Clean up resources when done
    audio.onended = () => {
      console.log("Audio playback ended");
      URL.revokeObjectURL(audioUrl);
    };

    // Handle playback errors
    audio.onerror = (error) => {
      console.error("Audio playback error:", error);
      URL.revokeObjectURL(audioUrl);
    };

    return audio;
  } catch (error) {
    console.error("Error in audio playback setup:", error);
    throw error;
  }
};
