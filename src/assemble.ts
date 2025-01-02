import * as fs from "fs-extra";
import path from "path";
const cacheDir = path.join(__dirname, "../cache");

const rowMin = 750;
const rowMax = 850;
const colMin = 300;
const colMax = 400;

async function getTotalSize(prefix: "base" | "topo") {
  let totalSize = 0;
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const topoFileName = path.join(cacheDir, `${prefix}-${row}-${col}.png`);
      const stats = await fs.stat(topoFileName);
      totalSize += stats.size;
    }
  }
  console.log(`total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

const tileSize = 256; // Standard tile size

async function assemble(prefix: "base" | "topo") {
  // Calculate dimensions
  const rowCount = rowMax - rowMin + 1;
  const colCount = colMax - colMin + 1;
  const totalWidth = colCount * tileSize;
  const totalHeight = rowCount * tileSize;

  // Create canvas
  const { createCanvas, loadImage } = require("canvas");
  const canvas = createCanvas(totalWidth, totalHeight);
  const ctx = canvas.getContext("2d");

  // Load and draw all tiles
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const fileName = path.join(cacheDir, `${prefix}-${row}-${col}.png`);
      if (await fs.pathExists(fileName)) {
        const stats = await fs.stat(fileName);
        if (stats.size > 0) {
          const img = await loadImage(fileName);
          const x = (col - colMin) * tileSize;
          const y = (row - rowMin) * tileSize;
          ctx.drawImage(img, x, y);
        }
      }
    }
  }

  // Save the final image
  const buffer = canvas.toBuffer("image/png");
  const outputPath = path.join(__dirname, `../assembled-${prefix}.png`);
  await fs.writeFile(outputPath, buffer);
  console.log(`Assembled ${prefix} tiles into ${outputPath}`);
}

async function main() {
  await getTotalSize("topo");
  await getTotalSize("base");
  await assemble("topo");
  await assemble("base");
}

main()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
