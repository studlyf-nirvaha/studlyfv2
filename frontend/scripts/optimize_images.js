import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;

let baseDir = path.join(scriptDir, '..', 'public');
if (!fs.existsSync(baseDir)) {
  baseDir = path.join(scriptDir, '..', '..', 'frontend', 'public');
}

const inputDir = path.join(baseDir, 'images');
const outputDir = path.join(baseDir, 'images-optimized');

async function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const relDir = path.relative(inputDir, fullPath);
            const targetDir = path.join(outputDir, relDir);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            await processDirectory(fullPath);
        } else if (file.match(/\.(png|jpg|jpeg)$/)) {
            const relDir = path.relative(inputDir, dir);
            const targetPath = path.join(outputDir, relDir, file.replace(/\.(png|jpg|jpeg)$/, '.webp'));
            
            await sharp(fullPath)
                .webp({ quality: 80 })
                .toFile(targetPath);
        } else if (file.match(/\.webp$/)) {
            const relDir = path.relative(inputDir, dir);
            const targetPath = path.join(outputDir, relDir, file);
            
            if (!fs.existsSync(targetPath)) {
                fs.copyFileSync(fullPath, targetPath);
            }
        }
    }
}

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
processDirectory(inputDir).catch(console.error);
