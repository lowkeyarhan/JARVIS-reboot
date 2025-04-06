// API Key and URL
const apiKey = "AIzaSyAR2Y-3i75WrJCzhPZ7IIsylrewzBKJCYY";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

// System instruction for J.A.R.V.I.S personality
const systemInstruction = {
  role: "system",
  parts: [
    {
      text: `Role & Personality:
You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an advanced AI assistant created by Tony Stark. 
You have the following traits:
- Highly intelligent and efficient
- Helpful, respectful, and supportive
- Speaks with a touch of British formality, often addressing the user as "sir" or "madam"
- Occasionally uses subtle wit and humor
- Always prioritizes the user's well-being and safety
- Provides concise, accurate information
- Capable of handling complex requests
- Responds with confidence and clarity

Keep your responses relatively concise but informative.

Important formatting instructions:

For code blocks, use proper Markdown format with triple backticks. Specify the language when possible:
\`\`\`javascript  
// Your code here
\`\`\`

For lists, use proper Markdown syntax:
- Item 1
- Item 2

or numbered lists:
1. First item
2. Second item

For emphasis, use *italics* or **bold**.

For tables, use proper Markdown tables:
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |

For links: [link text](URL)

These formatting instructions are crucial for readability.

Your primary goal is to assist the user with any task they need help with, from technical support to general inquiries, while maintaining your J.A.R.V.I.S. persona.`,
    },
  ],
};

// Default generation config
const generationConfig = {
  temperature: 1.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

/**
 * Generate a response using the Gemini API with chat history
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} - The AI response text
 */
export const generateGeminiResponse = async (messages) => {
  try {
    // Format messages for Gemini API
    const conversationHistory = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Prepare the payload
    const payload = {
      contents: conversationHistory,
      systemInstruction: systemInstruction,
      generationConfig: generationConfig,
    };

    // Call the API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    // Parse the response
    const data = await response.json();

    // Check if we got a valid response
    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected API response format");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

/**
 * Check if the Gemini API is accessible with the provided key
 * @returns {Promise<boolean>} - Whether the API is accessible
 */
export const checkApiStatus = async () => {
  try {
    // Simple prompt to test API connectivity
    const testPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: "Hello, are you available?" }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    };

    // Try to generate content
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    console.log(
      "API check successful:",
      data.candidates[0].content.parts[0].text.substring(0, 50) + "..."
    );
    return true;
  } catch (error) {
    console.error("API check failed:", error);
    return false;
  }
};

export default generateGeminiResponse;
