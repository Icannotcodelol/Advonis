import { PDFParser } from './pdf-parser';
import { WordParser } from './word-parser';
import type { ContractDocument } from '@/types/contract';

export class DocumentParser {
  private static instance: DocumentParser;
  private pdfParser: PDFParser;
  private wordParser: WordParser;

  private constructor() {
    this.pdfParser = PDFParser.getInstance();
    this.wordParser = WordParser.getInstance();
  }

  public static getInstance(): DocumentParser {
    if (!DocumentParser.instance) {
      DocumentParser.instance = new DocumentParser();
    }
    return DocumentParser.instance;
  }

  async parseFile(file: File): Promise<ContractDocument> {
    try {
      // Determine file type
      const fileType = this.getFileType(file);
      
      switch (fileType) {
        case 'pdf':
          return await this.pdfParser.parseFile(file);
        case 'docx':
          return await this.wordParser.parseFile(file);
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      console.error('Document parsing error:', error);
      throw new Error('Failed to parse document. Please ensure it is a readable PDF or Word document.');
    }
  }

  private getFileType(file: File): 'pdf' | 'docx' | 'unknown' {
    // Check by MIME type first
    if (file.type === 'application/pdf') {
      return 'pdf';
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'docx';
    }
    
    // Fallback to file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (extension === 'docx') {
      return 'docx';
    }
    
    return 'unknown';
  }

  // Helper method to validate file before parsing
  validateFile(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['pdf', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext || '')) {
      return {
        isValid: false,
        error: 'Please upload a PDF or Word (.docx) file'
      };
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size must be less than 10MB'
      };
    }
    
    return { isValid: true };
  }
} 