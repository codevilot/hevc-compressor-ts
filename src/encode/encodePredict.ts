import { CTU } from './ctu';

function intraPrediction(
  ctu: CTU,
  leftCTU: CTU | null,
  topCTU: CTU | null
): CTU {
  const predictedCTU = new CTU(
    ctu.width,
    ctu.height,
    new Uint8ClampedArray(ctu.width * ctu.height)
  );

  for (let y = 0; y < ctu.height; y++) {
    for (let x = 0; x < ctu.width; x++) {
      let predictedValue = 128; // 기본값

      if (x > 0 && y > 0) {
        const left = ctu.data[y * ctu.width + (x - 1)];
        const top = ctu.data[(y - 1) * ctu.width + x];
        const topLeft = ctu.data[(y - 1) * ctu.width + (x - 1)];
        predictedValue = Math.round((left + top + topLeft) / 3);
      } else if (x > 0) {
        predictedValue = ctu.data[y * ctu.width + (x - 1)];
      } else if (y > 0) {
        predictedValue = ctu.data[(y - 1) * ctu.width + x];
      } else if (leftCTU) {
        predictedValue = leftCTU.data[y * leftCTU.width + (leftCTU.width - 1)];
      } else if (topCTU) {
        predictedValue = topCTU.data[(topCTU.height - 1) * topCTU.width + x];
      }

      predictedCTU.data[y * ctu.width + x] = predictedValue;
    }
  }

  predictedCTU.predictionType = 'INTRA';
  return predictedCTU;
}

function interPrediction(currentCTU: CTU, referenceCTUs: CTU[]): CTU {
  const predictedCTU = new CTU(
    currentCTU.width,
    currentCTU.height,
    new Uint8ClampedArray(currentCTU.width * currentCTU.height)
  );

  const searchRange = 16;
  let bestSAD = Infinity;
  let bestMV = { x: 0, y: 0 };

  for (const refCTU of referenceCTUs) {
    for (let dy = -searchRange; dy <= searchRange; dy++) {
      for (let dx = -searchRange; dx <= searchRange; dx++) {
        let SAD = 0;

        for (let y = 0; y < currentCTU.height; y++) {
          for (let x = 0; x < currentCTU.width; x++) {
            const currentPixel = currentCTU.data[y * currentCTU.width + x];
            const refY = y + dy;
            const refX = x + dx;

            if (
              refY >= 0 &&
              refY < refCTU.height &&
              refX >= 0 &&
              refX < refCTU.width
            ) {
              const refPixel = refCTU.data[refY * refCTU.width + refX];
              SAD += Math.abs(currentPixel - refPixel);
            } else {
              SAD += 255;
            }
          }
        }

        if (SAD < bestSAD) {
          bestSAD = SAD;
          bestMV = { x: dx, y: dy };
        }
      }
    }
  }

  for (let y = 0; y < currentCTU.height; y++) {
    for (let x = 0; x < currentCTU.width; x++) {
      const refY = y + bestMV.y;
      const refX = x + bestMV.x;

      if (
        refY >= 0 &&
        refY < referenceCTUs[0].height &&
        refX >= 0 &&
        refX < referenceCTUs[0].width
      ) {
        predictedCTU.data[y * currentCTU.width + x] =
          referenceCTUs[0].data[refY * referenceCTUs[0].width + refX];
      } else {
        predictedCTU.data[y * currentCTU.width + x] = 128;
      }
    }
  }

  predictedCTU.predictionType = 'INTER';
  predictedCTU.motionVector = bestMV;
  return predictedCTU;
}

function calculateDifference(ctu1: CTU, ctu2: CTU): number {
  let diff = 0;
  for (let i = 0; i < ctu1.data.length; i++) {
    diff += Math.abs(ctu1.data[i] - ctu2.data[i]);
  }
  return diff;
}

export function encodePredict(ctus: CTU[]): CTU[] {
  if (ctus.length === 0) return [];

  const predictedCTUs: CTU[] = [];
  const ctuSize = ctus[0].width; // 첫 번째 CTU의 너비를 CTU 크기로 가정
  const frameWidth = Math.sqrt(ctus.length) * ctuSize; // 정사각형 프레임 가정

  for (let i = 0; i < ctus.length; i++) {
    const leftCTU =
      i % (frameWidth / ctuSize) === 0 ? null : predictedCTUs[i - 1];
    const topCTU =
      i < frameWidth / ctuSize ? null : predictedCTUs[i - frameWidth / ctuSize];

    const intraPredictedCTU = intraPrediction(ctus[i], leftCTU, topCTU);

    if (i > 0) {
      const referenceCTUs = predictedCTUs.slice(0, i);
      const interPredictedCTU = interPrediction(ctus[i], referenceCTUs);

      const intraDiff = calculateDifference(ctus[i], intraPredictedCTU);
      const interDiff = calculateDifference(ctus[i], interPredictedCTU);

      predictedCTUs.push(
        intraDiff < interDiff ? intraPredictedCTU : interPredictedCTU
      );
    } else {
      predictedCTUs.push(intraPredictedCTU);
    }
  }

  return predictedCTUs;
}
