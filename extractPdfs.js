import AdmZip from 'adm-zip';
import e from 'express';
import path from 'path';
export function extractPdfs(zipBuffer) {
  const zip = new AdmZip(zipBuffer);

  return zip
    .getEntries()
    .filter(e => !e.isDirectory && path.extname(e.entryName).toLowerCase() === '.pdf')
    .map(e => ({
      name: e.entryName,
      buffer: e.getData()
    }));
}
e