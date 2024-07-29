import { CTU } from "./ctu";


function rgb2ycbcr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return [y, cb, cr];
}

function ycbcr2rgb(y: number, cb: number, cr: number): [number, number, number] {
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  ];
}

function intraPrediction(block: number[][]): number[][] {
  const height = block.length;
  const width = block[0].length;
  const predicted = Array(height).fill(0).map(() => Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += block[ny][nx];
            count++;
          }
        }
      }
      
      predicted[y][x] = Math.round(sum / count);
    }
  }

  return predicted;
}

function interPrediction(currentBlock: number[][], referenceBlock: number[][]): [number[][], { x: number; y: number }] {
  const height = currentBlock.length;
  const width = currentBlock[0].length;
  const predicted = Array(height).fill(0).map(() => Array(width).fill(0));
  
  let bestMV = { x: 0, y: 0 };
  let minSAD = Infinity;

  for (let dy = -16; dy <= 16; dy++) {
    for (let dx = -16; dx <= 16; dx++) {
      let SAD = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const refY = y + dy;
          const refX = x + dx;
          if (refY >= 0 && refY < height && refX >= 0 && refX < width) {
            SAD += Math.abs(currentBlock[y][x] - referenceBlock[refY][refX]);
          } else {
            SAD += Math.abs(currentBlock[y][x] - 128);
          }
        }
      }
      if (SAD < minSAD) {
        minSAD = SAD;
        bestMV = { x: dx, y: dy };
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const refY = y + bestMV.y;
      const refX = x + bestMV.x;
      if (refY >= 0 && refY < height && refX >= 0 && refX < width) {
        predicted[y][x] = referenceBlock[refY][refX];
      } else {
        predicted[y][x] = 128;
      }
    }
  }

  return [predicted, bestMV];
}

export function encodePredict(ctus: CTU[], previousFrame?: ImageData): CTU[] {
  ctus.forEach((ctu, index) => {
    const blockY: number[][] = Array(ctu.height).fill(0).map(() => Array(ctu.width).fill(0));
    const blockCb: number[][] = Array(ctu.height).fill(0).map(() => Array(ctu.width).fill(0));
    const blockCr: number[][] = Array(ctu.height).fill(0).map(() => Array(ctu.width).fill(0));

    for (let y = 0; y < ctu.height; y++) {
      for (let x = 0; x < ctu.width; x++) {
        const idx = (y * ctu.width + x) * 4;
        const [yVal, cbVal, crVal] = rgb2ycbcr(
          ctu.data[idx],
          ctu.data[idx + 1],
          ctu.data[idx + 2]
        );
        blockY[y][x] = yVal;
        blockCb[y][x] = cbVal;
        blockCr[y][x] = crVal;
      }
    }

    const predictedIntraY = intraPrediction(blockY);
    const residualIntraY = blockY.map((row, y) => row.map((val, x) => val - predictedIntraY[y][x]));

    let predictedInterY: number[][] | null = null;
    let residualInterY: number[][] | null = null;
    let motionVector: { x: number; y: number } | null = null;

    if (previousFrame) {
      const referenceBlockY = Array(ctu.height).fill(0).map(() => Array(ctu.width).fill(0));
      const startX = (index * ctu.width) % previousFrame.width;
      const startY = Math.floor((index * ctu.width) / previousFrame.width) * ctu.height;
      
      for (let y = 0; y < ctu.height; y++) {
        for (let x = 0; x < ctu.width; x++) {
          const idx = ((startY + y) * previousFrame.width + (startX + x)) * 4;
          referenceBlockY[y][x] = previousFrame.data[idx];
        }
      }
      
      [predictedInterY, motionVector] = interPrediction(blockY, referenceBlockY);
      residualInterY = blockY.map((row, y) => row.map((val, x) => val - predictedInterY[y][x]));
    }

    let finalResidualY: number[][];
    let predictionType: 'INTRA' | 'INTER';

    if (predictedInterY && residualInterY) {
      const intraEnergy = residualIntraY.flat().reduce((a, b) => a + b * b, 0);
      const interEnergy = residualInterY.flat().reduce((a, b) => a + b * b, 0);
      if (interEnergy < intraEnergy) {
        finalResidualY = residualInterY;
        predictionType = 'INTER';
      } else {
        finalResidualY = residualIntraY;
        predictionType = 'INTRA';
      }
    } else {
      finalResidualY = residualIntraY;
      predictionType = 'INTRA';
    }

    for (let y = 0; y < ctu.height; y++) {
      for (let x = 0; x < ctu.width; x++) {
        const idx = (y * ctu.width + x) * 4;
        const predictedY = predictionType === 'INTRA' ? predictedIntraY[y][x] : (predictedInterY ? predictedInterY[y][x] : predictedIntraY[y][x]);
        const [r, g, b] = ycbcr2rgb(
          Math.max(0, Math.min(255, predictedY + finalResidualY[y][x])),
          blockCb[y][x],
          blockCr[y][x]
        );
        ctu.data[idx] = r;
        ctu.data[idx + 1] = g;
        ctu.data[idx + 2] = b;
        ctu.data[idx + 3] = 255; 
      }
    }

    ctu.predictionType = predictionType;
    ctu.motionVector = motionVector;
  });

  return ctus;
}