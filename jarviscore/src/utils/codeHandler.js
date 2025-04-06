/**
 * Enhance code blocks with VS Code-like features
 * - Adds line numbers
 * - Improves copy functionality
 * - Adds language labels
 */
export function enhanceCodeBlocks() {
  document
    .querySelectorAll("pre code:not([data-enhanced])")
    .forEach((codeBlock) => {
      const pre = codeBlock.parentElement;

      // Check if already wrapped in a code-block div
      let codeBlockContainer;
      if (pre.parentElement.classList.contains("code-block")) {
        codeBlockContainer = pre.parentElement;
      } else {
        // Create code block container
        codeBlockContainer = document.createElement("div");
        codeBlockContainer.className = "code-block";
        pre.parentNode.insertBefore(codeBlockContainer, pre);
        codeBlockContainer.appendChild(pre);
      }

      // Detect language
      const languageClass = codeBlock.className.match(/language-(\w+)/);
      const language = languageClass ? languageClass[1] : "plaintext";

      // Style the container
      codeBlockContainer.classList.add(`language-${language}`);

      // Add language label if not exists
      if (!codeBlockContainer.querySelector(".language-label")) {
        const languageLabel = document.createElement("span");
        languageLabel.className = "language-label";
        languageLabel.textContent = language || "plaintext";
        codeBlockContainer.appendChild(languageLabel);
      }

      // Add copy button if not exists
      if (!codeBlockContainer.querySelector(".copy-btn")) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-btn";
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.addEventListener("click", () => {
          copyCodeToClipboard(codeBlock.textContent, codeBlockContainer);
        });
        codeBlockContainer.appendChild(copyBtn);
      }

      // Add line numbers
      if (!codeBlockContainer.classList.contains("with-line-numbers")) {
        codeBlockContainer.classList.add("with-line-numbers");

        // Format code with line numbers
        const codeLines = codeBlock.textContent.split("\n");
        const lineCount = codeLines.length;

        // Only add line numbers if more than 1 line
        if (lineCount > 1) {
          const lineNumbers = document.createElement("div");
          lineNumbers.className = "line-numbers";

          for (let i = 1; i <= lineCount; i++) {
            const lineNumber = document.createElement("span");
            lineNumber.className = "line-number";
            lineNumber.textContent = i;
            lineNumbers.appendChild(lineNumber);
          }

          // Add line numbers before the pre element
          pre.style.marginLeft = "3rem"; // Make space for line numbers
          codeBlockContainer.insertBefore(lineNumbers, pre);

          // Add CSS to the line numbers - J.A.R.V.I.S. theme styling
          lineNumbers.style.position = "absolute";
          lineNumbers.style.left = "0";
          lineNumbers.style.top = "36px"; // Match the header height
          lineNumbers.style.width = "2.5rem";
          lineNumbers.style.textAlign = "right";
          lineNumbers.style.paddingRight = "0.5rem";
          lineNumbers.style.paddingTop = "10px";
          lineNumbers.style.borderRight = "1px solid rgba(0, 85, 255, 0.3)";
          lineNumbers.style.color = "#858585";
          lineNumbers.style.fontFamily =
            '"Fira Code", "Roboto Mono", monospace';
          lineNumbers.style.fontSize = "0.85rem";
          lineNumbers.style.userSelect = "none";
          lineNumbers.style.overflow = "hidden";
          lineNumbers.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
          lineNumbers.style.height = "calc(100% - 36px)";

          // Style the line numbers
          const lineNumberElements =
            lineNumbers.querySelectorAll(".line-number");
          lineNumberElements.forEach((el) => {
            el.style.display = "block";
            el.style.height = "1.5rem";
            el.style.lineHeight = "1.5rem";
            el.style.color = "rgba(133, 133, 133, 0.8)";

            // Add hover effect for line numbers
            el.addEventListener("mouseenter", () => {
              el.style.color = "rgba(0, 85, 255, 0.8)";
            });

            el.addEventListener("mouseleave", () => {
              el.style.color = "rgba(133, 133, 133, 0.8)";
            });
          });
        }
      }

      // VS Code-like copy on click behavior
      pre.addEventListener("click", (event) => {
        if (event.target === pre || event.target === codeBlock) {
          const rect = pre.getBoundingClientRect();
          // Only copy if clicked in the top right area (near the copy button)
          const clickX = event.clientX - rect.left;
          const clickY = event.clientY - rect.top;

          if (clickY < 40 && rect.width - clickX < 100) {
            copyCodeToClipboard(
              codeBlock.textContent,
              codeBlockContainer,
              false
            );
          }
        }
      });

      // Mark as enhanced
      codeBlock.dataset.enhanced = "true";

      // Apply highlightjs if available
      if (window.hljs && !codeBlock.classList.contains("hljs")) {
        window.hljs.highlightBlock(codeBlock);
      }
    });
}

/**
 * Copy code to clipboard and show feedback
 * @param {string} text - The text to copy
 * @param {HTMLElement} codeBlockContainer - The code block container element
 * @param {boolean} showPopup - Whether to show the popup feedback (default: true)
 */
export function copyCodeToClipboard(
  text,
  codeBlockContainer,
  showPopup = true
) {
  // Trim trailing newlines and whitespace
  const trimmedText = text.trim();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(trimmedText)
      .then(() => {
        if (showPopup) {
          showCopyFeedback(codeBlockContainer);
        }
      })
      .catch((err) => {
        console.error("Clipboard API error:", err);
        fallbackCopyText(trimmedText, codeBlockContainer, showPopup);
      });
  } else {
    fallbackCopyText(trimmedText, codeBlockContainer, showPopup);
  }
}

/**
 * Show feedback when code is copied
 * @param {HTMLElement} codeBlockContainer - The code block container element
 */
export function showCopyFeedback(codeBlockContainer) {
  // Update the copy button text
  const copyBtn = codeBlockContainer.querySelector(".copy-btn");
  if (copyBtn) {
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    copyBtn.style.backgroundColor = "rgba(0, 150, 0, 0.3)";
    copyBtn.style.borderColor = "rgba(0, 150, 0, 0.5)";
    copyBtn.style.boxShadow = "0 0 10px rgba(0, 150, 0, 0.4)";

    // Add J.A.R.V.I.S.-style pulse animation
    const pulseEffect = document.createElement("div");
    pulseEffect.className = "jarvis-pulse";
    pulseEffect.style.position = "absolute";
    pulseEffect.style.top = "0";
    pulseEffect.style.left = "0";
    pulseEffect.style.width = "100%";
    pulseEffect.style.height = "100%";
    pulseEffect.style.borderRadius = "4px";
    pulseEffect.style.backgroundColor = "rgba(0, 150, 0, 0.3)";
    pulseEffect.style.animation = "jarvis-pulse 1s ease-out";
    pulseEffect.style.zIndex = "-1";
    copyBtn.style.position = "relative";
    copyBtn.appendChild(pulseEffect);

    // Create and inject the pulse animation style if not exists
    if (!document.getElementById("jarvis-animations")) {
      const styleEl = document.createElement("style");
      styleEl.id = "jarvis-animations";
      styleEl.textContent = `
        @keyframes jarvis-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Revert to original state after 2 seconds
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
      copyBtn.style.backgroundColor = "";
      copyBtn.style.borderColor = "";
      copyBtn.style.boxShadow = "";

      // Remove pulse effect
      if (copyBtn.contains(pulseEffect)) {
        copyBtn.removeChild(pulseEffect);
      }
    }, 2000);
  } else {
    // Fallback to the old feedback if no button exists
    const feedback = document.createElement("div");
    feedback.className = "copy-feedback";
    feedback.textContent = "Copied!";

    codeBlockContainer.style.position = "relative";
    codeBlockContainer.appendChild(feedback);

    setTimeout(() => {
      if (codeBlockContainer.contains(feedback)) {
        codeBlockContainer.removeChild(feedback);
      }
    }, 1500);
  }
}

/**
 * Fallback for copying text to clipboard when Clipboard API is not available
 * @param {string} text - The text to copy
 * @param {HTMLElement} codeBlockContainer - The code block container element
 * @param {boolean} showPopup - Whether to show the popup feedback
 */
export function fallbackCopyText(text, codeBlockContainer, showPopup = true) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful && showPopup) {
      showCopyFeedback(codeBlockContainer);
    } else if (!successful) {
      console.error("Fallback: Copy command was unsuccessful");
    }
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
