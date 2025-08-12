import { CVValidator } from "~/app/_components/cv-validator";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  // Only prefetch CV data in development or when not building
  if (process.env.NODE_ENV === 'development') {
    void api.cv.getAll.prefetch();
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              CV AI Validator
            </h1>
            <p className="text-lg text-gray-600">
              Upload your CV and validate it against your form data using AI
            </p>
          </div>
          
          <CVValidator />
        </div>
      </main>
    </HydrateClient>
  );
}
