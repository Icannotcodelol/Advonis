import { NextRequest, NextResponse } from 'next/server';
import { ContractClassifier } from '@/lib/contract-classifier';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid contract content' }, 
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI classification service not configured' }, 
        { status: 500 }
      );
    }

    const classifier = ContractClassifier.getInstance();
    const classification = await classifier.intelligentContractClassification(content);

    return NextResponse.json({ classification });
    
  } catch (error) {
    console.error('Contract classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify contract' }, 
      { status: 500 }
    );
  }
} 