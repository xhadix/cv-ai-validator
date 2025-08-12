"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

import { CVForm } from "./cv-form";
import { FileUploadBackend } from "./file-upload-backend";
import { ValidationResults } from "./validation-results";
import { CVList } from "./cv-list";

export function CVValidator() {
  const [currentStep, setCurrentStep] = useState<"form" | "upload" | "results">("form");
  const [submittedCV, setSubmittedCV] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string>("");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep === "form" ? "text-blue-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === "form" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">CV Data</span>
          </div>
          
          <div className={`w-16 h-0.5 ${currentStep === "upload" || currentStep === "results" ? "bg-blue-600" : "bg-gray-300"}`} />
          
          <div className={`flex items-center ${currentStep === "upload" ? "text-blue-600" : currentStep === "results" ? "text-green-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === "upload" ? "border-blue-600 bg-blue-600 text-white" : 
              currentStep === "results" ? "border-green-600 bg-green-600 text-white" : 
              "border-gray-300"
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Upload PDF</span>
          </div>
          
          <div className={`w-16 h-0.5 ${currentStep === "results" ? "bg-green-600" : "bg-gray-300"}`} />
          
          <div className={`flex items-center ${currentStep === "results" ? "text-green-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === "results" ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Validation</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {currentStep === "form" && (
          <CVForm 
            onSuccess={(cv) => {
              setSubmittedCV(cv);
              setCurrentStep("upload");
            }}
          />
        )}

        {currentStep === "upload" && submittedCV && (
          <FileUploadBackend 
            cvId={submittedCV.id}
            onSuccess={(fileName: string, pdfText: string) => {
              setUploadedFile(fileName);
              setExtractedPdfText(pdfText);
              setCurrentStep("results");
            }}
            onBack={() => setCurrentStep("form")}
          />
        )}

        {currentStep === "results" && submittedCV && uploadedFile && (
          <ValidationResults 
            cvId={submittedCV.id}
            fileName={uploadedFile}
            pdfText={extractedPdfText}
            onBack={() => setCurrentStep("upload")}
            onNewValidation={() => setCurrentStep("form")}
          />
        )}
      </div>

      {/* CV History */}
      <div className="mt-8">
        <CVList />
      </div>
    </div>
  );
}
