import { useEffect, useRef } from "react";
import Sidebar from "../components/sidebar.jsx";
import MainContainer from "../components/maincontainer.jsx";
import "../styles/homepage.css";

function Homepage() {
  const circuitRef = useRef(null);
  const reactorRef = useRef(null);

  useEffect(() => {
    // Create circuit background elements
    createCircuitBackground();

    // Create reactor glow effect
    createReactorGlow();

    // Cleanup on unmount
    return () => {
      const circuitDots = document.querySelectorAll(
        ".circuit-line, .circuit-dot, .secondary-glow"
      );
      circuitDots.forEach((el) => el.remove());
    };
  }, []);

  const createCircuitBackground = () => {
    // Create random circuit lines and dots
    if (circuitRef.current) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Create horizontal and vertical lines
      for (let i = 0; i < 15; i++) {
        // Horizontal line
        const hLine = document.createElement("div");
        hLine.className = "circuit-line";
        hLine.style.width = `${Math.random() * 200 + 100}px`;
        hLine.style.height = "1px";
        hLine.style.top = `${Math.random() * height}px`;
        hLine.style.left = `${Math.random() * (width - 300)}px`;
        circuitRef.current.appendChild(hLine);

        // Vertical line
        const vLine = document.createElement("div");
        vLine.className = "circuit-line";
        vLine.style.width = "1px";
        vLine.style.height = `${Math.random() * 200 + 100}px`;
        vLine.style.top = `${Math.random() * (height - 300)}px`;
        vLine.style.left = `${Math.random() * width}px`;
        circuitRef.current.appendChild(vLine);

        // Add dots at ends
        addCircuitDot(hLine, 0, 0);
        addCircuitDot(hLine, parseInt(hLine.style.width), 0);
        addCircuitDot(vLine, 0, 0);
        addCircuitDot(vLine, 0, parseInt(vLine.style.height));
      }
    }
  };

  const addCircuitDot = (line, xOffset, yOffset) => {
    const dot = document.createElement("div");
    dot.className = "circuit-dot";
    dot.style.width = "4px";
    dot.style.height = "4px";
    dot.style.left = `${xOffset - 2}px`;
    dot.style.top = `${yOffset - 2}px`;
    line.appendChild(dot);

    // Random pulse delay
    dot.style.animationDelay = `${Math.random() * 3}s`;
  };

  const createReactorGlow = () => {
    if (reactorRef.current) {
      // Create 3 smaller glows
      for (let i = 0; i < 3; i++) {
        const glow = document.createElement("div");
        glow.className = "secondary-glow";

        // Random positions
        const top = Math.random() * 70 + 10; // 10-80% vertically
        const left = Math.random() * 70 + 10; // 10-80% horizontally

        glow.style.top = `${top}%`;
        glow.style.left = `${left}%`;
        glow.style.width = `${Math.random() * 150 + 50}px`; // 50-200px size
        glow.style.height = glow.style.width;
        glow.style.animationDelay = `${Math.random() * 5}s`; // Random delay

        document.body.appendChild(glow);
      }
    }
  };

  return (
    <div className="homepage">
      <div className="circuit-background" ref={circuitRef}></div>
      <div className="reactor-glow" ref={reactorRef}></div>
      <Sidebar />
      <MainContainer />
    </div>
  );
}
export default Homepage;
