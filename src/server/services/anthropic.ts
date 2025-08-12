import Anthropic from '@anthropic-ai/sdk';
import { env } from '~/env';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface CVData {
  fullName: string;
  email: string;
  phone: string;
  skills: string;
  experience: string;
}

export interface ValidationResult {
  isValid: boolean;
  mismatches: string[];
  message: string;
  confidence: number;
  details: {
    field: string;
    formValue: string;
    pdfValue?: string;
    match: boolean;
    reason?: string;
  }[];
}

export async function validateCVWithClaude(
  cvData: CVData,
  pdfText: string
): Promise<ValidationResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const prompt = `
You are an expert CV validator. Your task is to compare the information provided in a form with the content of a PDF CV document.

FORM DATA:
- Full Name: ${cvData.fullName}
- Email: ${cvData.email}
- Phone: ${cvData.phone}
- Skills: ${cvData.skills}
- Experience: ${cvData.experience}

PDF CONTENT:
${pdfText}

INSTRUCTIONS:
1. Compare each field from the form with the PDF content
2. Check for exact matches, partial matches, or missing information
3. Be flexible with formatting differences (spaces, punctuation, etc.)
4. For skills, check if the skills mentioned in the form appear in the PDF
5. For experience, check if the experience description matches or is consistent with the PDF

Please respond with a JSON object in this exact format:
{
  "isValid": boolean,
  "mismatches": ["field1", "field2"],
  "message": "Human readable summary",
  "confidence": 0.95,
  "details": [
    {
      "field": "fullName",
      "formValue": "John Doe",
      "pdfValue": "John Doe",
      "match": true,
      "reason": "Exact match"
    }
  ]
}

Fields to check: fullName, email, phone, skills, experience
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const result = JSON.parse(jsonMatch[0]) as ValidationResult;
    
    // Validate the response structure
    if (typeof result.isValid !== 'boolean') {
      throw new Error('Invalid response: isValid must be boolean');
    }

    return {
      isValid: result.isValid,
      mismatches: result.mismatches || [],
      message: result.message || 'Validation completed',
      confidence: result.confidence || 0.8,
      details: result.details || [],
    };
  } catch (error) {
    console.error('Claude API error:', error);
    
    // Fallback to basic validation if API fails
    return {
      isValid: false,
      mismatches: ['api_error'],
      message: 'AI validation failed. Please try again or contact support.',
      confidence: 0.0,
      details: [],
    };
  }
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Try to use pdf-parse with proper error handling
    let pdfText = '';
    
    try {
      // Dynamic import to avoid test file issues
      const pdfModule = await import('pdf-parse');
      const pdf = pdfModule.default || pdfModule;
      const data = await pdf(pdfBuffer);
      pdfText = data.text || '';
    } catch (pdfError) {
      console.log('pdf-parse failed, trying alternative extraction:', pdfError);
    }
    
    // If pdf-parse failed or returned empty text, try a simpler approach
    if (!pdfText || pdfText.trim().length < 10) {
      console.log('Using alternative PDF text extraction');
      
      // Try to extract text from the PDF buffer directly
      const bufferString = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 50000));
      
      // Look for text patterns in the PDF content
      const textMatches = bufferString.match(/\([^)]{3,}\)/g);
      if (textMatches && textMatches.length > 0) {
        pdfText = textMatches
          .map(match => match.slice(1, -1)) // Remove parentheses
          .filter(text => text.length > 2 && /[a-zA-Z]/.test(text)) // Filter meaningful text
          .join(' ');
      }
      
      // If still no text, try Claude with a smaller chunk
      if (!pdfText || pdfText.trim().length < 10) {
        try {
          // Use a smaller chunk to avoid rate limits
          const chunkSize = Math.min(pdfBuffer.length, 10000);
          const pdfChunk = pdfBuffer.toString('base64', 0, chunkSize);
          
          const prompt = `
You are a PDF text extraction expert. I will provide you with a portion of a PDF file encoded in base64.
Please extract and clean the text content, removing any formatting artifacts, and return only the readable text.

PDF Content (base64 encoded, first ${chunkSize} bytes):
${pdfChunk}

Please return only the extracted text content, nothing else. If no readable text is found, return "NO_TEXT_FOUND".
`;

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000, // for cost issues
            temperature: 0.1,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          });

          const content = response.content[0];
          if (content && content.type === 'text') {
            pdfText = content.text.trim();
          }
        } catch (claudeError) {
          console.log('Claude extraction failed due to rate limits:', claudeError);
        }
      }
    }
    
    // Final validation
    if (!pdfText || pdfText.trim().length < 10 || pdfText === 'NO_TEXT_FOUND') {
      console.log('No readable text found in PDF');
      return '';
    }
    
    console.log(`Extracted ${pdfText.length} characters from PDF`);
    return pdfText;
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    return '';
  }
}
