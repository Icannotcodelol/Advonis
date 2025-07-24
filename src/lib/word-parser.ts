// @ts-ignore: No types for mammoth
import mammoth from 'mammoth';
import type { ContractDocument, PDFPage, TextItem } from '@/types/contract';

export class WordParser {
  private static instance: WordParser;

  public static getInstance(): WordParser {
    if (!WordParser.instance) {
      WordParser.instance = new WordParser();
    }
    return WordParser.instance;
  }

  async parseFile(file: File): Promise<ContractDocument> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract both raw text and formatted HTML
      // @ts-ignore: No types for mammoth
      const { value: content } = await mammoth.extractRawText({ arrayBuffer });
      // @ts-ignore: No types for mammoth
      const { value: formattedContent } = await mammoth.convertToHtml({ arrayBuffer });
      
      const pages = this.splitIntoPages(content, formattedContent);
      const contractType = this.detectContractType(content);
      
      return {
        id: this.generateId(),
        name: file.name,
        type: contractType,
        content,
        formattedContent,
        pages,
        uploadedAt: new Date(),
        analysisStatus: 'pending',
        annotations: []
      };
    } catch (error) {
      console.error('Word parsing error:', error);
      throw new Error('Failed to parse Word document');
    }
  }

  private splitIntoPages(content: string, formattedContent: string): PDFPage[] {
    // Word docs don't have pages, so treat as one page for now
    return [{
      pageNumber: 1,
      content: content.trim(),
      textItems: this.extractTextItems(content),
      viewport: { width: 0, height: 0 }
    }];
  }

  private extractTextItems(content: string): TextItem[] {
    // Split by lines for basic structure
    return content.split('\n').map(line => ({
      str: line,
      dir: 'ltr',
      width: 0,
      height: 0,
      transform: [0, 0, 0, 0, 0, 0],
      fontName: '',
      hasEOL: true
    }));
  }

  private detectContractType(content: string): ContractDocument['type'] {
    // Simplified detection - AI will do the real classification
    // Just do basic fallback detection for immediate UI feedback
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('arbeitsvertrag') || lowerContent.includes('anstellungsvertrag')) {
      return 'arbeitsvertrag';
    }
    if (lowerContent.includes('werkvertrag')) {
      return 'werkvertrag';
    }
    if (lowerContent.includes('dienstvertrag') || lowerContent.includes('dienstleistung')) {
      return 'dienstvertrag';
    }
    if (lowerContent.includes('geheimhaltung') || lowerContent.includes('nda')) {
      return 'nda';
    }
    
    return 'general'; // AI will provide accurate classification
  }



  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
} 