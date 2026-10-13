import { getNumbers } from '@/lib/sheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const contacts = await getNumbers();
    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error('Contacts API error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}