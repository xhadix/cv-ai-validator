"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface ValidationResultsProps {
  cvId: string;
  fileName: string;
  onBack: () => void;
  onNewValidation: () => void;
}

export function ValidationResults({ cvId, fileName, onBack, onNewValidation }: ValidationResultsProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCV = api.cv.validate.useMutation({
    onSuccess: (result) => {
      setValidationResult(result.validationResult);
      setIsValidating(false);
    },
    onError: (error) => {
      setError(error.message);
      setIsValidating(false);
    },
  });

  useEffect(() => {
    // Start validation when component mounts
    validateCV.mutate({
      cvId,
      pdfText: "", // Mock validation for now
    });
  }, [cvId]);

  const getFieldDisplayName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      fullName: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      skills: "Skills",
      experience: "Experience",
    };
    return fieldMap[field] || field;
  };

  if (isValidating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating Your CV</h2>
        <p className="text-gray-600">Comparing your form data with the PDF content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Validation Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              setIsValidating(true);
              setError(null);
              validateCV.mutate({ cvId, pdfText: "" });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isValid = validationResult?.isValid;
  const mismatches = validationResult?.mismatches || [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation Results</h2>
      
      <div className="space-y-6">
        {/* Result Summary */}
        <div className={`rounded-lg p-6 ${
          isValid 
            ? "bg-green-50 border border-green-200" 
            : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center">
            <div className={`text-4xl mr-4 ${isValid ? "text-green-500" : "text-red-500"}`}>
              {isValid ? "✅" : "❌"}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isValid ? "text-green-800" : "text-red-800"
              }`}>
                {isValid ? "Validation Successful" : "Validation Failed"}
              </h3>
              <p className={`text-sm ${
                isValid ? "text-green-600" : "text-red-600"
              }`}>
                {validationResult?.message}
              </p>
            </div>
          </div>
        </div>

        {/* File Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Uploaded File:</h3>
          <p className="text-sm text-gray-600">{fileName}</p>
        </div>

        {/* Mismatches Details */}
        {!isValid && mismatches.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-4">
              Fields with Mismatches:
            </h3>
            <div className="space-y-3">
              {mismatches.map((field: string, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="text-red-500 mr-3">⚠️</div>
                  <span className="text-red-700 font-medium">
                    {getFieldDisplayName(field)}
                  </span>
                  <span className="text-red-600 ml-2">
                    - Content doesn't match the PDF
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-red-100 rounded-md">
              <p className="text-sm text-red-700">
                <strong>Tip:</strong> Make sure the information in your PDF matches exactly what you entered in the form above.
              </p>
            </div>
          </div>
        )}

        {/* Success Details */}
        {isValid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              All Fields Match! 🎉
            </h3>
            <p className="text-green-700">
              Your CV information perfectly matches the content in your PDF file. 
              This indicates consistency between your form data and your actual CV document.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          
          <div className="space-x-4">
            <button
              onClick={() => {
                setIsValidating(true);
                setError(null);
                validateCV.mutate({ cvId, pdfText: "" });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Re-validate
            </button>
            
            <button
              onClick={onNewValidation}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              New Validation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
