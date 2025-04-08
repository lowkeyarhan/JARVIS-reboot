import { useEffect, useRef } from "react";
import Sidebar from "../components/sidebar.jsx";
import MainContainer from "../components/maincontainer.jsx";
import "../styles/homepage.css";

function Homepage() {
  const circuitRef = useRef(null);
  const reactorRef = useRef(null);

  useEffect(() => {
    createCircuitBackground();
    createReactorGlow();
    return () => {
      document
        .querySelectorAll(".circuit-line, .circuit-dot, .secondary-glow")
        .forEach((el) => el.remove());
    };
  }, []);

  const createCircuitBackground = () => {
    if (!circuitRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const numLines = 15;

    for (let i = 0; i < numLines; i++) {
      // Create horizontal line
      const hLine = createLine({
        width: `${Math.random() * 200 + 100}px`,
        height: "1px",
        top: `${Math.random() * height}px`,
        left: `${Math.random() * (width - 300)}px`,
      });

      // Create vertical line
      const vLine = createLine({
        width: "1px",
        height: `${Math.random() * 200 + 100}px`,
        top: `${Math.random() * (height - 300)}px`,
        left: `${Math.random() * width}px`,
      });

      // Add dots to both lines
      [hLine, vLine].forEach((line) => {
        addCircuitDot(line, 0, 0);
        addCircuitDot(
          line,
          parseInt(line.style.width),
          parseInt(line.style.height)
        );
      });
    }
  };

  const createLine = (styles) => {
    const line = document.createElement("div");
    line.className = "circuit-line";
    Object.assign(line.style, styles);
    circuitRef.current.appendChild(line);
    return line;
  };

  const addCircuitDot = (line, xOffset, yOffset) => {
    const dot = document.createElement("div");
    dot.className = "circuit-dot";
    Object.assign(dot.style, {
      width: "4px",
      height: "4px",
      left: `${xOffset - 2}px`,
      top: `${yOffset - 2}px`,
      animationDelay: `${Math.random() * 3}s`,
    });
    line.appendChild(dot);
  };

  const createReactorGlow = () => {
    if (!reactorRef.current) return;

    for (let i = 0; i < 3; i++) {
      const size = `${Math.random() * 150 + 50}px`;
      const glow = document.createElement("div");
      glow.className = "secondary-glow";
      Object.assign(glow.style, {
        top: `${Math.random() * 70 + 10}%`,
        left: `${Math.random() * 70 + 10}%`,
        width: size,
        height: size,
        animationDelay: `${Math.random() * 5}s`,
      });
      document.body.appendChild(glow);
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
