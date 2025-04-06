import "../styles/ThinkingAnimation.css";

function ThinkingAnimation() {
  return (
    <div className="thinking-animation">
      <div className="arc-reactor-container">
        <div className="arc-reactor-outer"></div>
        <div className="arc-reactor-middle"></div>
        <div className="energy-ring"></div>
        <div className="reactor-circuits">
          <div className="circuit-line"></div>
          <div className="circuit-line"></div>
          <div className="circuit-line"></div>
          <div className="circuit-line"></div>
        </div>
        <div className="arc-reactor-inner"></div>
        <div className="arc-reactor-core"></div>
        <div className="energy-beam"></div>
        <div className="energy-beam vertical"></div>
      </div>
      <div className="rotating-circles"></div>
    </div>
  );
}

export default ThinkingAnimation;
