/**
 * Convert an image file to base64 string
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} Base64 encoded image
 */
export function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Enhance images in markdown content
 * - Adds zoom functionality
 * - Improves styling
 * - Adds captions
 */
export function enhanceImages() {
  document
    .querySelectorAll(".markdown-content img:not([data-enhanced])")
    .forEach((img) => {
      // Mark as enhanced
      img.dataset.enhanced = "true";

      // Wrap in container for styling
      const container = document.createElement("div");
      container.className = "image-container";

      // Set container style
      container.style.position = "relative";
      container.style.margin = "1.5rem 0";
      container.style.textAlign = "center";
      container.style.overflow = "hidden";
      container.style.borderRadius = "8px";
      container.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      container.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.1)";
      container.style.transition = "all 0.3s ease";

      // Replace img with container
      if (img.parentNode.classList.contains("image-container")) {
        // Already enhanced, skip
        return;
      }

      img.parentNode.insertBefore(container, img);
      container.appendChild(img);

      // Style the image
      img.style.display = "block";
      img.style.width = "100%";
      img.style.maxHeight = "600px";
      img.style.objectFit = "contain";
      img.style.margin = "0";
      img.style.borderRadius = "8px";
      img.style.transition = "transform 0.3s ease";

      // Add alt text as caption if available
      if (img.alt && img.alt.trim() !== "") {
        const caption = document.createElement("div");
        caption.className = "image-caption";
        caption.textContent = img.alt;

        // Style the caption
        caption.style.padding = "0.8rem";
        caption.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        caption.style.color = "rgba(255, 255, 255, 0.9)";
        caption.style.fontSize = "0.9rem";
        caption.style.fontStyle = "italic";
        caption.style.textAlign = "center";
        caption.style.borderBottomLeftRadius = "8px";
        caption.style.borderBottomRightRadius = "8px";

        container.appendChild(caption);
      }

      // Add zoom functionality
      img.addEventListener("click", () => {
        createLightbox(img.src, img.alt);
      });
    });
}

/**
 * Create a lightbox to display an image in full size
 * @param {string} src - The image source URL
 * @param {string} alt - The image alt text (caption)
 */
export function createLightbox(src, alt) {
  // Check if lightbox already exists
  let lightbox = document.getElementById("image-lightbox");

  if (!lightbox) {
    // Create new lightbox
    lightbox = document.createElement("div");
    lightbox.id = "image-lightbox";

    // Style the lightbox
    lightbox.style.position = "fixed";
    lightbox.style.top = "0";
    lightbox.style.left = "0";
    lightbox.style.width = "100%";
    lightbox.style.height = "100%";
    lightbox.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    lightbox.style.display = "flex";
    lightbox.style.flexDirection = "column";
    lightbox.style.alignItems = "center";
    lightbox.style.justifyContent = "center";
    lightbox.style.zIndex = "9999";
    lightbox.style.opacity = "0";
    lightbox.style.transition = "opacity 0.3s ease";

    document.body.appendChild(lightbox);

    // Close lightbox on background click
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) {
        lightbox.style.opacity = "0";
        setTimeout(() => {
          if (document.body.contains(lightbox)) {
            document.body.removeChild(lightbox);
          }
        }, 300);
      }
    });

    // Prevent closing when clicking on the image
    const imgContainer = document.createElement("div");
    imgContainer.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    lightbox.appendChild(imgContainer);

    // Add keyboard control (ESC to close)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.contains(lightbox)) {
        lightbox.style.opacity = "0";
        setTimeout(() => {
          if (document.body.contains(lightbox)) {
            document.body.removeChild(lightbox);
          }
        }, 300);
      }
    });
  }

  // Clear previous content
  lightbox.innerHTML = "";

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "lightbox-close";
  closeBtn.innerHTML = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "20px";
  closeBtn.style.right = "20px";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "white";
  closeBtn.style.fontSize = "36px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = "10000";
  closeBtn.style.width = "44px";
  closeBtn.style.height = "44px";
  closeBtn.style.display = "flex";
  closeBtn.style.alignItems = "center";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.borderRadius = "50%";
  closeBtn.style.transition = "background-color 0.2s ease";

  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  });

  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.backgroundColor = "transparent";
  });

  closeBtn.addEventListener("click", () => {
    lightbox.style.opacity = "0";
    setTimeout(() => {
      if (document.body.contains(lightbox)) {
        document.body.removeChild(lightbox);
      }
    }, 300);
  });

  lightbox.appendChild(closeBtn);

  // Add image
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt || "";
  img.style.maxWidth = "90%";
  img.style.maxHeight = "80%";
  img.style.objectFit = "contain";
  img.style.borderRadius = "4px";
  img.style.boxShadow = "0 5px 20px rgba(0, 0, 0, 0.3)";

  lightbox.appendChild(img);

  // Add caption if available
  if (alt && alt.trim() !== "") {
    const caption = document.createElement("div");
    caption.textContent = alt;
    caption.style.color = "white";
    caption.style.marginTop = "20px";
    caption.style.fontSize = "16px";
    caption.style.maxWidth = "80%";
    caption.style.textAlign = "center";

    lightbox.appendChild(caption);
  }

  // Show lightbox
  setTimeout(() => {
    lightbox.style.opacity = "1";
  }, 10);
}
