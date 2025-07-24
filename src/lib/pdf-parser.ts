import type { PDFPage } from '@/types/contract';

// PDF.js will be loaded dynamically on the client side
let pdfjsLib: any = null;

const configurePDFJS = async () => {
  if (typeof window !== 'undefined' && !pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  return pdfjsLib;
};

export async function parsePDFFile(file: File): Promise<{ content: string; pages: string[] }> {
  try {
    const pdfLib = await configurePDFJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfLib.getDocument(arrayBuffer).promise;

    const pages: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const content = textContent.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      pages.push(content.trim());
    }
    const content = pages.join('\n\n');
    return { content, pages };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
} 