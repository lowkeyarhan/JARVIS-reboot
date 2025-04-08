// ElevenLabs API integration for text-to-speech
const ELEVEN_LABS_API_KEY =
  "sk_e71e87754f9ce189863d42cf61782a2b3cf8e143d7671749";
const ELEVEN_LABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

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

  try {
    const response = await fetch(`${ELEVEN_LABS_API_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.6,
          style: 0.3,
          use_speaker_boost: false,
          speed: 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `ElevenLabs API error: ${errorData.detail || response.statusText}`
      );
    }

    return await response.blob();
  } catch (error) {
    console.error("Error in text-to-speech conversion:", error);
    throw error;
  }
};

/**
 * Plays audio from a blob
 * @param {Blob} audioBlob - The audio blob to play
 * @returns {Promise<void>}
 */
export const playAudio = async (audioBlob) => {
  try {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await audio.play();

    // Clean up the URL object after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (error) {
    console.error("Error playing audio:", error);
    throw error;
  }
};
