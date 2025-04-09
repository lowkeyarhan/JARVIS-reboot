import { useState, useRef, useEffect } from "react";
import "../styles/fileUpload.css";

const FileUpload = ({ onFileUpload, isActive, setIsActive }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Open file picker when component becomes active
  useEffect(() => {
    if (isActive && fileInputRef.current) {
      fileInputRef.current.click();
      // Deactivate after opening file picker to prevent multiple triggers
      setTimeout(() => {
        setIsActive(false);
      }, 100);
    }
  }, [isActive, setIsActive]);

  // Handle file selection
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) {
      return;
    }

    // File size validation (10MB max per file)
    const invalidFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(
        `Files larger than 10MB cannot be uploaded: ${invalidFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      // Continue with valid files only
      const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);
      if (validFiles.length === 0) return;

      // Create file data objects for valid files
      const fileDataArray = validFiles.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
      }));

      setSelectedFiles((prev) => [...prev, ...fileDataArray]);
    } else {
      // Create file data objects
      const fileDataArray = files.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
      }));

      setSelectedFiles((prev) => [...prev, ...fileDataArray]);
    }

    // Make sure the parent component immediately knows we have files
    if (onFileUpload) {
      onFileUpload.filesSelected = true;
    }
  };

  // Handle file removal
  const handleRemoveFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== fileId));

    // If no files left, update the parent
    if (selectedFiles.length <= 1) {
      if (onFileUpload) {
        onFileUpload.filesSelected = false;
      }
    }
  };

  // Provide a method for the parent to retrieve the current files
  const getCurrentFiles = () => {
    const files = [...selectedFiles];

    // Reset the files after they're retrieved (for send operations)
    if (files.length > 0) {
      setTimeout(() => {
        setSelectedFiles([]);
        if (onFileUpload) {
          onFileUpload.filesSelected = false;
        }
      }, 100);
    }

    return files;
  };

  // Handle cancel/clear all selected files
  const handleClearAll = () => {
    setSelectedFiles([]);
    if (onFileUpload) {
      onFileUpload.filesSelected = false;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return "fa-file-image";
    } else if (fileType.includes("pdf")) {
      return "fa-file-pdf";
    } else if (
      fileType.includes("document") ||
      fileType.includes("msword") ||
      fileType.includes("officedocument.wordprocessing")
    ) {
      return "fa-file-word";
    } else if (
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileType.includes("officedocument.spreadsheet")
    ) {
      return "fa-file-excel";
    } else if (
      fileType.includes("presentation") ||
      fileType.includes("powerpoint") ||
      fileType.includes("officedocument.presentation")
    ) {
      return "fa-file-powerpoint";
    } else if (fileType.includes("text/")) {
      return "fa-file-alt";
    } else if (fileType.includes("audio/")) {
      return "fa-file-audio";
    } else if (fileType.includes("video/")) {
      return "fa-file-video";
    } else if (
      fileType.includes("zip") ||
      fileType.includes("rar") ||
      fileType.includes("tar") ||
      fileType.includes("7z")
    ) {
      return "fa-file-archive";
    } else if (fileType.includes("csv")) {
      return "fa-file-csv";
    } else if (
      fileType.includes("code") ||
      fileType.includes("javascript") ||
      fileType.includes("html") ||
      fileType.includes("css")
    ) {
      return "fa-file-code";
    }
    return "fa-file";
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return bytes + " B";
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
  };

  // Expose the getCurrentFiles method to the parent
  useEffect(() => {
    if (onFileUpload) {
      onFileUpload.getCurrentFiles = getCurrentFiles;
      onFileUpload.filesSelected = selectedFiles.length > 0;
    }

    return () => {
      if (onFileUpload) {
        delete onFileUpload.getCurrentFiles;
        delete onFileUpload.filesSelected;
      }
    };
  }, [onFileUpload, selectedFiles]);

  return (
    <>
      <div className="file-upload-container">
        <input
          type="file"
          ref={fileInputRef}
          className="file-input-multi"
          multiple
          onChange={handleFileChange}
          onClick={(e) => {
            // Allow selecting the same file again
            e.target.value = null;
          }}
          style={{ display: "none" }}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files-container">
          {selectedFiles.map((file) => (
            <div className="selected-file" key={file.id}>
              <div className="file-icon">
                <i className={`fa-solid ${getFileIcon(file.type)}`}></i>
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {file.name.length > 20
                    ? file.name.substring(0, 17) + "..."
                    : file.name}
                </div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button
                className="remove-file-btn"
                onClick={() => handleRemoveFile(file.id)}
                title="Remove file"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          ))}

          {selectedFiles.length > 1 && (
            <button className="clear-all-btn" onClick={handleClearAll}>
              <i className="fa-solid fa-trash"></i>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default FileUpload;
