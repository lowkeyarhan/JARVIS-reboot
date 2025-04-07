import { useState, useEffect, useRef } from "react";
import MainHeader from "../containers/mainheader.jsx";
import ThinkingAnimation from "./ThinkingAnimation.jsx";
import generateGeminiResponse, {
  checkApiStatus,
} from "../services/geminiApi.js";
import { useChat } from "../context/ChatContext.jsx";
import "../styles/maincontainer.css";
import "../styles/markdown.css";
import "../styles/syntax-highlighting.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked options for security and customization
marked.setOptions({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: true, // Add <br> on single line breaks
  headerIds: false, // Disable automatic header IDs
  mangle: false, // Disable mangling email addresses
  sanitize: false, // Let DOMPurify handle sanitization
});

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
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [activeMessages, isLoading]);

  // Auto-resize textarea based on content
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

  return (
    <div className="main-container">
      <MainHeader />

      <div className="hud-overlay">
        <div className="hud-element hud-top-left">
          <div className="hud-status">
            <span className="hud-status-dot"></span>
            <span>J.A.R.V.I.S. ONLINE</span>
          </div>
        </div>
        <div className="hud-element hud-top-right">
          <div className="hud-time">{formatTimestamp(currentTime)}</div>
        </div>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {activeMessages.map((message, index) => {
          // Skip the first message (system message)
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
                  {message.role === "user" ? "USER" : "J.A.R.V.I.S."}
                </span>
                <span className="message-timestamp">
                  {formatTimestamp(message.timestamp || message.id)}
                </span>
              </div>
              <div className="message-content">
                {message.role === "user" ? (
                  <p>{message.content}</p>
                ) : (
                  <div className="markdown-content">{message.content}</div>
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
              <span className="message-sender">J.A.R.V.I.S.</span>
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
