import { google } from 'googleapis';
import { Contact } from './types';

export async function getNumbers(): Promise<Contact[]> {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.SHEET_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      throw new Error('Missing Google Sheets credentials');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A2:E', // Fetching up to column E
    });

    const rows = res.data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    // Map rows to Contact objects
    // Assuming structure: Name | Phone | Email | Notes | ...
    return rows.map((row) => ({
      name: row[0] || 'Unknown',
      phone: row[1] || '',
      email: row[2] || '',
      notes: row[3] || '',
    })).filter(contact => contact.phone); // Filter out empty phones
  } catch (error: any) {
    console.error('Sheets API Error:', error.message);
    throw new Error('Failed to fetch contacts from Google Sheets');
  }
}
