import { createContext, useState, useContext, useEffect } from "react";

// Create the context
const ChatContext = createContext();

// Custom hook to use the context
export const useChat = () => useContext(ChatContext);

// Chat Provider component
export function ChatProvider({ children }) {
  // Active conversation ID
  const [activeConversationId, setActiveConversationId] = useState(null);

  // All conversations with their messages
  const [conversations, setConversations] = useState([]);

  // Current active messages
  const [activeMessages, setActiveMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello! I am J.A.R.V.I.S, your personal AI assistant. How may I assist you today, sir?",
    },
  ]);

  // Start a new conversation
  const startNewConversation = () => {
    const newId = Date.now();
    const newConversation = {
      id: newId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 1,
          role: "assistant",
          content:
            "Hello! I am J.A.R.V.I.S, your personal AI assistant. How may I assist you today, sir?",
        },
      ],
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setActiveMessages(newConversation.messages);
  };

  // Switch to an existing conversation
  const switchConversation = (conversationId) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setActiveConversationId(conversationId);
      setActiveMessages(conversation.messages);
    }
  };

  // Update messages in the active conversation
  const updateActiveMessages = (newMessages) => {
    setActiveMessages(newMessages);

    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? { ...conv, messages: newMessages }
            : conv
        )
      );
    }
  };

  // Update conversation title
  const updateConversationTitle = (conversationId, firstUserMessage) => {
    // Generate a title based on the first user message
    const title =
      firstUserMessage.length > 30
        ? firstUserMessage.substring(0, 30) + "..."
        : firstUserMessage;

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, title } : conv
      )
    );
  };

  // Delete a conversation
  const deleteConversation = (conversationId) => {
    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );

    // If the active conversation was deleted, switch to the first one or start a new one
    if (activeConversationId === conversationId) {
      if (conversations.length > 1) {
        const nextConversation = conversations.find(
          (c) => c.id !== conversationId
        );
        if (nextConversation) {
          switchConversation(nextConversation.id);
        } else {
          startNewConversation();
        }
      } else {
        startNewConversation();
      }
    }
  };

  // Auto-start a conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      startNewConversation();
    } else if (!activeConversationId) {
      // Set the first conversation as active by default
      switchConversation(conversations[0].id);
    }
  }, []);

  const value = {
    activeConversationId,
    conversations,
    activeMessages,
    startNewConversation,
    switchConversation,
    updateActiveMessages,
    updateConversationTitle,
    deleteConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export default ChatContext;
