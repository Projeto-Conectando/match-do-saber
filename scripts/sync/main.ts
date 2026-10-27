import { appendFile } from 'node:fs/promises';
import { fonteGoogle } from './google';
import { resumoMarkdown, sincronizar } from './sincronizar';

const credenciais = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const sheetId = process.env.SHEET_ID;
if (!credenciais || !sheetId) {
  console.error('Defina GOOGLE_SERVICE_ACCOUNT_JSON e SHEET_ID.');
  process.exit(1);
}

try {
  const r = await sincronizar(fonteGoogle(credenciais, sheetId), 'public/content');
  const md = resumoMarkdown(r);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
} catch (e) {
  const msg = `## Publicação falhou\n\n${(e as Error).message}\n\nO jogo publicado continua com o conteúdo anterior.\n`;
  console.error(msg);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, msg);
  process.exit(1);
}
