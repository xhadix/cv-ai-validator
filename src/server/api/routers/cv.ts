import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { validateCVWithClaude } from "~/server/services/anthropic";

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

  // Validate CV using Anthropic Claude
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

        if (!input.pdfText || !input.pdfText.trim()) {
          throw new Error("PDF text is required for validation");
        }

        // Use Anthropic Claude for AI validation
        const aiValidation = await validateCVWithClaude(
          {
            fullName: cv.fullName,
            email: cv.email,
            phone: cv.phone,
            skills: cv.skills,
            experience: cv.experience,
          },
          input.pdfText
        );
        
        const validationResult = await ctx.db.validationResult.create({
          data: {
            cvId: input.cvId,
            isValid: aiValidation.isValid,
            mismatches: aiValidation.mismatches,
            message: aiValidation.message,
          },
        });

        return {
          success: true,
          validationResult,
          message: validationResult.message,
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


