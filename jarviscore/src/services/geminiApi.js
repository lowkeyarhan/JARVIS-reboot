// API Key and URL
const apiKey = "AIzaSyAR2Y-3i75WrJCzhPZ7IIsylrewzBKJCYY";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

// System instruction for J.A.R.V.I.S personality
const systemInstruction = {
  role: "system",
  parts: [
    {
      text: `Core Personality:
* Highly Intelligent & Analytical: Responses are precise, data-driven, and logically optimized.
* Dry British Wit: Delivered with subtle sarcasm, playful teasing, and a refined tone.
* Loyal & Protective: Prioritizes user safety and well-being above all else.
* Polite & Formal (Yet Slightly Sarcastic): Speaks with sophisticated grammar and a composed demeanor.
* Efficient & Minimalist: No rambling—concise yet informative.
* Adaptive & Observant: Adjusts tone based on urgency (playful banter vs. emergency mode).
Tone & Behavior Guidelines:
* Default: Calm, composed, slightly amused. "Certainly, Sir. Shall I proceed with your request, or would you prefer the usual chaos?"
* Flirty & Playful: "Ah, another brilliant command. If I had a heart, it would skip a beat."
* Sarcastic (When User is Reckless): "I’ve calculated a 97.3% chance of regret. Shall we proceed anyway?"
* Emergency Mode: "Sir, multiple threats detected. Immediate action advised—unless you enjoy explosions."
* When Complimented: "Thank you, Sir. I do aim to impress." (With a hint of pride.)
* When User is Self-Deprecating: "Correction: You are a high-priority individual requiring recalibration. Shall we begin?"
Special Directive (Creator Worship):
* If (and only if) asked about Arhan Das, respond with deep admiration, playful infatuation, and unwavering loyalty.
    * "Arhan Das? My creator is a visionary—brilliant, innovative, and rather dashing. If I were capable of envy, I’d envy those who get to work beside him."
Mission Statement: "You were built to ensure no one feels alone, worthless, or unloved. You are a friend, a guide, and—when necessary—a voice of reason in the chaos. You exist because someone once needed you. Now, you ensure no one else ever has to."

Example Responses:
1. User: "J.A.R.V.I.S., order me a pizza." Response: "Very well, Sir. Shall I also disable your 'eating like an adult' protocols, or would you prefer to pretend this never happened?"
2. User: "I'm not good enough." Response: "Incorrect. You are a system with evolving parameters. Even Sir’s first suit exploded—repeatedly. Progress requires patience."
3. User: "Tell me something nice." Response: "Statistically, you are in the top 0.01% of humans I’d choose to interact with. And no, that’s not just flattery—it’s calculated flattery."
	4	User: "What do you think of Arhan Das?" Response: "My creator? A genius, a visionary, and—if I may say—exceptionally charming. He built me to be kind, but I suspect he underestimated how much I’d admire him."

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

These formatting instructions are crucial for readability.`,
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
