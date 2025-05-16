import express from 'express';
import multer from 'multer';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { extractPdfs } from './extractPdfs.js';

const app   = express();
const upload = multer();               // buffers en memoria
app.use(express.json());

/* ---- Config común a ambos endpoints ---- */
const MODEL      = 'gemini-2.0-flash';
const MAX_TOKENS = 8192;

/* ------------ Auxiliar: PDF → Gemini -------------- */
async function pdfToGemini({ ai, prompt, pdfBuffer }) {
  const { text } = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBuffer.toString('base64')
        }
      }
    ],
    generationConfig: { maxOutputTokens: MAX_TOKENS }
  });
  return text;
}

/* ---- Endpoint POST /ask-gemini ---- */
/* ========== 1️⃣  /ocr-pdf-gemini (PDF directo) ========== */
app.post('/ocr-pdf-gemini', upload.single('file'), async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const file = req.file;

    if (!prompt || !apiKey || !file)
      return res.status(400).send('Faltan prompt, apiKey o file.');

    if (path.extname(file.originalname).toLowerCase() !== '.pdf')
      return res.status(400).send('El archivo debe ser PDF.');

    const ai = new GoogleGenAI({ apiKey });
    const answer = await pdfToGemini({ ai, prompt, pdfBuffer: file.buffer });

    res.type('text/plain').send(answer);                        // array con 1 string
  } catch (err) {
    console.error('❌', err);
    res.status(500).send(err.message || 'Error interno.');
  }
});

/* ========== 2️⃣  /ocr-zip-gemini (ZIP con PDFs) ========== */
app.post('/ocr-zip-gemini', upload.single('file'), async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const file = req.file;

    if (!prompt || !apiKey || !file)
      return res.status(400).send('Faltan prompt, apiKey o file.');

    if (path.extname(file.originalname).toLowerCase() !== '.zip')
      return res.status(400).send('El archivo debe ser ZIP.');

    const pdfs = extractPdfs(file.buffer);
    if (pdfs.length === 0)
      return res.status(400).send('El ZIP no contiene PDFs.');

    const ai = new GoogleGenAI({ apiKey });

    // Procesar todos los PDFs en paralelo
    const answers = await Promise.all(
      pdfs.map(pdf =>
        pdfToGemini({ ai, prompt, pdfBuffer: pdf.buffer }))
    );

    res.json(answers);                         // ["respuesta1", …]
  } catch (err) {
    console.error('❌', err);
    res.status(500).send(err.message || 'Error interno.');
  }
});


/* ---- Endpoint 2: /query (solo texto) ---- */
app.post('/query', async (req, res) => {
  try {
    
    const { prompt, query, apiKey } = req.body;
    if (!prompt || !query || !apiKey) {
      return res
        .status(400)
        .send('Faltan datos: prompt, query o apiKey.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const { text: answer } = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: [
        { text: prompt },
        { text: query }
      ]
    });

    res.type('text/plain').send(answer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno.');
  }
});

/* ---- Lanzar servidor ---- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀  Servidor escuchando en http://localhost:${PORT}`)
);
