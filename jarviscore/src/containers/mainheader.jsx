import { useState, useEffect } from "react";
import { checkApiStatus } from "../services/geminiApi.js";
import { useChat } from "../context/ChatContext.jsx";
import "../styles/mainheader.css";

function MainHeader() {
  const [greeting, setGreeting] = useState("");
  const [timeString, setTimeString] = useState("");
  const [apiStatus, setApiStatus] = useState("checking"); // "checking", "online", "offline"

  const { activeMessages } = useChat();
  const showGreeting = activeMessages.length <= 1;

  // Get current time to customize greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Update time string
  const updateTimeString = () => {
    const now = new Date();
    const options = {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
    setTimeString(now.toLocaleDateString("en-US", options));
  };

  // Check API status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkApiStatus();
        setApiStatus(status ? "online" : "offline");
      } catch (error) {
        console.error("Error checking API status:", error);
        setApiStatus("offline");
      }
    };

    checkStatus();
  }, []);

  // Initialize greeting and time on component mount
  useEffect(() => {
    setGreeting(getGreeting());
    updateTimeString();

    // Update time every minute
    const intervalId = setInterval(() => {
      updateTimeString();
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="main-header">
      <div className="greeting">
        <h1>
          <span className="greeting-text">{greeting}</span>, Señor
        </h1>
        {showGreeting && <p>How may I assist you today?</p>}
        <div className="status-container">
          <div className={`status-indicator ${apiStatus}`}></div>
          <p>
            J.A.R.V.I.S.{" "}
            {apiStatus === "online"
              ? "online"
              : apiStatus === "offline"
              ? "core systems offline"
              : "initializing"}{" "}
            • {timeString}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MainHeader;
