import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('AI tools public/public'));
app.use(express.json());

// Main Image to PDF Converter Route
app.post('/api/convert-images', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded or wrong field name used." });
        }

        const pdfDoc = await PDFDocument.create();

        for (const file of req.files) {
            const imageBytes = fs.readFileSync(file.path);
            let image;
            
            if (file.mimetype === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                image = await pdfDoc.embedJpg(imageBytes);
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            
            // Clean up the temporary uploaded file
            fs.unlinkSync(file.path);
        }

        const pdfBytes = await pdfDoc.save();
        const fileName = `converted-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, 'public', fileName);
        
        fs.unlinkSync(filePath);
        res.json({ success: true, url: `/${fileName}`, name: fileName });
    } catch (error) {
        console.error("Image to PDF error:", error);
        res.status(500).json({ error: "Failed to convert images to PDF" });
    }
});

// Initialize Gemini AI
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Server Port configuration and Activation Listener
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});

export default app;