import { useState, useEffect, useRef, Component } from "react";
import MainHeader from "../containers/mainheader.jsx";
import ThinkingAnimation from "./ThinkingAnimation.jsx";
import VoiceToText from "./VoiceToText.jsx";
import ImageUpload from "./ImageUpload.jsx";
import FileUpload from "./FileUpload.jsx";
import LiveTalk from "./LiveTalk.jsx";
import generateGeminiResponse, {
  checkApiStatus,
} from "../services/geminiApi.js";
import { useChat } from "../context/ChatContext.jsx";
import "../styles/maincontainer.css";
import "../styles/markdown.css";
import "../styles/syntax-highlighting.css";
import "../styles/code-formatting.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { enhanceImages, createLightbox } from "../utils/imageHandler.js";
import {
  formatCode,
  normalizeLanguage,
  escapeHtml,
  formatJsonWithHighlighting,
  extractCodeContent,
  extractLanguage,
} from "../utils/codeFormatter.js";

// Configure marked options for security and customization
marked.setOptions({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: true, // Add <br> on single line breaks
  headerIds: true, // Enable automatic header IDs
  mangle: false, // Disable mangling email addresses
  sanitize: false, // Let DOMPurify handle sanitization
  highlight: function (code, lang) {
    try {
      if (typeof code !== "string") {
        code = String(code || "");
      }
      if (!lang || lang === "") {
        return hljs.highlightAuto(code).value;
      }

      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        console.warn(
          `Language '${lang}' not supported by highlight.js, using plaintext`
        );
        return hljs.highlight(code, { language: "plaintext" }).value;
      }
    } catch (error) {
      console.error("Highlight.js error:", error);
      // Fallback to plaintext with escaped HTML
      return code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  },
  langPrefix: "hljs language-",
  pedantic: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

const renderer = new marked.Renderer();

// Customize code blocks with language labels and copy buttons
renderer.code = function (code, language) {
  let validLanguage = "plaintext";
  let highlightedCode = "";

  try {
    // Extract language from the code object if it exists
    if (typeof code === "object" && code !== null) {
      // Use the language from the object or fall back to the provided language
      const extractedLang = extractLanguage(code, language || "plaintext");
      language = extractedLang || language;

      // Extract the actual code content
      const extracted = extractCodeContent(code);
      if (typeof extracted === "string") {
        code = extracted;
      }
    }

    if (
      typeof code === "object" &&
      code !== null &&
      (language === "json" || !language)
    ) {
      validLanguage = "json";

      // Use our special JSON formatter
      highlightedCode = formatJsonWithHighlighting(code);

      // Use properly serialized JSON for the copy button
      const jsonForCopy = JSON.stringify(code, null, 2);

      return `
        <div class="code-block">
          <div class="code-block-header">
            <span>${validLanguage}</span>
            <button class="copy-btn" data-code="${encodeURIComponent(
              jsonForCopy
            )}">
              <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon">
                <path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
                <path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
              </svg>
              <span class="copy-text">Copy</span>
            </button>
          </div>
          <div class="code-block-body">
          <pre><code>${highlightedCode}</code></pre>
          </div>
        </div>
      `;
    }

    // For regular code blocks
    code = formatCode(code);
    validLanguage = normalizeLanguage(language || "plaintext");

    highlightedCode = hljs.highlight(code, {
      language: validLanguage,
      ignoreIllegals: true,
    }).value;

    // Make sure the code is properly encoded for the data attribute
    const encodedCode = encodeURIComponent(code);

    return `
      <div class="code-block">
        <div class="code-block-header">
          <span>${validLanguage}</span>
          <button class="copy-btn" data-code="${encodedCode}">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon">
              <path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
              <path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="code-block-body">
        <pre><code>${highlightedCode}</code></pre>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error highlighting code:", error);

    // Ensure error case also properly encodes content
    const encodedCode = encodeURIComponent(
      typeof code === "string" ? code : String(code)
    );

    return `
      <div class="code-block">
        <div class="code-block-header">
          <span>code</span>
          <button class="copy-btn" data-code="${encodedCode}">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon">
              <path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
              <path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="code-block-body">
        <pre><code>${escapeHtml(code)}</code></pre>
        </div>
      </div>
    `;
  }
};

// Customize inline code
renderer.codespan = function (code) {
  try {
    if (typeof code === "object" && code !== null) {
      const extracted = extractCodeContent(code);
      if (typeof extracted === "string") {
        code = extracted;
      }
    }

    code = formatCode(code);
    const safeCode = escapeHtml(code);

    return `<code class="inline-code">${safeCode}</code>`;
  } catch (error) {
    console.error("Error rendering inline code:", error);
    return `<code class="inline-code">Error rendering code</code>`;
  }
};
marked.use({ renderer });

function renderMarkdown(content) {
  if (!content) return { __html: "" };

  try {
    // Format content if it's not a string (using our utility)
    if (typeof content !== "string") {
      content = formatCode(content);
    }

    // Parse markdown to HTML
    const rawHtml = marked(content);

    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["iframe", "svg", "path"],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "scrolling",
        "data-code",
        "aria-hidden",
        "viewBox",
        "fill-rule",
        "height",
        "width",
        "version",
        "class",
      ],
    });

    return { __html: sanitizedHtml };
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return { __html: `<p>Error rendering content: ${error.message}</p>` };
  }
}

// Error Boundary Component to prevent crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error("Error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <svg
            aria-hidden="true"
            height="16"
            viewBox="0 0 16 16"
            version="1.1"
            width="16"
            className="error-icon"
          >
            <path
              fill-rule="evenodd"
              d="M8 0a8 8 0 100 16A8 8 0 008 0zM5 8a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zM5.32 11.636a.5.5 0 01.136-.677c1.452-1.013 3.992-1.013 5.444 0a.5.5 0 01-.272.92 6.5 6.5 0 01-5.173 0 .5.5 0 01-.135-.243z"
            ></path>
          </svg>
          <p>There was a problem rendering this content.</p>
          {this.state.error && (
            <div className="error-details">
              <pre>{this.state.error.toString()}</pre>
            </div>
          )}
          {this.props.resetError && (
            <button onClick={this.props.resetError}>Try Again</button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

function MainContainer() {
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // State for voice, image, and file features
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isImageUploadActive, setIsImageUploadActive] = useState(false);
  const [isFileUploadActive, setIsFileUploadActive] = useState(false);
  const [isLiveTalkActive, setIsLiveTalkActive] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const [filesSelected, setFilesSelected] = useState(false);

  const chatContainerRef = useRef(null);
  const fileUploadRef = useRef({});

  const {
    activeMessages,
    updateActiveMessages,
    activeConversationId,
    updateConversationTitle,
  } = useChat();

  // Get time of day for greeting
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  // Format timestamp in J.A.R.V.I.S. style
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check API status on component mount
  useEffect(() => {
    const verifyApiStatus = async () => {
      try {
        const status = await checkApiStatus();
        setApiAvailable(status);
      } catch (error) {
        console.error("Error checking API status:", error);
        setApiAvailable(false);
      }
    };

    verifyApiStatus();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth", // Enable smooth scrolling
      });
    }
  }, [activeMessages, isLoading]);

  // Add event listener for copy buttons after rendering
  useEffect(() => {
    try {
      enhanceImages();

      // More reliable method for attaching copy functionality
      const attachCopyHandlers = () => {
        document.querySelectorAll(".copy-btn").forEach((button) => {
          // Remove any existing listeners to prevent duplicates
          button.removeEventListener("click", handleCopyClick);
          button.addEventListener("click", handleCopyClick);
        });
      };

      // Initial attachment
      attachCopyHandlers();

      // Use MutationObserver to watch for new code blocks
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length) {
            // Check if new code blocks were added
            setTimeout(attachCopyHandlers, 100);
          }
        });
      });

      // Start observing the chat container
      if (chatContainerRef.current) {
        observer.observe(chatContainerRef.current, {
          childList: true,
          subtree: true,
        });
      }

      // Cleanup function
      return () => {
        // Disconnect the observer
        observer.disconnect();

        // Remove all event listeners
        document.querySelectorAll(".copy-btn").forEach((button) => {
          button.removeEventListener("click", handleCopyClick);
        });
      };
    } catch (error) {
      console.error("Error setting up copy functionality:", error);
    }
  }, [activeMessages]);

  // Handler for copy button clicks - improved implementation
  const handleCopyClick = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const copyButton = this;

    try {
      // Get the encoded code from data attribute
      const encodedCode = copyButton.getAttribute("data-code");
      if (!encodedCode) {
        console.error("No code data found to copy");
        return;
      }

      // Save original button content
      const originalContent = copyButton.innerHTML;

      // Decode the text (handle potential encoding errors)
      let textToCopy;
      try {
        textToCopy = decodeURIComponent(encodedCode);
      } catch (decodeError) {
        console.error("Failed to decode content:", decodeError);
        textToCopy = encodedCode; // Fallback to raw content
      }

      // Use writeText with proper promise handling
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          // Success state
          copyButton.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #0a84ff;">
              <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path>
            </svg>
            <span class="copy-text">Copied!</span>
          `;

          // Add success class for animation
          copyButton.classList.add("copy-success");

          // Reset after timeout
          setTimeout(() => {
            if (copyButton && copyButton.parentNode) {
              copyButton.innerHTML = originalContent;
              copyButton.classList.remove("copy-success");
            }
          }, 5000);
        })
        .catch((error) => {
          // Error state
          console.error("Clipboard write failed:", error);
          copyButton.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #f85149;">
              <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
            </svg>
            <span class="copy-text">Error!</span>
          `;

          copyButton.classList.add("copy-error");

          setTimeout(() => {
            if (copyButton && copyButton.parentNode) {
              copyButton.innerHTML = originalContent;
              copyButton.classList.remove("copy-error");
            }
          }, 2000);

          // Fallback copy method for browsers with restricted clipboard API
          if (error.name === "NotAllowedError") {
            try {
              // Create temporary textarea
              const textarea = document.createElement("textarea");
              textarea.value = textToCopy;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.select();

              // Execute copy command
              const success = document.execCommand("copy");
              document.body.removeChild(textarea);

              if (success) {
                // Show success state
                copyButton.innerHTML = `
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #0a84ff;">
                    <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path>
                  </svg>
                  <span class="copy-text">Copied!</span>
                `;
                copyButton.classList.add("copy-success");

                setTimeout(() => {
                  if (copyButton && copyButton.parentNode) {
                    copyButton.innerHTML = originalContent;
                    copyButton.classList.remove("copy-success");
                  }
                }, 5000);
              }
            } catch (fallbackError) {
              console.error("Fallback copy method failed:", fallbackError);
            }
          }
        });
    } catch (error) {
      console.error("Error in copy button handler:", error);

      // Show general error state
      copyButton.innerHTML = `
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #f85149;">
          <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
        </svg>
        <span class="copy-text">Error!</span>
      `;

      copyButton.classList.add("copy-error");

      setTimeout(() => {
        if (copyButton && copyButton.parentNode) {
          copyButton.innerHTML = originalContent || "Copy";
          copyButton.classList.remove("copy-error");
        }
      }, 2000);
    }
  };

  const textareaRef = useRef(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [inputMessage]);

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Handle enter key submission
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle voice transcript
  const handleVoiceTranscript = (transcript) => {
    // Append transcript to existing text
    setInputMessage((prev) => {
      // Add space if needed
      const needsSpace = prev.length > 0 && !prev.endsWith(" ");
      return prev + (needsSpace ? " " : "") + transcript;
    });
  };

  // Handle image upload
  const handleImageUpload = (imageData) => {
    // This function is now only a container for getCurrentImage method
    // The actual submission happens in handleSubmit
  };

  // Handle AI response
  const handleAIResponse = async (messages) => {
    setIsLoading(true);
    try {
      // Get AI response
      const assistantMessage = await getAIResponse(messages);

      // Add AI message to conversation
      updateActiveMessages([...messages, assistantMessage]);
    } catch (error) {
      console.error("Error processing with AI:", error);

      // Handle error with user-friendly message
      const errorMessage = {
        id: Date.now(),
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };

      updateActiveMessages([...messages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI response (abstracted to be used by both handleAIResponse and handleLiveTalkMessage)
  const getAIResponse = async (messages) => {
    try {
      // Extract messages for API call (simple format without UI-specific properties)
      const apiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        // Include image if present
        ...(msg.image && { image: msg.image }),
      }));

      // Call API to get response
      const response = await generateGeminiResponse(apiMessages);

      // Create assistant message
      return {
        id: Date.now(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw error;
    }
  };

  // Handle attachment clicks
  const handleAttachmentClick = (type) => {
    // Reset all attachment states first
    setIsVoiceActive(false);
    setIsImageUploadActive(false);
    setIsFileUploadActive(false);
    setIsLiveTalkActive(false);

    // Then set the active state based on the clicked button
    switch (type) {
      case "microphone":
        setIsVoiceActive(true);
        break;
      case "photo":
        setIsImageUploadActive(true);
        break;
      case "files":
        setIsFileUploadActive(true);
        break;
      case "live-talk":
        setIsLiveTalkActive(true);
        break;
      default:
        break;
    }
  };

  // Function to clear selected files
  const clearSelectedFiles = () => {
    if (fileUploadRef.current) {
      if (fileUploadRef.current.getCurrentFiles) {
        fileUploadRef.current.getCurrentFiles = () => [];
      }
      fileUploadRef.current.filesSelected = false;
      setFilesSelected(false);

      // Reset file input if it exists
      const fileInput = document.querySelector(".file-input-multi");
      if (fileInput) {
        fileInput.value = null;
      }
    }
  };

  // Function to clear a selected image
  const clearSelectedImage = () => {
    if (handleImageUpload) {
      // Reset image state in parent component
      if (handleImageUpload.getCurrentImage) {
        handleImageUpload.getCurrentImage = () => null;
      }
      handleImageUpload.imageSelected = false;
      setImageSelected(false);

      // Reset file input if it exists
      const fileInput = document.querySelector(".file-input");
      if (fileInput) {
        fileInput.value = null;
      }
    }
  };

  // Open image in fullscreen
  const openImageFullscreen = (imageUrl, imageName) => {
    if (createLightbox && imageUrl) {
      createLightbox(imageUrl, imageName);
    }
  };

  // Check for image and file selection status
  useEffect(() => {
    const checkSelectionStatus = () => {
      if (handleImageUpload && handleImageUpload.imageSelected) {
        setImageSelected(true);
      } else {
        setImageSelected(false);
      }

      if (fileUploadRef.current && fileUploadRef.current.filesSelected) {
        setFilesSelected(true);
      } else {
        setFilesSelected(false);
      }
    };

    // Set up an interval to check selection status
    checkSelectionStatus(); // Check immediately
    const interval = setInterval(checkSelectionStatus, 300);

    // Clean up interval
    return () => clearInterval(interval);
  }, [handleImageUpload, fileUploadRef.current]);

  // Render custom message content based on type
  const renderMessageContent = (message) => {
    if (message.role === "user") {
      return (
        <div>
          <p>{message.content}</p>
          {message.image && (
            <div className="user-image-container">
              <img
                src={message.image.dataUrl}
                alt={message.image.name || "Uploaded image"}
                className="user-image"
                onClick={() =>
                  openImageFullscreen(message.image.dataUrl, message.image.name)
                }
              />
              <div className="image-info">
                <span className="image-name">{message.image.name}</span>
                <span className="image-size">
                  {(message.image.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          )}
          {message.files && message.files.length > 0 && (
            <div className="user-files-container">
              {message.files.map((file) => (
                <div className="user-file" key={file.id}>
                  <div className="file-icon">
                    <i className={`fa-solid ${getFileIcon(file.type)}`}></i>
                  </div>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <ErrorBoundary
          resetError={() => {
            console.log("Attempting to reset error");
          }}
        >
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={renderMarkdown(message.content)}
          />
        </ErrorBoundary>
      );
    }
  };

  // Handle text submission with image and files
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      (inputMessage.trim() === "" && !imageSelected && !filesSelected) ||
      isLoading
    )
      return;

    // Check if API is available
    if (!apiAvailable) {
      const apiErrorMessage = {
        id: Date.now(),
        role: "assistant",
        content:
          "I'm sorry, sir. I'm currently unable to process requests due to connectivity issues with my core systems. Please check the API key configuration.",
        timestamp: Date.now(),
      };

      // Add user message
      const userMessage = {
        id: Date.now() - 1,
        role: "user",
        content: inputMessage,
        timestamp: Date.now(),
      };

      updateActiveMessages([...activeMessages, userMessage, apiErrorMessage]);
      setInputMessage("");
      return;
    }

    // Check if we have an image to upload
    let imageData = null;
    if (
      imageSelected &&
      handleImageUpload &&
      handleImageUpload.getCurrentImage
    ) {
      imageData = handleImageUpload.getCurrentImage();
      // Clear the selected image after getting the data
      clearSelectedImage();
    }

    // Check if we have files to upload
    let fileData = [];
    if (
      filesSelected &&
      fileUploadRef.current &&
      fileUploadRef.current.getCurrentFiles
    ) {
      fileData = fileUploadRef.current.getCurrentFiles();
      // Clear the selected files after getting the data
      clearSelectedFiles();
    }

    // Add user message with optional image and files
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage || (imageData || fileData.length > 0 ? "" : ""),
      timestamp: Date.now(),
      image: imageData,
      files: fileData.length > 0 ? fileData : null,
    };

    // Don't proceed if no content, no image, and no files
    if (
      userMessage.content.trim() === "" &&
      !imageData &&
      (!fileData || fileData.length === 0)
    )
      return;

    const updatedMessages = [...activeMessages, userMessage];
    updateActiveMessages(updatedMessages);

    // If this is the first user message in the conversation, use it as the title
    if (activeMessages.length === 1) {
      updateConversationTitle(
        activeConversationId,
        inputMessage || "File/Image upload"
      );
    }

    setInputMessage("");

    // Process with AI
    handleAIResponse(updatedMessages);
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return "fa-file-image";
    } else if (fileType.includes("pdf")) {
      return "fa-file-pdf";
    } else if (
      fileType.includes("document") ||
      fileType.includes("msword") ||
      fileType.includes("officedocument.wordprocessing")
    ) {
      return "fa-file-word";
    } else if (
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileType.includes("officedocument.spreadsheet")
    ) {
      return "fa-file-excel";
    } else if (
      fileType.includes("presentation") ||
      fileType.includes("powerpoint") ||
      fileType.includes("officedocument.presentation")
    ) {
      return "fa-file-powerpoint";
    } else if (fileType.includes("text/")) {
      return "fa-file-alt";
    } else if (fileType.includes("audio/")) {
      return "fa-file-audio";
    } else if (fileType.includes("video/")) {
      return "fa-file-video";
    } else if (
      fileType.includes("zip") ||
      fileType.includes("rar") ||
      fileType.includes("tar") ||
      fileType.includes("7z")
    ) {
      return "fa-file-archive";
    } else if (fileType.includes("csv")) {
      return "fa-file-csv";
    } else if (
      fileType.includes("code") ||
      fileType.includes("javascript") ||
      fileType.includes("html") ||
      fileType.includes("css")
    ) {
      return "fa-file-code";
    }
    return "fa-file";
  };

  // Modified Live Talk API endpoint
  const getLiveTalkEndpoint = () => {
    return "/api/chat?mode=live";
  };

  // Direct API call handler for Live Talk without adding to chat
  const handleLiveTalkDirectApi = async (message) => {
    if (!message.trim() || !apiAvailable) return null;

    try {
      // Extract current conversation context for API
      const context = activeMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.image && { image: msg.image }),
      }));

      // Create messages array for the API call
      const apiMessages = [...context, { role: "user", content: message }];

      // Call Gemini API directly
      const response = await generateGeminiResponse(apiMessages);

      return {
        role: "assistant",
        content: response || "I couldn't process that request.",
      };
    } catch (error) {
      console.error("Error in live talk API call:", error);
      return {
        role: "assistant",
        content: "I'm sorry, there was an error processing your request.",
      };
    }
  };

  // Original Live Talk handler (keep for backward compatibility)
  const handleLiveTalkMessage = async (message) => {
    if (!message.trim() || !apiAvailable) return null;

    // Create a user message
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    // Create a temporary array with the new message for API processing
    const messagesForApi = [...activeMessages, userMessage];

    // Add user message to the chat
    updateActiveMessages(messagesForApi);

    // Start loading state
    setIsLoading(true);

    try {
      // Extract messages for API call (simple format without UI-specific properties)
      const apiMessages = messagesForApi.map((msg) => ({
        role: msg.role,
        content: msg.content,
        // Include image if present
        ...(msg.image && { image: msg.image }),
      }));

      // Call API to get response directly
      const response = await generateGeminiResponse(apiMessages);

      // Create assistant message
      const assistantMessage = {
        id: Date.now(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      // Add the response to the chat container
      updateActiveMessages([...messagesForApi, assistantMessage]);

      // Return the response for the LiveTalk component to handle
      return assistantMessage;
    } catch (error) {
      console.error("Error in live talk processing:", error);

      // Create error message
      const errorMessage = {
        id: Date.now(),
        role: "assistant",
        content:
          "I'm sorry, but I encountered an error processing your request. Please check the API connection or try again later.",
        timestamp: Date.now(),
      };

      // Add error message to chat
      updateActiveMessages([...messagesForApi, errorMessage]);

      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle receiving a live talk response
  const handleLiveTalkResponse = (response) => {
    // No longer needed as we're handling this in the LiveTalk component
  };

  // Render the component
  return (
    <div className="main-container">
      <MainHeader />

      <div className="chat-container" ref={chatContainerRef}>
        {activeMessages.map((message, index) => {
          if (index === 0) return null;

          return (
            <div
              key={message.id}
              className={`message ${
                message.role === "user" ? "user-message" : "assistant-message"
              }`}
            >
              <div className="message-header">
                <span className="message-sender">
                  {message.role === "user" ? "USER" : "JARVIS"}
                </span>
                <span className="message-timestamp">
                  {formatTimestamp(message.timestamp || message.id)}
                </span>
              </div>
              <div className="message-content">
                {renderMessageContent(message)}
              </div>
              <div className="message-decorations">
                <div className="message-corner"></div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="message assistant-message">
            <div className="message-header">
              <span className="message-sender">JARVIS</span>
              <span className="message-timestamp">
                {formatTimestamp(currentTime)}
              </span>
            </div>
            <div className="animation-wrapper">
              <ThinkingAnimation />
            </div>
            <div className="message-decorations">
              <div className="message-corner"></div>
            </div>
          </div>
        )}
      </div>

      {/* LiveTalk Component positioned at the main container level instead of chat-container */}
      {isLiveTalkActive && (
        <div className="live-talk-container">
          <LiveTalk
            isActive={isLiveTalkActive}
            setIsActive={setIsLiveTalkActive}
            onSendMessage={handleLiveTalkDirectApi}
            onReceiveResponse={handleLiveTalkResponse}
          />
        </div>
      )}

      {/* Voice to Text Component */}
      <VoiceToText
        onTranscript={handleVoiceTranscript}
        isActive={isVoiceActive}
        setIsActive={setIsVoiceActive}
      />

      {/* Image Upload Component */}
      <ImageUpload
        onImageUpload={handleImageUpload}
        isActive={isImageUploadActive}
        setIsActive={setIsImageUploadActive}
      />

      {/* File Upload Component */}
      <FileUpload
        onFileUpload={fileUploadRef.current}
        isActive={isFileUploadActive}
        setIsActive={setIsFileUploadActive}
      />

      <div className="input-container">
        {filesSelected && (
          <div className="selected-files-preview">
            {/* Files will be rendered by the FileUpload component */}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              apiAvailable
                ? "Initiate conversation..."
                : "API connectivity issues. Please check configuration."
            }
            rows={1}
            className={`message-input ${!apiAvailable ? "error-state" : ""}`}
            disabled={isLoading}
          />
          <div className="attachments">
            <span
              id="photo"
              className={`${isImageUploadActive ? "active" : ""} ${
                imageSelected ? "image-selected" : ""
              }`}
              onClick={() => handleAttachmentClick("photo")}
            >
              <i className="fa-regular fa-image"></i>
            </span>
            <span
              id="files"
              className={filesSelected ? "files-selected" : ""}
              onClick={() => handleAttachmentClick("files")}
            >
              <i className="fa-solid fa-paperclip"></i>
            </span>
            <span
              id="microphone-btn"
              className={isVoiceActive ? "active" : ""}
              onClick={() => handleAttachmentClick("microphone")}
            >
              <i className="fa-solid fa-microphone-lines"></i>
            </span>
            <span
              id="live-talk-btn"
              className={isLiveTalkActive ? "active" : ""}
              onClick={() => handleAttachmentClick("live-talk")}
              title="Live Talk"
            >
              <i className="fa-solid fa-headset"></i>
            </span>
          </div>
          <button
            type="submit"
            className={`send-button ${
              isLoading || !apiAvailable ? "disabled" : ""
            }`}
            disabled={
              isLoading ||
              !apiAvailable ||
              (inputMessage.trim() === "" && !imageSelected && !filesSelected)
            }
          >
            <i className="fa-regular fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
}

export default MainContainer;
