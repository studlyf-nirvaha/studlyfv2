const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../backend/uploads'); // Adjust if needed
const PUBLIC_DIR = path.join(__dirname, 'public/assets');

async function optimize() {
  await fs.ensureDir(PUBLIC_DIR);
  
  const files = await fs.readdir(SOURCE_DIR);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      await sharp(path.join(SOURCE_DIR, file))
        .webp({ quality: 80 })
        .toFile(path.join(PUBLIC_DIR, path.parse(file).name + '.webp'));
    } else if (['.mp4', '.pdf', '.svg'].includes(ext)) {
      await fs.copy(path.join(SOURCE_DIR, file), path.join(PUBLIC_DIR, file));
    }
  }
}

optimize().catch(console.error);
