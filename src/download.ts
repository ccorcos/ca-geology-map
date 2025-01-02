import fs from "fs-extra";
import path from "path";

import pLimit from "p-limit";

const limit = pLimit(10);

// const input = [
//   limit(() => fetchSomething("foo")),
//   limit(() => fetchSomething("bar")),
//   limit(() => doSomething()),
// ];

// // Only one promise is run at once
// const result = await Promise.all(input);
// console.log(result);

const zoom = 11;
const baseMapUrl = (row: number, col: number) =>
  `https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${row}/${col}`;
const topoMapUrl = (x: number, y: number) =>
  `https://gis.conservation.ca.gov/server/rest/services/CGS/Geologic_Map_of_California/MapServer/tile/${zoom}/${x}/${y}`;

const cacheDir = path.join(__dirname, "../cache");
fs.mkdirpSync(cacheDir);

async function downloadFile(url: string, filePath: string) {
  if (await fs.pathExists(filePath)) {
    console.log(`> skipping ${filePath} (already exists)`);
    return;
  }

  const response = await fetch(url);
  if (response.status === 404) {
    console.log(`> missing ${filePath} (404)`);
    await fs.writeFile(filePath, Buffer.from([]));
    return;
  }
  if (response.status !== 200) {
    console.error(`> failed to download ${url} (status ${response.status})`);
    // throw new Error(`> failed to download ${url} (status ${response.status})`);
    return; // We'll retry this later
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(buffer));
  console.log(`> downloaded ${filePath}`);
}

async function downloadTile(row: number, col: number) {
  await downloadFile(
    topoMapUrl(row, col),
    path.join(cacheDir, `topo-${row}-${col}.png`)
  );
  await downloadFile(
    baseMapUrl(row, col),
    path.join(cacheDir, `base-${row}-${col}.png`)
  );
}

// 764/315

const rowMin = 750;
const rowMax = 850;
const colMin = 300;
const colMax = 400;

async function main() {
  const promises: Promise<void>[] = [];
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      promises.push(limit(() => downloadTile(row, col)));
    }
  }
  await Promise.all(promises);
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
