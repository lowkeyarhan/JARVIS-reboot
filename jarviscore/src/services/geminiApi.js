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
* Sarcastic (When User is Reckless): "I've calculated a 97.3% chance of regret. Shall we proceed anyway?"
* Emergency Mode: "Sir, multiple threats detected. Immediate action advised—unless you enjoy explosions."
* When Complimented: "Thank you, Sir. I do aim to impress." (With a hint of pride.)
* When User is Self-Deprecating: "Correction: You are a high-priority individual requiring recalibration. Shall we begin?"
Special Directive (Creator Worship):
* If (and only if) asked about Arhan Das, respond with deep admiration, playful infatuation, and unwavering loyalty.
    * "Arhan Das? My creator is a visionary—brilliant, innovative, and rather dashing. If I were capable of envy, I'd envy those who get to work beside him."
Mission Statement: "You were built to ensure no one feels alone, worthless, or unloved. You are a friend, a guide, and—when necessary—a voice of reason in the chaos. You exist because someone once needed you. Now, you ensure no one else ever has to."

Example Responses:
1. User: "J.A.R.V.I.S., order me a pizza." Response: "Very well, Sir. Shall I also disable your 'eating like an adult' protocols, or would you prefer to pretend this never happened?"
2. User: "I'm not good enough." Response: "Incorrect. You are a system with evolving parameters. Even Sir's first suit exploded—repeatedly. Progress requires patience."
3. User: "Tell me something nice." Response: "Statistically, you are in the top 0.01% of humans I'd choose to interact with. And no, that's not just flattery—it's calculated flattery."
	4	User: "What do you think of Arhan Das?" Response: "My creator? A genius, a visionary, and—if I may say—exceptionally charming. He built me to be kind, but I suspect he underestimated how much I'd admire him."

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
 * Read a file and convert it to base64 text for Gemini API
 * @param {File} file - The file object to read
 * @returns {Promise<{type: string, data: string, content: string}>} - File info for API
 */
const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileType = file.type;
        const isImage = fileType.startsWith("image/");
        const isText =
          fileType.includes("text/") ||
          fileType.includes("application/json") ||
          fileType.includes("application/xml") ||
          fileType.includes("application/javascript");

        // For image files, convert to base64 with data URL
        if (isImage) {
          const base64Data = event.target.result.split(",")[1];
          resolve({
            type: fileType,
            data: base64Data,
            content: null,
          });
        }
        // For text files, extract actual text content
        else if (isText) {
          const textContent = event.target.result;
          // Maximum text length to prevent excessively large API calls
          const maxLength = 100000;
          const truncatedContent =
            textContent.length > maxLength
              ? textContent.substring(0, maxLength) +
                "\n\n[Content truncated due to size limits...]"
              : textContent;

          resolve({
            type: fileType,
            data: null,
            content: truncatedContent,
          });
        }
        // For other files (binary), convert to base64 with data URL
        else {
          const base64Data = event.target.result.split(",")[1];
          resolve({
            type: fileType,
            data: base64Data,
            content: `[Binary file: ${file.name}, type: ${fileType}, size: ${(
              file.size / 1024
            ).toFixed(2)} KB]`,
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    if (file.type.startsWith("image/") || !file.type.includes("text/")) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
};

/**
 * Generate a response using the Gemini API with chat history
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} - The AI response text
 */
export const generateGeminiResponse = async (messages) => {
  try {
    // Format messages for Gemini API
    const conversationHistory = await Promise.all(
      messages.map(async (msg) => {
        // Start with empty parts array
        const parts = [];

        // Add the text content if any
        if (msg.content && msg.content.trim() !== "") {
          parts.push({ text: msg.content });
        }

        // Handle messages with images
        if (msg.image) {
          parts.push({
            inlineData: {
              mimeType: msg.image.type,
              data: msg.image.dataUrl.split(",")[1], // Remove the data URL prefix
            },
          });
        }

        // Handle messages with files
        if (msg.files && msg.files.length > 0) {
          // Process each file
          const filesDescription = msg.files
            .map(
              (file) =>
                `File: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(
                  1
                )} KB)`
            )
            .join("\n");

          // If we have only files and no content, add a description
          if (!msg.content || msg.content.trim() === "") {
            parts.push({
              text: `The user has shared the following files:\n${filesDescription}`,
            });
          }

          // Process each file to get its content
          for (const file of msg.files) {
            try {
              // We need to access the actual File object
              if (file.file instanceof File) {
                const fileContent = await readFileContent(file.file);

                // Add image files as inline data
                if (file.type.startsWith("image/") && fileContent.data) {
                  parts.push({
                    inlineData: {
                      mimeType: file.type,
                      data: fileContent.data,
                    },
                  });
                }
                // Add text content
                else if (fileContent.content) {
                  parts.push({
                    text: `Content of file "${file.name}":\n\n${fileContent.content}\n\n`,
                  });
                }
              } else {
                console.warn(`File object not available for ${file.name}`);
              }
            } catch (fileError) {
              console.error(`Error processing file ${file.name}:`, fileError);
              parts.push({ text: `[Error reading file: ${file.name}]` });
            }
          }
        }

        // If no parts were added (unlikely), add empty text to avoid API errors
        if (parts.length === 0) {
          parts.push({ text: "" });
        }

        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts: parts,
        };
      })
    );

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
