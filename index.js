import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';


/* ---- Configuración de Express y Multer ---- */
const app = express();
const upload = multer(); // En memoria (Buffer)

/* ---- Endpoint POST /ask-gemini ---- */
app.post(
  '/ask-gemini',
  // Acepta 1 archivo en 'pdf' o en 'file'
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      /* ----- Extracción de datos ----- */
      const prompt = req.body.prompt;
      const apiKey = req.body.apiKey;
      const pdfBuffer =
        req.files?.pdf?.[0]?.buffer || req.files?.file?.[0]?.buffer;

      if (!prompt || !apiKey || !pdfBuffer) {
        return res
          .status(400)
          .send(
            'Faltan datos: asegúrate de enviar prompt, pdf/file y apiKey (o configurarla en .env).'
          );
      }

      /* ----- Llamada a Gemini ----- */
      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBuffer.toString('base64')
          }
        }
      ];

      const { text: answer } = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents
      });

      /* ----- Respuesta (solo el texto) ----- */
      res.type('text/plain').send(answer);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error interno.');
    }
  }
);

/* ---- Lanzar servidor ---- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀  Servidor escuchando en http://localhost:${PORT}`)
);
