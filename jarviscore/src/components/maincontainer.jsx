import { useState, useEffect, useRef, Component } from "react";
import MainHeader from "../containers/mainheader.jsx";
import ThinkingAnimation from "./ThinkingAnimation.jsx";
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
import { enhanceImages } from "../utils/imageHandler.js";
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

      return `
        <div class="code-block">
          <div class="code-block-header">
            <span>${validLanguage}</span>
          </div>
          <pre><code>${highlightedCode}</code></pre>
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

    return `
      <div class="code-block">
        <div class="code-block-header">
          <span>${validLanguage}</span>
        </div>
        <pre><code>${highlightedCode}</code></pre>
      </div>
    `;
  } catch (error) {
    console.error("Error highlighting code:", error);
    return `
      <div class="code-block">
        <div class="code-block-header">
          <span>code</span>
        </div>
        <pre><code>${escapeHtml(code)}</code></pre>
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
  const chatContainerRef = useRef(null);

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

  // Process and enhance images after markdown is rendered
  useEffect(() => {
    try {
      enhanceImages();

      // Add copy functionality for code blocks - safer implementation
      document.querySelectorAll(".copy-btn").forEach((button) => {
        button.removeEventListener("click", handleCopyClick);
        button.addEventListener("click", handleCopyClick);
      });
    } catch (error) {
      console.error("Error in post-render processing:", error);
    }
  }, [activeMessages]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === "" || isLoading) return;

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

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputMessage,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeMessages, userMessage];
    updateActiveMessages(updatedMessages);

    // If this is the first user message in the conversation, use it as the title
    if (activeMessages.length === 1) {
      updateConversationTitle(activeConversationId, inputMessage);
    }

    setInputMessage("");
    setIsLoading(true);

    try {
      // Get AI response from Gemini
      const aiResponseText = await generateGeminiResponse(updatedMessages);

      // Add AI response to messages
      const aiResponse = {
        id: Date.now() + 1,
        role: "assistant",
        content: aiResponseText,
        timestamp: Date.now(),
      };

      updateActiveMessages([...updatedMessages, aiResponse]);
    } catch (error) {
      console.error("Error getting AI response:", error);

      // Simple error message
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `I'm sorry, sir. I encountered an error processing your request. My systems may need attention. Error: ${
          error.message || "Unknown error"
        }`,
        timestamp: Date.now(),
      };

      updateActiveMessages([...updatedMessages, errorMessage]);

      // Update API availability
      setApiAvailable(false);

      // Try to restore API availability after 10 seconds
      setTimeout(async () => {
        try {
          const status = await checkApiStatus();
          setApiAvailable(status);
        } catch (error) {
          console.error("Failed to restore API connection:", error);
        }
      }, 10000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle attachment clicks
  const handleAttachmentClick = (type) => {
    console.log(`Attachment clicked: ${type}`);
    // TODO: Implement attachment functionality
  };

  // Handler for copy button clicks
  const handleCopyClick = function () {
    try {
      const encodedCode = this.getAttribute("data-code");
      if (!encodedCode) return;

      const textToCopy = decodeURIComponent(encodedCode);
      const copyButton = this;
      const originalContent = this.innerHTML;

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          // Update button text to show success feedback
          copyButton.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #3fb950;">
              <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path>
            </svg>
            <span class="copy-text">Copied!</span>
          `;

          setTimeout(() => {
            if (copyButton.parentNode) {
              copyButton.innerHTML = originalContent;
            }
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          copyButton.innerHTML = `
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="copy-icon" style="fill: #f85149;">
              <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
            </svg>
            <span class="copy-text">Error!</span>
          `;
          setTimeout(() => {
            if (copyButton.parentNode) {
              copyButton.innerHTML = originalContent;
            }
          }, 2000);
        });
    } catch (error) {
      console.error("Error copying code:", error);
    }
  };

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
                {message.role === "user" ? (
                  <p>{message.content}</p>
                ) : (
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
                )}
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

      <div className="input-container">
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              apiAvailable
                ? "Innitiate conversation..."
                : "API connectivity issues. Please check configuration."
            }
            rows={1}
            className={`message-input ${!apiAvailable ? "error-state" : ""}`}
            disabled={isLoading}
          />
          <div className="attachments">
            <span id="photo" onClick={() => handleAttachmentClick("photo")}>
              <i className="fa-regular fa-image"></i>
            </span>
            <span id="files" onClick={() => handleAttachmentClick("files")}>
              <i className="fa-solid fa-paperclip"></i>
            </span>
            <span
              id="microphone-btn"
              onClick={() => handleAttachmentClick("microphone")}
            >
              <i className="fa-solid fa-microphone-lines"></i>
            </span>
          </div>
          <button
            type="submit"
            className={`send-button ${
              isLoading || !apiAvailable ? "disabled" : ""
            }`}
            disabled={isLoading || inputMessage.trim() === "" || !apiAvailable}
          >
            <i className="fa-regular fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
}

export default MainContainer;
