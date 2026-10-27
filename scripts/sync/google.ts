import { google } from 'googleapis';
import type { FonteConteudo } from './sincronizar';

export function fonteGoogle(credenciaisJson: string, sheetId: string): FonteConteudo {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credenciaisJson),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  return {
    async lerValores() {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'noticias!A1:K' });
      return (r.data.values ?? []) as string[][];
    },
    async baixarImagem(fileId) {
      const r = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' },
      );
      return Buffer.from(r.data as ArrayBuffer);
    },
  };
}
