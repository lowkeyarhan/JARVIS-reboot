import Homepage from "./pages/homepage.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import "./App.css";

function App() {
  return (
    <ChatProvider>
      <Homepage />
    </ChatProvider>
  );
}
export default App;
