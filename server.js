import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { pdfToText } from 'pdf-to-text';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static('public')); // Serves your frontend HTML

// Initialize Gemini AI
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 1. IMAGE TO PDF CONVERSION
// ==========================================
app.post('/api/image-to-pdf', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send('No files uploaded.');

        const pdfDoc = await PDFDocument.create();

        for (const file of req.files) {
            const imageBytes = await fs.readFile(file.path);
            let image;
            
            // Check file type and embed accordingly
            if (file.mimetype === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                image = await pdfDoc.embedJpg(imageBytes);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            
            // Clean up the temporary uploaded file
            await fs.unlink(file.path);
        }

        const pdfBytes = await pdfDoc.save();
        res.contentType("application/pdf");
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ==========================================
// 2. PDF TO IMAGE CONVERSION
// ==========================================
app.post('/api/pdf-to-image', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No PDF file uploaded.');

        const outputDir = path.join('uploads', `${req.file.filename}-pages`);
        await fs.mkdir(outputDir, { recursive: true });

        const options = {
            format: 'png',
            out_dir: outputDir,
            out_prefix: 'page',
            page: 1 // Converts the first page as a showcase
        };

        await pdfPoppler.convert(req.file.path, options);
        
        const convertedImagePath = path.join(outputDir, 'page-1.png');
        const imageBuffer = await fs.readFile(convertedImagePath);

        // Clean up everything
        await fs.unlink(req.file.path);
        await fs.rm(outputDir, { recursive: true, force: true });

        res.contentType("image/png");
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ==========================================
// 3. WORD TO IMAGE (VIA EXTRACTED HTML CONTEXT)
// ==========================================
app.post('/api/word-to-custom-image', upload.single('word'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No document uploaded.');

        // Extract text/html layout from Docx using Mammoth
        const result = await mammoth.convertToHtml({ path: req.file.path });
        const htmlContent = result.value; 

        await fs.unlink(req.file.path);

        // Send back structural layout info for your client canvas to draw
        res.json({ 
            success: true, 
            message: "Document parsed successfully.", 
            htmlStructure: htmlContent 
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ==========================================
// 4. CO-PILOT AI ENGINE (AI ASSISTANT & PROMPT GEN)
// ==========================================
app.post('/api/ai-chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).send('Message is required.');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        });

        res.json({ response: response.text });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 NexusHub Server engine running on port ${PORT}`));
module.exports = app;