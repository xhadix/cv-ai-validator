"use client";

import { api } from "~/trpc/react";

export function CVList() {
  const { data: cvs, isLoading, error } = api.cv.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation History</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading validation history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation History</h2>
        <div className="text-center py-8">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <p className="text-gray-600">Failed to load validation history</p>
        </div>
      </div>
    );
  }

  if (!cvs || cvs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation History</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <p className="text-gray-600">No validation history yet</p>
          <p className="text-sm text-gray-500 mt-1">Submit your first CV to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation History</h2>
      
      <div className="space-y-4">
        {cvs.map((cv) => (
          <div key={cv.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{cv.fullName}</h3>
                  <span className="text-sm text-gray-500">{cv.email}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Phone:</span> {cv.phone}
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span>{" "}
                    {new Date(cv.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <div className="font-medium mb-1">Skills:</div>
                  <p className="line-clamp-2">{cv.skills}</p>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <div className="font-medium mb-1">Experience:</div>
                  <p className="line-clamp-3">{cv.experience}</p>
                </div>

                {cv.pdfUrl && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">PDF:</span> {cv.pdfUrl}
                  </div>
                )}
              </div>

              {/* Validation Status */}
              <div className="ml-4">
                {cv.validationResults && cv.validationResults.length > 0 ? (
                  <div className="text-right">
                    {cv.validationResults.map((validation, index) => (
                      <div key={validation.id} className="mb-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          validation.isValid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {validation.isValid ? "✅ Valid" : "❌ Invalid"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(validation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ⏳ Pending
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Details */}
            {cv.validationResults && cv.validationResults.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {cv.validationResults.map((validation) => (
                  <div key={validation.id} className="text-sm">
                    <div className="font-medium text-gray-900 mb-1">
                      Latest Validation: {validation.message}
                    </div>
                    {!validation.isValid && validation.mismatches && validation.mismatches.length > 0 && (
                      <div className="text-red-600">
                        <span className="font-medium">Mismatches:</span>{" "}
                        {validation.mismatches.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
