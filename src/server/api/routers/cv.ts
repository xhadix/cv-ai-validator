import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Input validation schemas
const cvInputSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  skills: z.string().min(1, "Skills are required"),
  experience: z.string().min(1, "Experience is required"),
  pdfUrl: z.string().optional(),
});

const validationResultSchema = z.object({
  isValid: z.boolean(),
  mismatches: z.array(z.string()),
  message: z.string(),
});

export const cvRouter = createTRPCRouter({
  // Submit CV data
  submit: publicProcedure
    .input(cvInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const cv = await ctx.db.cV.create({
          data: {
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            skills: input.skills,
            experience: input.experience,
            pdfUrl: input.pdfUrl,
          },
        });

        return {
          success: true,
          cv,
          message: "CV submitted successfully",
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to submit CV: ${error.message}`);
        }
        throw new Error("Failed to submit CV");
      }
    }),

  // Get CV by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cv = await ctx.db.cV.findUnique({
        where: { id: input.id },
        include: {
          validationResults: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!cv) {
        throw new Error("CV not found");
      }

      return cv;
    }),

  // Get all CVs
  getAll: publicProcedure.query(async ({ ctx }) => {
    const cvs = await ctx.db.cV.findMany({
      include: {
        validationResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return cvs;
  }),

  // Validate CV (mock implementation for now)
  validate: publicProcedure
    .input(z.object({
      cvId: z.string(),
      pdfText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get CV data
        const cv = await ctx.db.cV.findUnique({
          where: { id: input.cvId },
        });

        if (!cv) {
          throw new Error("CV not found");
        }

        // Mock validation logic (will be replaced with real AI later)
        const mockValidation = await performMockValidation(cv, input.pdfText);

        // Save validation result
        const validationResult = await ctx.db.validationResult.create({
          data: {
            cvId: input.cvId,
            isValid: mockValidation.isValid,
            mismatches: mockValidation.mismatches,
            message: mockValidation.message,
          },
        });

        return {
          success: true,
          validationResult,
          message: mockValidation.message,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Validation failed: ${error.message}`);
        }
        throw new Error("Validation failed");
      }
    }),

  // Get validation history for a CV
  getValidationHistory: publicProcedure
    .input(z.object({ cvId: z.string() }))
    .query(async ({ ctx, input }) => {
      const validationResults = await ctx.db.validationResult.findMany({
        where: { cvId: input.cvId },
        orderBy: { createdAt: "desc" },
      });

      return validationResults;
    }),
});

// Mock validation function (will be replaced with real AI)
async function performMockValidation(cv: any, pdfText?: string) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock validation logic
  const mismatches: string[] = [];
  
  // Simulate some validation checks
  if (pdfText) {
    // Check if name appears in PDF
    if (!pdfText.toLowerCase().includes(cv.fullName.toLowerCase())) {
      mismatches.push("fullName");
    }
    
    // Check if email appears in PDF
    if (!pdfText.toLowerCase().includes(cv.email.toLowerCase())) {
      mismatches.push("email");
    }
    
    // Check if skills are mentioned
    const skills = cv.skills.toLowerCase().split(',').map((s: string) => s.trim());
    const missingSkills = skills.filter((skill: string) => !pdfText.toLowerCase().includes(skill));
    if (missingSkills.length > 0) {
      mismatches.push("skills");
    }
  } else {
    // If no PDF text, simulate random validation
    const random = Math.random();
    if (random < 0.3) {
      mismatches.push("fullName");
    }
    if (random < 0.2) {
      mismatches.push("email");
    }
    if (random < 0.4) {
      mismatches.push("skills");
    }
  }

  const isValid = mismatches.length === 0;
  const message = isValid 
    ? "All fields match the PDF content" 
    : `Validation failed. Mismatches found in: ${mismatches.join(', ')}`;

  return {
    isValid,
    mismatches,
    message,
  };
}
