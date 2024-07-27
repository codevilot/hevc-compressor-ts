import { CTU } from "./encode.ctu";

class DCT {
  private static readonly N: number = 8; // 8x8 블록 사용

  private static cosTable: number[][] = DCT.initCosTable();

  private static initCosTable(): number[][] {
    const table: number[][] = [];
    for (let i = 0; i < DCT.N; i++) {
      table[i] = [];
      for (let j = 0; j < DCT.N; j++) {
        table[i][j] = Math.cos(((2 * i + 1) * j * Math.PI) / (2 * DCT.N));
      }
    }
    return table;
  }

  static forward(block: number[][]): number[][] {
    const output: number[][] = [];
    for (let u = 0; u < DCT.N; u++) {
      output[u] = [];
      for (let v = 0; v < DCT.N; v++) {
        let sum = 0;
        for (let x = 0; x < DCT.N; x++) {
          for (let y = 0; y < DCT.N; y++) {
            sum += block[x][y] * 
                   DCT.cosTable[x][u] * 
                   DCT.cosTable[y][v];
          }
        }
        output[u][v] = sum * DCT.alpha(u) * DCT.alpha(v) * 0.25;
      }
    }
    return output;
  }

  private static alpha(u: number): number {
    return u === 0 ? 1 / Math.sqrt(2) : 1;
  }
}


export function encodeDCT(ctus: CTU[]): number[][][][] {
  return ctus.map(ctu => {
    const dctBlocks: number[][][] = [];
    for (let y = 0; y < ctu.height; y += 8) {
      for (let x = 0; x < ctu.width; x += 8) {
        const block: number[][] = [];
        for (let i = 0; i < 8; i++) {
          block[i] = [];
          for (let j = 0; j < 8; j++) {
            const index = ((y + i) * ctu.width + (x + j)) * 4; // Assuming RGBA
            block[i][j] = ctu.data[index]; // Using only the R channel for simplicity
          }
        }
        dctBlocks.push(DCT.forward(block));
      }
    }
    return dctBlocks;
  });
}
