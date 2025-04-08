import { useEffect, useRef } from "react";
import Sidebar from "../components/sidebar.jsx";
import MainContainer from "../components/maincontainer.jsx";
import "../styles/homepage.css";

function Homepage() {
  const particlesRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    createFireflyParticles();
    createCloudyBackground();

    // Clean up all created elements on unmount
    return () =>
      document
        .querySelectorAll(".firefly-particle, .cloud-gradient")
        .forEach((el) => el.remove());
  }, []);

  const createFireflyParticles = () => {
    if (!particlesRef.current) return;
    const width = window.innerWidth,
      height = window.innerHeight;

    // Reduced number of particles for better performance and aesthetics
    for (let i = 0; i < 40; i++) {
      createParticle(width, height);
    }
  };

  const createParticle = (width, height) => {
    if (!particlesRef.current) return;

    const particle = document.createElement("div");
    particle.className = "firefly-particle";

    // Enhanced particles with more size variation
    const size = Math.random() * 4 + 1;
    const blur = Math.random() * 3 + 1;

    // Position randomly across the screen
    const top = Math.random() * height;
    const left = Math.random() * width;

    // JARVIS color palette
    const jarvisColors = [
      "rgba(16, 165, 245, 0.8)", // Light blue
      "rgba(0, 89, 255, 0.8)", // Cyan
      "rgba(9, 23, 226, 0.8)", // Accent blue
    ];
    const colorIndex = Math.floor(Math.random() * jarvisColors.length);

    Object.assign(particle.style, {
      width: `${size}px`,
      height: `${size}px`,
      top: `${top}px`,
      left: `${left}px`,
      opacity: Math.random() * 0.7 + 0.3,
      filter: `blur(${blur}px)`,
      animationDuration: `${Math.random() * 15 + 10}s`,
      animationDelay: `${Math.random() * 5}s`,
      backgroundColor: jarvisColors[colorIndex],
    });

    particlesRef.current.appendChild(particle);
    return particle;
  };

  const createCloudyBackground = () => {
    if (!bgRef.current) return;

    // Create cloudy gradient background with JARVIS colors
    const numClouds = 8;
    const colors = [
      "rgba(16, 165, 245, 0.15)",
      "rgba(0, 229, 255, 0.12)",
      "rgba(41, 121, 255, 0.1)",
      "rgba(36, 109, 218, 0.08)",
      "rgba(0, 150, 240, 0.15)",
      "rgba(0, 200, 255, 0.12)",
      "rgba(28, 116, 233, 0.13)",
      "rgba(0, 122, 204, 0.11)",
    ];

    for (let i = 0; i < numClouds; i++) {
      const cloud = document.createElement("div");
      cloud.className = "cloud-gradient";

      // Position clouds at different points, with larger coverage
      const width = Math.random() * 70 + 40;
      const height = Math.random() * 70 + 40;
      const top = Math.random() * 100;
      const left = Math.random() * 100;

      Object.assign(cloud.style, {
        position: "absolute",
        width: `${width}vw`,
        height: `${height}vh`,
        top: `${top}vh`,
        left: `${left}vw`,
        borderRadius: "50%",
        background: `radial-gradient(circle at center, ${
          colors[i % colors.length]
        } 0%, rgba(5, 10, 25, 0) 70%)`,
        opacity: Math.random() * 0.6 + 0.4,
        filter: "blur(40px)", // Increased blur for softer effect
        transform: "translate(-50%, -50%)",
        animation: `cloud-drift ${
          Math.random() * 120 + 60
        }s infinite alternate ease-in-out`,
        zIndex: "0",
        pointerEvents: "none",
      });

      bgRef.current.appendChild(cloud);
    }

    // Add CSS for cloud animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes cloud-drift {
        0% { transform: translate(-50%, -50%) scale(1); }
        25% { transform: translate(-45%, -55%) scale(1.1); }
        50% { transform: translate(-52%, -48%) scale(0.95); }
        75% { transform: translate(-48%, -52%) scale(1.05); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  };

  return (
    <div className="homepage">
      <div className="cloudy-background" ref={bgRef}></div>
      <div className="particles-container" ref={particlesRef}></div>
      <Sidebar />
      <MainContainer />
    </div>
  );
}

export default Homepage;
