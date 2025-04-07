import { useChat } from "../context/ChatContext.jsx";
import "../styles/sidebar.css";

function Sidebar() {
  const {
    conversations,
    activeConversationId,
    startNewConversation,
    switchConversation,
    deleteConversation,
  } = useChat();

  // Format the date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>JARVIS</h1>
        <p>Always Watching, Always Learning</p>
        <div className="new-chat">
          <button className="new-chat-button" onClick={startNewConversation}>
            <span className="icon">
              <i className="fa-solid fa-bolt"></i>
            </span>
            New chat
          </button>
        </div>
      </div>

      <div className="conversation-history">
        {conversations.length === 0 ? (
          <p className="no-conversations">No conversations yet</p>
        ) : (
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id} className="conversation-item">
                <div
                  className={`conversation-card ${
                    activeConversationId === conversation.id ? "active" : ""
                  }`}
                >
                  <button
                    className="conversation-button"
                    onClick={() => switchConversation(conversation.id)}
                  >
                    {conversation.title}
                    <span className="conversation-date">
                      {formatDate(conversation.createdAt)}
                    </span>
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    title="Delete conversation"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
