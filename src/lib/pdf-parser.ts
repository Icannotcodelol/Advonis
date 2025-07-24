import type { ContractDocument, PDFPage, TextItem } from '@/types/contract';

// PDF.js will be loaded dynamically on the client side
let pdfjsLib: any = null;

const configurePDFJS = async () => {
  if (typeof window !== 'undefined' && !pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  return pdfjsLib;
};

export type PDFSection = {
  type: 'heading' | 'paragraph' | 'list-item';
  text: string;
  level?: number; // for headings
  startOffset: number;
  endOffset: number;
};

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

      const contractType = this.detectContractType(allContent);

      return {
        id: this.generateId(),
        name: file.name,
        type: contractType,
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

  async parseFileWithStructure(file: File): Promise<ContractDocument & { sections: PDFSection[] }> {
    try {
      const pdfLib = await configurePDFJS();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfLib.getDocument(arrayBuffer).promise;

      const pages: PDFPage[] = [];
      let allContent = '';
      const tempSections: Omit<PDFSection, 'startOffset' | 'endOffset'>[] = [];

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

        // Heuristic: group by font size for headings, detect lists, else paragraph
        let currentParagraph = '';
        for (const item of textContent.items) {
          // @ts-ignore
          const str = item.str as string;
          // @ts-ignore
          const fontSize = Math.abs(item.transform[0]);
          if (fontSize > 16 && str.trim().length > 0) {
            if (currentParagraph.trim()) {
              tempSections.push({ type: 'paragraph', text: currentParagraph.trim() });
              currentParagraph = '';
            }
            tempSections.push({ type: 'heading', text: str.trim(), level: fontSize > 22 ? 1 : 2 });
          } else if (/^(\d+\.|\-|\•)/.test(str.trim())) {
            if (currentParagraph.trim()) {
              tempSections.push({ type: 'paragraph', text: currentParagraph.trim() });
              currentParagraph = '';
            }
            tempSections.push({ type: 'list-item', text: str.trim() });
          } else {
            currentParagraph += str + ' ';
          }
        }
        if (currentParagraph.trim()) {
          tempSections.push({ type: 'paragraph', text: currentParagraph.trim() });
        }

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

      // Now map sections to their actual positions in allContent
      const sections: PDFSection[] = [];
      let searchOffset = 0;
      
      for (const tempSection of tempSections) {
        const sectionText = tempSection.text;
        const startOffset = allContent.indexOf(sectionText, searchOffset);
        if (startOffset >= 0) {
          const endOffset = startOffset + sectionText.length;
          sections.push({
            ...tempSection,
            startOffset,
            endOffset
          });
          searchOffset = endOffset;
        } else {
          // Fallback: approximate position
          sections.push({
            ...tempSection,
            startOffset: searchOffset,
            endOffset: searchOffset + sectionText.length
          });
          searchOffset += sectionText.length + 1;
        }
      }

      const contractType = this.detectContractType(allContent);

      return {
        id: this.generateId(),
        name: file.name,
        type: contractType,
        content: allContent.trim(),
        pages,
        uploadedAt: new Date(),
        analysisStatus: 'pending',
        annotations: [],
        sections
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
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