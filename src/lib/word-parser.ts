// @ts-ignore: No types for mammoth
import mammoth from 'mammoth';
import type { ContractDocument } from '@/types/contract';

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
      
      return {
        id: this.generateId(),
        name: file.name,
        type: 'general', // Contract type will be determined by classification API
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

  private splitIntoPages(content: string, formattedContent: string) {
    // Simple page splitting for Word documents
    // Word documents don't have natural page breaks in the extracted text
    const wordsPerPage = 500;
    const words = content.split(/\s+/);
    const pages = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      const pageContent = pageWords.join(' ');
      
      pages.push({
        pageNumber: Math.floor(i / wordsPerPage) + 1,
        content: pageContent,
        textItems: [], // Word parsing doesn't provide detailed text items
        viewport: { width: 612, height: 792 } // Standard letter size
      });
    }
    
    return pages.length > 0 ? pages : [{
      pageNumber: 1,
      content,
      textItems: [],
      viewport: { width: 612, height: 792 }
    }];
  }

  private generateId(): string {
    return `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 