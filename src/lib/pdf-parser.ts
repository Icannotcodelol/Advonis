import * as pdfjsLib from 'pdfjs-dist';
import type { ContractDocument, PDFPage, TextItem } from '@/types/contract';

// Configure PDF.js
async function configurePDFJS() {
  if (typeof window !== 'undefined') {
    // Browser environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  } else {
    // Server environment
    // @ts-ignore: Worker types not available
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
  }
  return pdfjsLib;
}

export class PDFParser {
  private static instance: PDFParser;

  public static getInstance(): PDFParser {
    if (!PDFParser.instance) {
      PDFParser.instance = new PDFParser();
    }
    return PDFParser.instance;
  }

  async parseFile(file: File): Promise<ContractDocument> {
    try {
      const pdfLib = await configurePDFJS();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfLib.getDocument(arrayBuffer).promise;

      const pages: PDFPage[] = [];
      let allContent = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        const textItems: TextItem[] = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => ({
            str: item.str,
            dir: item.dir || 'ltr',
            width: item.width || 0,
            height: item.height || 0,
            transform: item.transform || [0, 0, 0, 0, 0, 0],
            fontName: item.fontName || '',
            hasEOL: item.hasEOL || false
          }));

        const pageContent = textItems.map(item => item.str).join(' ').trim();
        allContent += pageContent + '\n\n';

        pages.push({
          pageNumber: pageNum,
          content: pageContent,
          textItems,
          viewport: {
            width: viewport.width,
            height: viewport.height
          }
        });
      }

      return {
        id: this.generateId(),
        name: file.name,
        type: 'general', // Contract type will be determined by classification API
        content: allContent.trim(),
        pages,
        uploadedAt: new Date(),
        analysisStatus: 'pending',
        annotations: []
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  async parseFileWithStructure(file: File): Promise<ContractDocument> {
    try {
      const pdfLib = await configurePDFJS();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfLib.getDocument(arrayBuffer).promise;

      const pages: PDFPage[] = [];
      let allContent = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        const textItems: TextItem[] = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => ({
            str: item.str,
            dir: item.dir || 'ltr',
            width: item.width || 0,
            height: item.height || 0,
            transform: item.transform || [0, 0, 0, 0, 0, 0],
            fontName: item.fontName || '',
            hasEOL: item.hasEOL || false
          }));

        const pageContent = textItems.map(item => item.str).join(' ').trim();
        allContent += pageContent + '\n\n';

        // Enhanced structure analysis
        const structuredItems = this.analyzeTextStructure(textItems, viewport);
        
        pages.push({
          pageNumber: pageNum,
          content: pageContent,
          textItems: structuredItems,
          viewport: {
            width: viewport.width,
            height: viewport.height
          }
        });
      }

      return {
        id: this.generateId(),
        name: file.name,
        type: 'general', // Contract type will be determined by classification API
        content: allContent.trim(),
        pages,
        uploadedAt: new Date(),
        analysisStatus: 'pending',
        annotations: []
      };
    } catch (error) {
      console.error('PDF parsing with structure error:', error);
      throw new Error('Failed to parse PDF file with structure analysis');
    }
  }

  private analyzeTextStructure(textItems: TextItem[], viewport: any): TextItem[] {
    // Enhanced text item analysis for better structure detection
    return textItems.map((item, index) => {
      const [scaleX, skewX, skewY, scaleY, translateX, translateY] = item.transform;
      
      // Determine if this looks like a heading based on font size and position
      const fontSize = Math.abs(scaleY);
      const isLargeText = fontSize > 12;
      const isAtStart = translateX < viewport.width * 0.2;
      
      // Enhanced item with structural hints
      return {
        ...item,
        fontSize,
        x: translateX,
        y: translateY,
        isLikelyHeading: isLargeText && isAtStart,
        isLikelyListItem: item.str.trim().match(/^[\d\w]+[\.\)]/),
        isLikelySignature: item.str.toLowerCase().includes('unterschrift') || 
                          item.str.toLowerCase().includes('signature'),
      };
    });
  }

  private generateId(): string {
    return `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 