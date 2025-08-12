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
  cvData: {
    fullName: string;
    email: string;
    phone: string;
    skills: string;
    experience: string;
  },
  pdfText: string
): Promise<ValidationResult> {
  const prompt = `
You are an expert CV validator. Your task is to compare the information provided in a CV form with the actual content of the uploaded PDF document.

CV Form Data:
- Full Name: ${cvData.fullName}
- Email: ${cvData.email}
- Phone: ${cvData.phone}
- Skills: ${cvData.skills}
- Experience: ${cvData.experience}

PDF Content:
${pdfText}

Analyze the PDF content and compare it with the form data. Check for:
1. Name consistency (including variations, abbreviations, or different formats)
2. Email address presence and accuracy
3. Phone number presence and accuracy
4. Skills mentioned in the PDF vs form
5. Experience details consistency

Return your analysis as a JSON object with the following structure:
{
  "isValid": boolean,
  "mismatches": ["field1", "field2"],
  "message": "Detailed explanation of validation results",
  "confidence": 0.0-1.0,
  "details": [
    {
      "field": "field_name",
      "status": "match|mismatch|partial",
      "explanation": "Detailed explanation"
    }
  ]
}

Be thorough in your analysis and provide detailed explanations for any mismatches found.
`;

  // Retry logic for CV validation
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000, // Increased token limit for more detailed analysis
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
      console.error(`Claude API error (attempt ${4 - retries}):`, error);
      retries--;
      
      if (retries > 0) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // All retries failed, return fallback
        return {
          isValid: false,
          mismatches: ['api_error'],
          message: 'AI validation failed. Please try again or contact support.',
          confidence: 0.0,
          details: [],
        };
      }
    }
  }
  
  // This should never be reached, but just in case
  return {
    isValid: false,
    mismatches: ['api_error'],
    message: 'AI validation failed. Please try again or contact support.',
    confidence: 0.0,
    details: [],
  };
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log(`Starting PDF text extraction for buffer of size: ${pdfBuffer.length} bytes`);
    
    // Try to use pdf-parse with proper error handling
    let pdfText = '';
    
    // Try pdf-parse first, but handle any import issues gracefully
    try {
      // Dynamic import to avoid test file issues
      const pdfModule = await import('pdf-parse');
      const pdf = pdfModule.default || pdfModule;
      const data = await pdf(pdfBuffer);
      pdfText = data.text || '';
      console.log(`pdf-parse extracted ${pdfText.length} characters`);
    } catch (pdfError) {
      console.log('pdf-parse failed, trying pdfjs-dist:', pdfError instanceof Error ? pdfError.message : String(pdfError));
      
      // Try pdfjs-dist as fallback
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        // Set up the worker (use a simple approach)
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
        
        // Convert Buffer to Uint8Array as required by pdfjs-dist
        const uint8Array = new Uint8Array(pdfBuffer);
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDocument = await loadingTask.promise;
        
        console.log(`PDF has ${pdfDocument.numPages} pages`);
        
        // Extract text from all pages
        const textParts: string[] = [];
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          textParts.push(pageText);
        }
        
        pdfText = textParts.join('\n');
        console.log(`pdfjs-dist extracted ${pdfText.length} characters`);
        
      } catch (pdfjsError) {
        console.log('pdfjs-dist also failed, will try Claude extraction:', pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError));
      }
    }
    
    // If both pdf-parse and pdfjs-dist failed or returned empty text, use Claude with full PDF
    if (!pdfText || pdfText.trim().length < 10) {
      console.log('Using Claude for PDF text extraction');
      
      // Convert the entire PDF buffer to base64 for Claude
      const pdfBase64 = pdfBuffer.toString('base64');
      console.log(`PDF base64 length: ${pdfBase64.length} characters`);
      
      const prompt = `
You are a PDF text extraction expert. I will provide you with a PDF file encoded in base64.
Please extract and clean the text content, removing any formatting artifacts, and return only the readable text.

PDF Content (base64 encoded):
${pdfBase64}

Please return only the extracted text content, nothing else. If no readable text is found, return "NO_TEXT_FOUND".
`;

      // Retry logic for Claude extraction
      let retries = 3;
      while (retries > 0) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000, // Increased token limit for better extraction
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
            console.log(`Claude extracted ${pdfText.length} characters`);
            break; // Success, exit retry loop
          }
        } catch (claudeError) {
          console.log(`Claude extraction attempt ${4 - retries} failed:`, claudeError instanceof Error ? claudeError.message : String(claudeError));
          retries--;
          if (retries > 0) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }
    
    // Final validation
    if (!pdfText || pdfText.trim().length < 10 || pdfText === 'NO_TEXT_FOUND') {
      console.log('No readable text found in PDF - returning empty string');
      console.log(`Final pdfText length: ${pdfText.length}, content: "${pdfText.substring(0, 100)}..."`);
      return '';
    }
    
    console.log(`Successfully extracted ${pdfText.length} characters from PDF`);
    return pdfText;
    
  } catch (error) {
    console.error('PDF text extraction failed:', error instanceof Error ? error.message : String(error));
    return '';
  }
}
