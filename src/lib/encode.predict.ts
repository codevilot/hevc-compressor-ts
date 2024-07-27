import { clamp } from "./clamp";
import { CTU } from "./encode.ctu";


function applyIntraPrediction(ctu: CTU, leftCTU?: CTU, topCTU?: CTU): CTU {
  const predictedCTU = new CTU(ctu.width, ctu.height, new Uint8ClampedArray(ctu.data.length));
  predictedCTU.predictionType = 'INTRA';

  for (let y = 0; y < ctu.height; y++) {
    for (let x = 0; x < ctu.width; x++) {
      for (let c = 0; c < 4; c++) { // RGBA
        const index = (y * ctu.width + x) * 4 + c;
        let predictedValue = 128; // 기본 예측값

        if (x > 0) {
          predictedValue = predictedCTU.data[index - 4];
        } else if (y > 0) {
          predictedValue = predictedCTU.data[index - ctu.width * 4];
        } else if (leftCTU && y < leftCTU.height) {
          predictedValue = leftCTU.data[(y * leftCTU.width + leftCTU.width - 1) * 4 + c];
        } else if (topCTU && x < topCTU.width) {
          predictedValue = topCTU.data[(topCTU.height - 1) * topCTU.width * 4 + x * 4 + c];
        }

        predictedCTU.data[index] = c === 3 ? ctu.data[index] : clamp(ctu.data[index] - predictedValue, 0, 255);
      }
    }
  }

  return predictedCTU;
}

// Inter-Prediction 함수
function applyInterPrediction(currentCTU: CTU, referenceCTUs: CTU[], searchRange: number): CTU {
  const predictedCTU = new CTU(currentCTU.width, currentCTU.height, new Uint8ClampedArray(currentCTU.data.length));
  predictedCTU.predictionType = 'INTER';

  let bestMatch = { x: 0, y: 0, sad: Infinity };

  for (let dy = -searchRange; dy <= searchRange; dy++) {
    for (let dx = -searchRange; dx <= searchRange; dx++) {
      let sad = 0;
      for (let y = 0; y < currentCTU.height; y++) {
        for (let x = 0; x < currentCTU.width; x++) {
          const currentIndex = (y * currentCTU.width + x) * 4;
          const refIndex = ((y + dy) * currentCTU.width + (x + dx)) * 4;
          
          if (refIndex >= 0 && refIndex < referenceCTUs[0].data.length) {
            for (let c = 0; c < 3; c++) { // RGB만 고려
              sad += Math.abs(currentCTU.data[currentIndex + c] - referenceCTUs[0].data[refIndex + c]);
            }
          } else {
            sad += 255 * 3; // 범위를 벗어난 픽셀에 페널티 부여
          }
        }
      }

      if (sad < bestMatch.sad) {
        bestMatch = { x: dx, y: dy, sad };
      }
    }
  }

  predictedCTU.motionVector = { x: bestMatch.x, y: bestMatch.y };

  for (let y = 0; y < currentCTU.height; y++) {
    for (let x = 0; x < currentCTU.width; x++) {
      const currentIndex = (y * currentCTU.width + x) * 4;
      const refIndex = ((y + bestMatch.y) * currentCTU.width + (x + bestMatch.x)) * 4;
      
      if (refIndex >= 0 && refIndex < referenceCTUs[0].data.length) {
        for (let c = 0; c < 4; c++) {
          predictedCTU.data[currentIndex + c] = c === 3 ? currentCTU.data[currentIndex + c] :
            clamp(currentCTU.data[currentIndex + c] - referenceCTUs[0].data[refIndex + c], 0, 255);
        }
      } else {
        predictedCTU.data.set(currentCTU.data.subarray(currentIndex, currentIndex + 4), currentIndex);
      }
    }
  }

  return predictedCTU;
}

export function encodePredict(ctus: CTU[], referenceCTUs?: CTU[]): CTU[] {
  return ctus.map((ctu, index) => {
    let predictedCTU: CTU;
    if (referenceCTUs && index > 0) {
      predictedCTU = applyInterPrediction(ctu, [referenceCTUs[index]], 16);
    } else {
      const leftCTU = index > 0 ? ctus[index - 1] : undefined;
      const topCTU = index >= ctus[0].width ? ctus[index - ctus[0].width] : undefined;
      predictedCTU = applyIntraPrediction(ctu, leftCTU, topCTU);
    }
    return predictedCTU;
  });
}