import { CTU } from "./ctu";

// 미리 계산된 코사인 값을 저장하는 룩업 테이블
const cosTable: number[][] = Array(8).fill(0).map(() => Array(8).fill(0));
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    cosTable[i][j] = Math.cos((i * j * Math.PI) / 16);
  }
}

// JPEG 표준 양자화 테이블
const quantTableY = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99
];

const quantTableC = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99
];

function rgb2ycbcr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return [y, cb, cr];
}

function dct(block: number[][]): number[][] {
  const result = Array(8).fill(0).map(() => Array(8).fill(0));
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          sum += block[x][y] * cosTable[x][u] * cosTable[y][v];
        }
      }
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      result[u][v] = 0.25 * cu * cv * sum;
    }
  }
  return result;
}

function quantize(block: number[][], quantTable: number[]): number[][] {
  return block.map((row, i) => row.map((val, j) => Math.round(val / quantTable[i * 8 + j])));
}

export function encodeDCT(ctus: CTU[]): CTU[] {
  return ctus.map(ctu => {
    const blockY = Array(8).fill(0).map(() => Array(8).fill(0));
    const blockCb = Array(8).fill(0).map(() => Array(8).fill(0));
    const blockCr = Array(8).fill(0).map(() => Array(8).fill(0));

    // RGB to YCbCr conversion and block filling
    for (let y = 0; y < Math.min(ctu.height, 8); y++) {
      for (let x = 0; x < Math.min(ctu.width, 8); x++) {
        const index = (y * ctu.width + x) * 4;
        const [yVal, cbVal, crVal] = rgb2ycbcr(ctu.data[index], ctu.data[index + 1], ctu.data[index + 2]);
        blockY[y][x] = yVal;
        blockCb[y][x] = cbVal - 128;
        blockCr[y][x] = crVal - 128;
      }
    }

    // Apply DCT and quantization
    const quantizedY = quantize(dct(blockY), quantTableY);
    const quantizedCb = quantize(dct(blockCb), quantTableC);
    const quantizedCr = quantize(dct(blockCr), quantTableC);

    return {
      ...ctu,
      dctY: quantizedY,
      dctCb: quantizedCb,
      dctCr: quantizedCr
    };
  });
}