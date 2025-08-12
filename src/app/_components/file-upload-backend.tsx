"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";

interface FileUploadProps {
  cvId: string;
  onSuccess: (fileName: string, pdfText: string) => void;
  onBack: () => void;
}

export function FileUploadBackend({ cvId, onSuccess, onBack }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPdfText = api.fileUpload.extractPdfText.useMutation();
  const [pdfText, setPdfText] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert("File size must be less than 10MB");
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload file through backend API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      setUploadProgress(100);

      if (!result.success) {
        throw new Error("Upload failed");
      }

      // Extract PDF text after successful upload
      let extractedText = "";
      try {
        const textResult = await extractPdfText.mutateAsync({
          fileName: result.fileName,
        });
        
        if (textResult && typeof textResult === 'object' && 'success' in textResult) {
          if (textResult.success && 'text' in textResult) {
            extractedText = (textResult as { text: string }).text;
            setPdfText(extractedText);
            
            if (!extractedText || extractedText.trim().length === 0) {
              console.warn("PDF text extraction returned empty result - validation will handle this");
            }
          } else {
            const errorResult = textResult as { success: false; message?: string };
            console.warn("PDF text extraction failed:", errorResult.message || "Unknown error");
          }
        }
      } catch (error) {
        console.error("Failed to extract PDF text:", error);
        // Continue anyway - validation can still work without text extraction
      }
      
      onSuccess(result.fileName, extractedText);

    } catch (error) {
      console.error("Upload error:", error);
      alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file) {
        handleFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        handleFileSelect(file);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your CV PDF</h2>
      
      <div className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📄</div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isUploading ? "Uploading..." : "Drop your PDF here"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse files
              </p>
            </div>

            {!isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Choose File
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* File Requirements */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">File Requirements:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• File format: PDF only</li>
            <li>• Maximum size: 10MB</li>
            <li>• Make sure your CV contains the information you entered above</li>
            <li>• Files are uploaded securely through our backend API</li>
          </ul>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isUploading}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
