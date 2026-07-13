import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Tricky fix: Automatically find index.html anywhere in the workspace
function findIndexHtml(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git') continue;
        
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findIndexHtml(fullPath);
            if (found) return found;
        } else if (file === 'index.html') {
            return fullPath;
        }
    }
    return null;
}

// Automatically find where index.html is located in your project workspace
const targetFile = findIndexHtml(__dirname);
if (targetFile) {
    // Dynamically tell Express to serve styles and assets from that specific folder
    const targetDir = path.dirname(targetFile);
    app.use(express.static(targetDir));
    
    // Serve the main website page
    app.get('/', (req, res) => {
        res.sendFile(targetFile);
    });
} else {
    // Fallback if index.html disappears
    app.use(express.static(__dirname));
    app.get('/', (req, res) => {
        res.status(404).send("Could not locate index.html in workspace");
    });
}

// Make sure your backend can parse incoming JSON data correctly
app.use(express.json());
// Serve generated PDFs straight from the root project folder
app.use(express.static(__dirname));
// Main Image to PDF Converter Route
// Main Image to PDF Converter Route
app.post('/api/convert-images', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const pdfDoc = await PDFDocument.create();

        for (const file of req.files) {
            const imageBytes = fs.readFileSync(file.path);
            let image;

            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
                image = await pdfDoc.embedJpg(imageBytes);
            } else if (file.mimetype === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                // Clean up unknown file types immediately from memory/disk
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                continue;
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

            // Clean up the temporary uploaded image from disk
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }

        const pdfBytes = await pdfDoc.save();
        const fileName = `converted-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, fileName);

        // Keep this line to write the PDF bytes onto the server disk
        fs.writeFileSync(filePath, pdfBytes);

        // Return successful down link to client application frame
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