/**
 * Code Formatter Utility
 *
 * This utility handles the proper formatting of code blocks and inline code
 * to ensure that objects are properly displayed rather than showing [object Object]
 */

/**
 * Extracts the language from code objects
 * @param {any} content - The code content object
 * @param {string} defaultLanguage - Default language to use if none found
 * @returns {string} - The language for syntax highlighting
 */
export function extractLanguage(content, defaultLanguage = "plaintext") {
  // If it's not an object or null, return default
  if (typeof content !== "object" || content === null) {
    return defaultLanguage;
  }
  if (content.lang !== undefined) {
    return content.lang;
  }
  if (content.language !== undefined) {
    return content.language;
  }
  if (typeof content === "object") {
    if (content.type === "code" && content.lang) {
      return content.lang;
    }

    if (
      (content.raw && content.raw.includes("java")) ||
      (content.text && content.text.includes("java"))
    ) {
      return "java";
    }
  }

  return defaultLanguage;
}

/**
 * Extracts the actual code content from code objects
 * @param {any} content - The code content which might be an object with metadata
 * @returns {string} - The actual code content to display
 */
export function extractCodeContent(content) {
  // If it's not an object or null, return as is
  if (typeof content !== "object" || content === null) {
    return content;
  }
  if (content.text !== undefined) {
    return content.text;
  }
  if (content.raw !== undefined) {
    return content.raw;
  }
  return JSON.stringify(content, null, 2);
}

/**
 * Formats code content to ensure it's displayed properly
 * @param {any} content - The content to format (string, object, etc.)
 * @returns {string} - Properly formatted string representation
 */
export function formatCode(content) {
  // Handle null or undefined
  if (content === null || content === undefined) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }

  const extractedContent = extractCodeContent(content);
  if (typeof extractedContent === "string") {
    return extractedContent;
  }
  if (typeof content === "object") {
    try {
      return JSON.stringify(content, null, 2);
    } catch (error) {
      console.error("Error formatting object as JSON:", error);
      return String(content);
    }
  }

  // For all other types (numbers, booleans, etc.), convert to string
  return String(content);
}

/**
 * Formats JSON with syntax highlighting HTML
 * @param {object} jsonObj - The JSON object to format
 * @returns {string} - HTML with syntax highlighting classes
 */
export function formatJsonWithHighlighting(jsonObj) {
  if (typeof jsonObj !== "object" || jsonObj === null) {
    return escapeHtml(String(jsonObj));
  }

  try {
    const json = JSON.stringify(jsonObj, null, 2);
    // Apply syntax highlighting classes
    return json
      .replace(
        /^( *)("([^"]+)"): (.*)$/gm,
        '$1<span class="json-key">$2</span>: $4'
      )
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: ([0-9]+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
      .replace(/\n/g, "<br>")
      .replace(/  /g, "&nbsp;&nbsp;");
  } catch (error) {
    console.error("Error formatting JSON with highlighting:", error);
    return escapeHtml(JSON.stringify(jsonObj, null, 2));
  }
}

/**
 * Formats language for syntax highlighting
 * @param {string} language - The language identifier
 * @returns {string} - Normalized language identifier
 */
export function normalizeLanguage(language) {
  if (!language) return "plaintext";

  // Map common language variations
  const languageMap = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    sh: "shell",
    bash: "shell",
    "c++": "cpp",
    md: "markdown",
    json5: "json",
    yml: "yaml",
  };

  return languageMap[language.toLowerCase()] || language.toLowerCase();
}

/**
 * Safely escapes HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - HTML-escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) {
    return "";
  }

  // Ensure we're working with a string
  str = String(str);

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
