import { NextRequest, NextResponse } from 'next/server';
import { PDFParser } from '@/lib/pdf-parser';
import { WordParser } from '@/lib/word-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type and size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    let contract;
    
    if (file.type === 'application/pdf') {
      const pdfParser = PDFParser.getInstance();
      contract = await pdfParser.parseFileWithStructure(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      const wordParser = WordParser.getInstance();
      contract = await wordParser.parseFile(file);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF or Word documents.' }, 
        { status: 400 }
      );
    }

    return NextResponse.json({ contract });
    
  } catch (error) {
    console.error('Document parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document' }, 
      { status: 500 }
    );
  }
} 