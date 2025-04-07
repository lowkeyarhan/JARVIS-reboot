import { useState, useRef, useEffect } from "react";
import "../styles/imageUpload.css";
import { convertImageToBase64 } from "../utils/imageHandler.js";

const ImageUpload = ({ onImageUpload, isActive, setIsActive }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // File size validation (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    try {
      // Convert to base64 but don't send yet
      const dataUrl = await convertImageToBase64(file);

      // Store the image data for later use
      const imageData = {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: dataUrl,
      };

      setSelectedImage(imageData);

      // Make sure the parent component immediately knows we have an image
      if (onImageUpload) {
        onImageUpload.imageSelected = true;
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image");
      handleCancel();
    }
  };

  // Provide a method for the parent to retrieve the current image
  const getCurrentImage = () => {
    const image = selectedImage;

    // Reset the image after it's retrieved (for send operations)
    if (image) {
      setTimeout(() => {
        setSelectedImage(null);
        if (onImageUpload) {
          onImageUpload.imageSelected = false;
        }
      }, 100);
    }

    return image;
  };

  // Expose the getCurrentImage method to the parent
  useEffect(() => {
    if (onImageUpload) {
      onImageUpload.getCurrentImage = getCurrentImage;
      onImageUpload.imageSelected = !!selectedImage;
    }

    return () => {
      if (onImageUpload) {
        delete onImageUpload.getCurrentImage;
        delete onImageUpload.imageSelected;
      }
    };
  }, [onImageUpload, selectedImage]);

  // Handle cancel/clear selected image
  const handleCancel = () => {
    setSelectedImage(null);
    setIsUploading(false);
    setIsActive(false);

    // Notify parent that image was removed
    if (onImageUpload) {
      onImageUpload.imageSelected = false;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="image-upload-container">
      <input
        type="file"
        ref={fileInputRef}
        className="file-input"
        accept="image/*"
        onChange={handleFileChange}
        onClick={(e) => {
          // Allow selecting the same file again
          e.target.value = null;
        }}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default ImageUpload;
