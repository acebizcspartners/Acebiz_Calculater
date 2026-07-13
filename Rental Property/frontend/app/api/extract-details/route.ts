import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    let content: any[] = [];
    const mimeType = file.type;

    // Build content for Claude based on file type
    if (mimeType === 'text/plain') {
      const textContent = await file.text();
      content = [
        {
          type: 'text',
          text: textContent,
        },
      ];
    } else if (mimeType === 'application/pdf') {
      const base64Data = await fileToBase64(file);
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
      ];
    } else if (mimeType.startsWith('image/')) {
      const base64Data = await fileToBase64(file);
      const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        },
      ];
    } else if (
      mimeType === 'text/csv' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      try {
        const textContent = await file.text();
        content = [
          {
            type: 'text',
            text: textContent,
          },
        ];
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Could not read Excel/CSV file',
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unsupported file type',
      });
    }

    // Ask Claude to extract client name and property address
    const systemPrompt = `You are an expert at extracting key information from rental property documents.

Extract the client name and property address from this document. Return ONLY valid JSON with this structure:
{
  "clientName": "full name of the property owner/client",
  "propertyAddress": "complete property address"
}

If you cannot find either field, use null for that field. Look for:
- Client name: Owner name, landlord name, or account holder name
- Property address: The rental property address (not the agency address)

Be precise and extract the exact names/addresses as they appear.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    // Clean and parse JSON
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const extracted = JSON.parse(cleanedResponse);

    return NextResponse.json({
      success: true,
      clientName: extracted.clientName || null,
      propertyAddress: extracted.propertyAddress || null,
    });
  } catch (error) {
    console.error('Error extracting details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract details',
      },
      { status: 500 }
    );
  }
}
