import type { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync } from 'fs';
import path from 'path';

const LOGO_PATH = path.join(
  process.cwd(),
  'public',
  'media',
  'animated_logo',
  'goodcup-contact-logo.png'
);

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line: string): string {
  const chunks: string[] = [];

  for (let index = 0; index < line.length; index += 72) {
    chunks.push(line.slice(index, index + 72));
  }

  return chunks.join('\r\n ');
}

function createVCard(): string {
  const logo = readFileSync(LOGO_PATH).toString('base64');
  const notes = [
    'Smart. Delicious. Different.',
    'Functional beverages, powders, and nutrition.',
    'Find our current markets at goodcup.me.',
  ].join('\n');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'PRODID:-//Goodcup//Contact Card//EN',
    'N:Goodcup;;;;',
    `FN:${escapeVCardText('Goodcup')}`,
    `ORG:${escapeVCardText('Good Enterprises')}`,
    `TITLE:${escapeVCardText('Smart Functional Beverages')}`,
    'item1.TEL;TYPE=PREF,VOICE,MSG,CELL:+17142026295',
    'item1.X-ABLabel:Call & Text',
    'item2.TEL;TYPE=VOICE:+18885748836',
    'item2.X-ABLabel:Other',
    'EMAIL;TYPE=INTERNET,WORK:hello@goodcup.me',
    'URL;TYPE=WORK:https://goodcup.me',
    'item3.URL:https://instagram.com/goodcup.me',
    'item3.X-ABLabel:Instagram',
    'item4.URL:https://tiktok.com/@goodcup.me',
    'item4.X-ABLabel:TikTok',
    'item5.URL:https://facebook.com/goodcup.me',
    'item5.X-ABLabel:Facebook',
    `NOTE:${escapeVCardText(notes)}`,
    `PHOTO;ENCODING=b;TYPE=PNG:${logo}`,
    'END:VCARD',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const vCard = createVCard();

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Goodcup.vcf"');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.status(200).send(vCard);
}
