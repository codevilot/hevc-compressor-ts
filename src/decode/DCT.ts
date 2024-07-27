// import { CTU } from '../lib/encode.ctu';

// class DCT {
//   private static readonly N: number = 8; // 8x8 블록 사용

//   private static cosTable: number[][] = DCT.initCosTable();

//   private static initCosTable(): number[][] {
//     const table: number[][] = [];
//     for (let i = 0; i < DCT.N; i++) {
//       table[i] = [];
//       for (let j = 0; j < DCT.N; j++) {
//         table[i][j] = Math.cos(((2 * i + 1) * j * Math.PI) / (2 * DCT.N));
//       }
//     }
//     return table;
//   }

//   static inverse(block: number[][]): number[][] {
//     const output: number[][] = [];
//     for (let x = 0; x < DCT.N; x++) {
//       output[x] = [];
//       for (let y = 0; y < DCT.N; y++) {
//         let sum = 0;
//         for (let u = 0; u < DCT.N; u++) {
//           for (let v = 0; v < DCT.N; v++) {
//             sum +=
//               DCT.alpha(u) *
//               DCT.alpha(v) *
//               block[u][v] *
//               DCT.cosTable[x][u] *
//               DCT.cosTable[y][v];
//           }
//         }
//         output[x][y] = Math.round(sum * 0.25);
//       }
//     }
//     return output;
//   }

//   private static alpha(u: number): number {
//     return u === 0 ? 1 / Math.sqrt(2) : 1;
//   }
// }

// export function decodeDCT(encodedCTUs: number[][][][]): CTU[] {
//   return encodedCTUs.map((encodedCTU) => {
//     const width = Math.sqrt(encodedCTU.length) * 8;
//     const height = width;
//     const decodedData = new Uint8ClampedArray(width * height * 4);

//     let blockIndex = 0;
//     for (let y = 0; y < height; y += 8) {
//       for (let x = 0; x < width; x += 8) {
//         const decodedBlock = DCT.inverse(encodedCTU[blockIndex]);
//         for (let i = 0; i < 8; i++) {
//           for (let j = 0; j < 8; j++) {
//             const pixelValue = Math.max(0, Math.min(255, decodedBlock[i][j]));
//             const index = ((y + i) * width + (x + j)) * 4;
//             decodedData[index] = pixelValue; // R
//             decodedData[index + 1] = pixelValue; // G
//             decodedData[index + 2] = pixelValue; // B
//             decodedData[index + 3] = 255; // A
//           }
//         }
//         blockIndex++;
//       }
//     }

//     return new CTU(width, height, decodedData);
//   });
// }
