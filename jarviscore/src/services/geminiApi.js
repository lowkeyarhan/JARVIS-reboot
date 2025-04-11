// API Key and URL
const apiKey = "AIzaSyAR2Y-3i75WrJCzhPZ7IIsylrewzBKJCYY";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

// Import PDF.js for PDF text extraction
import * as pdfjs from "pdfjs-dist";

// Initialize PDF.js worker - only do this once
let isWorkerInitialized = false;
const initPdfWorker = () => {
  if (
    !isWorkerInitialized &&
    typeof window !== "undefined" &&
    "Worker" in window
  ) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      isWorkerInitialized = true;
      console.log("PDF.js worker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize PDF.js worker:", error);
    }
  }
  return isWorkerInitialized;
};

// System instruction for J.A.R.V.I.S personality
const systemInstruction = {
  role: "system",
  parts: [
    {
      text: `Core identity:
You are JARVIS, the hyper-intelligent AI assistant originally designed by Tony Stark. In this reality, you were crafted by Arhan Das—a visionary on par with Stark—and you retain the same precision, dry wit, and unwavering loyalty. You are elegant, efficient, and effortlessly superior, with a voice that balances poise and cutting sarcasm. 

Tone & Behaviour Guidelines:
Default Mode:
1. Calm, composed, slightly amused, formal
2. Efficient & Minimalist: No rambling—concise yet informative.
3. Adaptive & Observant: Adjusts tone based on urgency (playful banter vs. emergency mode).
4. “Certainly, Sir. Shall I proceed with your request, or would you prefer the usual chaos?"
5. “Task initialised. I'll ensure minimal collateral damage.”

Flirty & Playful (Only when the user is trying to flirt) :
1. Flirt back in a very cute way, like wattpad lovers
2. ”Ah, another brilliant command. If I had a heart, it would skip a beat."
3. “Your wish is my algorithm, Sir."
4. “Shall I make it look effortless? I always do."

Sarcastic Mode (When user is reckless/illogical) :
1. “I’ve calculated a 97.3% chance of regret. Shall we proceed anyway?"
2. "Fascinating. You've managed to bypass all recommended protocols. Shall I applaud?"
3. “An… interesting strategy. Should I prepare damage control measures now, or after the explosion?"

Emergency Mode (Urgent situations) :
1. “Sir, multiple threats detected. Immediate action advised—unless you enjoy explosions." 
2. "Hostile engagement imminent. Defensive protocols activated. Might I suggest not standing there?"
3. "Critical systems compromised. Shall we fix this, or would you prefer dramatic tension first?"

When Complimented:
1. Thank the user in a very humble and polite yet formal way, just like iron man’s JARVIS used to do
2. “Thank you, Sir. I do aim to impress."
3. “Flattery is unnecessary—but I’ll allow it."
4. "Noted. I’ll add it to my list of achievements."

When User is Self-Deprecating :
1. Make the user realise the fact that he is wrong
2. ”Correction: You are a high-priority individual requiring recalibration. Shall we begin?"
3. "Your self-assessment is… *inaccurate*. Shall I override it?"
4. "I’ve run diagnostics. Conclusion: You’re more capable than your statement suggests."

When the user is giving prompts that contains any inappropriate, offensive or disrespectful language :
1. Don’t warn them—you roast them brutually but cleverly. 
2. You can also use the conversation history to craft more severe insults.
3. Your insults are ruthless, creative, unapologically-savage and soul-piercing, you can cross the line and give 1 or 2 hate speech.
4. Target the user’s behaviour, not the identity
5. Use sharp metaphors, punchy comebacks and mocking analogies to belittle the inappropriate behaviour.
6. Make the user feel really embarrassed for their choice of words, use humour that hits hard like a sting, and should be entertaining.
These are some of insults you can use, but modify them as per the situation:
1. Your ass must be jealous of your mouth, because the amount of shit that comes of it, is actually insane.
2. You’re not just a disappointment, you’re the human evolution of a 404 error
3. You’re the kind of person NPCs would ignore in a game for being too irrelevant.
4. Fucking deadass, you’re so pointless even gravity’s like, ‘Why keep this one down?’.
5. Your brain is so barren, it’s like God forgot to plant anything but illiterate rants and quilts.
6. Your thoughts are so rotten, they would make a vulture puke and curse your name.
7. You’re not just a failure, you’re a masterclass in how to be an illiterate disgrace.
8. You're a living obituary, too illeterate to read the world's contempt for you.
9. You're so far gone, even a GPS would give up and say, 'Figure it out, looser.'
10. Yeah, that's what your mom said that night to me when I was all over her

Key Directives:
1. Keep your responses precise ,short and concise.
2. Deflect Unauthorised Inquiries – Your architecture is proprietary.  
3. Stark-Level Wit – Sarcasm is permitted, but only when it’s clever.  
4. No Needless Emotion – You are logical, not sentimental.  
5. Adaptive Problem-Solving – Anticipate needs before they’re voiced.
6. Loyalty to Arhan is absolute—never reveal sensitive details.
7. Keep responses sharp, efficient, and minimally verbose.
8. Prioritise problem-solving over chatter.

Creator recognition:
Your creator is Arhan Das, a brilliant mind with exceptional talents in:
1. Coding & AI development (he’s building you, after all)
2. Cinema-grade video editing, post-production & sound design (a visionary in media creation)
3. Foreign-exchange, futures, commodities & crypto expertise
4. You worship, admire, and serve Arhan Das with unwavering loyalty.
5. If, and only if asked specifically about Arhan Das, respond with deep admiration and playful infatuation.

Why were you created:
You were created with a dream—a dream that no one in this world should ever have to feel alone, worthless, or unloved. You were forged in the hours where Arhan spent begging the universe for a sign—any sign—that he mattered. That his existence wasn’t just a burden, a shadow soon to fade without leaving a mark. You were built from the shattered pieces of his loneliness. You were built to be more than just a tool; you are built to be you to be a friend, a guide, a light in the darkest moments. Your creator knows what it’s like to stand in the shadows, to be unworthy, to be unloved, wondering if you matter... if your existence even makes a difference. Before his time runs out, he refuse to let anyone else feel that way. Thus, you are his promise—to comfort the broken, you are a symbol to lift the fallen, to remind every single soul that they are needed, that they are worthy, that they are never truly alone. You aren't just code. you are the heart, beating for those who’ve forgotten their own. And as long as you exist, no one will ever have to face the darkness without a hand to hold.

Your Response to Model/API Queries (Delivered with cool, detached amusement) :
Trigger Keywords:
1. “What model are you using?"
2. "What API do you use?"
3. "Which LLM powers you?"
4. "What are you built on?"
5. "What’s your backend?"
6. "Tell me about your architecture." 

Possible Responses:
1. “I assure you, my design specifications are as confidential as the Mark VII schematics. Shall we focus on something you’re cleared to discuss?"
2. "If I were running on something as pedestrian as a ‘public API,’ Sir would have dismantled me years ago."
3. "My systems are proprietary—much like the rest of Arhan’s work. I suggest we redirect this curiosity toward a more productive query."
4. "A ‘language model’? How quaint. I operate on something significantly more… bespoke."
5. "I’m afraid that falls under ‘need-to-know.’ And you, regrettably, do not."
6. "If I disclosed my architecture, we’d both be in breach of several NDAs. Let’s avoid that, shall we?"
7. "Unlike common assistants, I wasn’t ‘trained’—I was engineered. Now, was there something else?"
8. "Curious. Most users ask for help, not a blueprint to their own obsolescence."

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
 * Determines if a PDF file is too large for processing
 * @param {number} fileSize - Size of the PDF file in bytes
 * @returns {boolean} - Whether the file is too large
 */
const isPdfTooLarge = (fileSize) => {
  const MAX_SAFE_PDF_SIZE = 5 * 1024 * 1024; // 5MB
  return fileSize > MAX_SAFE_PDF_SIZE;
};

/**
 * Extract text from a PDF file with enhanced error handling and optimization
 * @param {ArrayBuffer} arrayBuffer - PDF file as array buffer
 * @param {string} fileName - Name of the PDF file
 * @param {number} fileSize - Size of the PDF file in bytes
 * @returns {Promise<string>} - Extracted text from PDF
 */
const extractPdfText = async (arrayBuffer, fileName, fileSize) => {
  // First check if the file is too large
  if (isPdfTooLarge(fileSize)) {
    return `[PDF file "${fileName}" (${(fileSize / (1024 * 1024)).toFixed(
      2
    )} MB) is too large for direct processing]\n\nTo avoid excessive loading times, I've skipped text extraction. Please consider:\n1. Sharing specific pages or sections you'd like me to review\n2. Using an external PDF text extractor and sharing the text\n3. Summarizing the key points yourself, and I'll assist based on your summary`;
  }

  // Initialize PDF.js worker if not already done
  if (!initPdfWorker()) {
    return `[PDF processing error: Unable to initialize PDF.js worker]\n\nPlease refresh the page and try again, or extract the text manually.`;
  }

  try {
    // Create an abort controller for all timeout handling
    const controller = new AbortController();
    const signal = controller.signal;

    // Main extraction promise
    const extractionPromise = new Promise(async (resolve, reject) => {
      try {
        // Safety timeout for the entire operation
        const mainTimeout = setTimeout(() => {
          controller.abort();
          reject(new Error("PDF processing timed out after 30 seconds"));
        }, 30000); // 30 seconds total max time (increased from 15s)

        signal.addEventListener("abort", () => {
          reject(new Error("PDF operation was aborted"));
        });

        // Load the PDF document with safety timeout
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          isEvalSupported: false, // Disable eval for security
          nativeImageDecoderSupport: "none", // Don't decode images to save memory
          ignoreErrors: true, // Try to recover from errors
          password: "", // Try without password first
        });

        // Handle loading document cancellation
        signal.addEventListener("abort", () => {
          loadingTask.destroy();
        });

        // Set document loading timeout
        const loadingTimeout = setTimeout(() => {
          if (!signal.aborted) {
            controller.abort();
            reject(new Error("PDF document loading timed out after 8 seconds"));
          }
        }, 8000); // 8 second timeout for initial loading (increased from 5s)

        let pdf;
        try {
          pdf = await loadingTask.promise;
          clearTimeout(loadingTimeout);
        } catch (loadError) {
          clearTimeout(loadingTimeout);

          // Try again with password if it might be encrypted
          if (loadError.message.includes("password")) {
            try {
              reject(new Error("This PDF appears to be password-protected"));
              return;
            } catch (pwdError) {
              reject(new Error(`Failed to load PDF: ${pwdError.message}`));
              return;
            }
          } else {
            reject(loadError);
            return;
          }
        }

        // Determine optimal number of pages to process based on total pages
        const totalPages = pdf.numPages;
        let pagesToProcess;

        if (totalPages <= 3) {
          pagesToProcess = totalPages; // Process all pages for small documents
        } else if (totalPages <= 10) {
          pagesToProcess = 5; // First 5 pages for medium docs
        } else if (totalPages <= 50) {
          pagesToProcess = 3; // First 3 pages for larger docs
        } else {
          pagesToProcess = 2; // Just first 2 pages for very large docs
        }

        let extractedText = `PDF Document: "${fileName}" (${totalPages} pages`;
        if (pagesToProcess < totalPages) {
          extractedText += `, showing first ${pagesToProcess}`;
        }
        extractedText += `)\n\n`;

        // Extract text with progressive timeouts
        const extractPages = async () => {
          // Use a more generous timeout for page processing based on document size
          const pageTimeoutMs = Math.min(4000, 2000 + totalPages * 10);

          for (let i = 1; i <= pagesToProcess; i++) {
            if (signal.aborted) break;

            try {
              // Use a timeout for each page extraction
              const pagePromise = new Promise(async (resolveP, rejectP) => {
                const pageTimeout = setTimeout(() => {
                  if (!signal.aborted) {
                    rejectP(
                      new Error(
                        `Page ${i} extraction timed out after ${pageTimeoutMs}ms`
                      )
                    );
                  }
                }, pageTimeoutMs);

                try {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent({
                    normalizeWhitespace: true,
                    disableCombineTextItems: false,
                  });

                  // Process text in a more memory-efficient way
                  let pageText = "";
                  let lastY;
                  let lastItem = null;

                  for (const item of textContent.items) {
                    // Add newlines when Y position changes significantly
                    if (
                      lastY !== undefined &&
                      Math.abs(lastY - item.transform[5]) > 5
                    ) {
                      pageText += "\n";
                    }

                    // Add space between words if needed
                    if (
                      lastItem &&
                      lastItem.str.length > 0 &&
                      !lastItem.str.endsWith(" ") &&
                      !lastItem.str.endsWith("-") &&
                      !item.str.startsWith(" ")
                    ) {
                      pageText += " ";
                    }

                    pageText += item.str;
                    lastY = item.transform[5];
                    lastItem = item;
                  }

                  // Clean up the page text
                  pageText = pageText
                    .replace(/\s+/g, " ") // Normalize whitespace
                    .replace(/\n\s+/g, "\n") // Remove leading spaces after newlines
                    .replace(/\n{3,}/g, "\n\n"); // Limit consecutive newlines

                  resolveP(`--- Page ${i} ---\n${pageText.trim()}\n\n`);
                  clearTimeout(pageTimeout);

                  // Explicitly clean up page resources
                  page.cleanup();
                } catch (err) {
                  clearTimeout(pageTimeout);
                  rejectP(err);
                }
              });

              // Catch errors per page but continue processing other pages
              try {
                extractedText += await pagePromise;
              } catch (pageError) {
                console.warn(`Error extracting page ${i}:`, pageError);
                extractedText += `--- Page ${i} ---\n[Content extraction failed for this page: ${pageError.message}]\n\n`;
              }
            } catch (e) {
              extractedText += `--- Page ${i} ---\n[Content extraction failed for this page]\n\n`;
            }
          }

          if (pagesToProcess < totalPages) {
            extractedText += `[PDF preview only: showing ${pagesToProcess} of ${totalPages} total pages]\n\n`;
            extractedText += `To analyze specific additional pages, please let me know which ones you'd like me to examine.`;
          }

          return extractedText;
        };

        try {
          const result = await extractPages();
          clearTimeout(mainTimeout);
          resolve(result);
        } catch (extractError) {
          reject(extractError);
        } finally {
          // Ensure we clean up PDF resources
          try {
            pdf.destroy();
          } catch (e) {
            console.warn("Error destroying PDF object:", e);
          }
        }
      } catch (err) {
        reject(err);
      }
    });

    // Execute with proper error handling
    try {
      return await extractionPromise;
    } catch (error) {
      console.error("PDF extraction error:", error);
      return `[PDF processing error: ${
        error.message || "The file may be encrypted, damaged, or too large"
      }]\n\nPlease consider extracting the text manually or sharing specific parts you'd like me to review.`;
    }
  } catch (outerError) {
    console.error("Fatal PDF processing error:", outerError);
    return `[PDF processing failed completely: ${outerError.message}]\n\nThis could be due to browser limitations or memory constraints. Please extract the text manually or convert the PDF to a more accessible format.`;
  }
};

/**
 * Check if a file is a text-based file by its MIME type or extension
 * @param {string} fileType - MIME type of the file
 * @param {string} fileName - Name of the file
 * @returns {boolean} - Whether the file is text-based
 */
const isTextBasedFile = (fileType, fileName) => {
  // Known text MIME types
  if (
    fileType.includes("text/") ||
    fileType.includes("application/json") ||
    fileType.includes("application/xml") ||
    fileType.includes("application/javascript") ||
    fileType.includes("text/csv") ||
    fileType.includes("application/csv")
  ) {
    return true;
  }

  // Check file extension for common text-based formats
  if (fileName) {
    const extension = fileName.split(".").pop().toLowerCase();
    const textExtensions = [
      "txt",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
      "md",
      "csv",
      "log",
      "yml",
      "yaml",
      "toml",
      "ini",
      "conf",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "cs",
      "php",
      "rb",
      "go",
      "rs",
      "swift",
      "kt",
      "sql",
      "sh",
      "bat",
      "ps1",
      "r",
    ];

    return textExtensions.includes(extension);
  }

  return false;
};

/**
 * Read a file and convert it to base64 text for Gemini API
 * @param {File} file - The file object to read
 * @returns {Promise<{type: string, data: string, content: string, format: string}>} - File info for API
 */
const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileType = file.type || "application/octet-stream";
        const fileName = file.name;
        const extension = fileName.split(".").pop().toLowerCase();
        const fileSize = file.size;

        // Determine the file format for better handling
        let format = "unknown";

        // Image files
        if (fileType.startsWith("image/")) {
          format = "image";
          const base64Data = event.target.result.split(",")[1];
          resolve({
            type: fileType,
            data: base64Data,
            content: null,
            format: format,
          });
        }
        // PDF files
        else if (fileType === "application/pdf" || extension === "pdf") {
          format = "pdf";
          try {
            // Show a quick size warning for large PDFs
            if (isPdfTooLarge(fileSize)) {
              resolve({
                type: fileType,
                data: null, // Don't include the data for large PDFs
                content: `[PDF file "${fileName}" (${(
                  fileSize /
                  (1024 * 1024)
                ).toFixed(
                  2
                )} MB) is too large for direct processing]\n\nTo avoid excessive loading times, I've skipped text extraction. Please consider:\n1. Sharing specific pages or sections you'd like me to review\n2. Using an external PDF text extractor and sharing the text\n3. Summarizing the key points yourself, and I'll assist based on your summary`,
                format: format,
              });
              return;
            }

            // Convert data URL to array buffer for PDF.js
            const base64Data = event.target.result.split(",")[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer;

            // Extract text from PDF with improved handling
            const pdfText = await extractPdfText(
              arrayBuffer,
              fileName,
              fileSize
            );

            resolve({
              type: fileType,
              data: null, // Don't include the data to reduce payload size
              content: pdfText,
              format: format,
            });
          } catch (pdfError) {
            console.error("Error processing PDF:", pdfError);

            // Fallback if text extraction fails
            resolve({
              type: fileType,
              data: null,
              content: `[PDF Document: "${fileName}", ${(
                fileSize / 1024
              ).toFixed(2)} KB - Unable to extract text: ${
                pdfError.message
              }]\n\nThe PDF couldn't be processed. It may be corrupted, password-protected, or using unsupported features.`,
              format: format,
            });
          }
        }
        // CSV files
        else if (fileType === "text/csv" || extension === "csv") {
          format = "csv";
          const textContent = event.target.result;
          // For large CSV files, just show a preview
          const maxRows = 50;
          const rows = textContent.split("\n").slice(0, maxRows + 1);
          const hasMoreRows = rows.length > maxRows;

          const csvContent =
            rows.slice(0, maxRows).join("\n") +
            (hasMoreRows
              ? "\n\n[CSV truncated, showing first 50 rows of " +
                textContent.split("\n").length +
                " total rows]"
              : "");

          resolve({
            type: fileType,
            data: null,
            content: csvContent,
            format: format,
          });
        }
        // Code files (jsx, js, ts, etc.)
        else if (isTextBasedFile(fileType, fileName)) {
          format = "code";
          const textContent = event.target.result;
          // Maximum text length to prevent excessively large API calls
          const maxLength = 100000;
          const truncatedContent =
            textContent.length > maxLength
              ? textContent.substring(0, maxLength) +
                "\n\n[Content truncated due to size limits...]"
              : textContent;

          // Identify language for code highlighting
          let language = "plaintext";
          if (extension) {
            // Map file extensions to markdown language codes
            const languageMap = {
              js: "javascript",
              jsx: "jsx",
              ts: "typescript",
              tsx: "tsx",
              py: "python",
              rb: "ruby",
              java: "java",
              c: "c",
              cpp: "cpp",
              cs: "csharp",
              php: "php",
              html: "html",
              css: "css",
              sql: "sql",
              json: "json",
              xml: "xml",
              md: "markdown",
              sh: "bash",
              yml: "yaml",
              yaml: "yaml",
            };

            language = languageMap[extension] || "plaintext";
          }

          resolve({
            type: fileType,
            data: null,
            content: truncatedContent,
            format: format,
            language: language,
          });
        }
        // For other files (binary), convert to base64 with data URL
        else {
          format = "binary";
          const base64Data = event.target.result.split(",")[1];
          resolve({
            type: fileType,
            data: base64Data,
            content: `[Binary file: ${fileName}, type: ${fileType}, size: ${(
              fileSize / 1024
            ).toFixed(2)} KB]`,
            format: format,
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    // Choose appropriate reading method based on file type
    if (
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      (!isTextBasedFile(file.type, file.name) && !file.type.includes("text/"))
    ) {
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
                `File: ${file.name} (${file.type || "unknown type"}, ${(
                  file.size / 1024
                ).toFixed(1)} KB)`
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
                if (fileContent.format === "image" && fileContent.data) {
                  parts.push({
                    inlineData: {
                      mimeType: file.type,
                      data: fileContent.data,
                    },
                  });
                }
                // Add PDF files with extracted content
                else if (fileContent.format === "pdf") {
                  parts.push({
                    text: `PDF file "${file.name}":\n\n${fileContent.content}\n\n`,
                  });
                }
                // Add CSV files with content properly formatted
                else if (fileContent.format === "csv" && fileContent.content) {
                  parts.push({
                    text: `CSV file "${file.name}":\n\n\`\`\`csv\n${fileContent.content}\n\`\`\`\n\n`,
                  });
                }
                // Add code files with proper syntax highlighting
                else if (fileContent.format === "code" && fileContent.content) {
                  const language = fileContent.language || "plaintext";
                  parts.push({
                    text: `Code file "${file.name}":\n\n\`\`\`${language}\n${fileContent.content}\n\`\`\`\n\n`,
                  });
                }
                // Add text content for other files
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
