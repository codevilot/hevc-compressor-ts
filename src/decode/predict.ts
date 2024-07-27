// import { clamp } from "./clamp";
// import { CTU } from "./encode.ctu";

// function decodeIntraPrediction(encodedCTU: CTU, leftCTU?: CTU, topCTU?: CTU): CTU {
//   const decodedCTU = new CTU(encodedCTU.width, encodedCTU.height, new Uint8ClampedArray(encodedCTU.data.length));

//   for (let y = 0; y < encodedCTU.height; y++) {
//     for (let x = 0; x < encodedCTU.width; x++) {
//       for (let c = 0; c < 4; c++) { // RGBA
//         const index = (y * encodedCTU.width + x) * 4 + c;
//         let predictedValue = 128; // 기본 예측값

//         if (x > 0) {
//           predictedValue = decodedCTU.data[index - 4];
//         } else if (y > 0) {
//           predictedValue = decodedCTU.data[index - encodedCTU.width * 4];
//         } else if (leftCTU && y < leftCTU.height) {
//           predictedValue = leftCTU.data[(y * leftCTU.width + leftCTU.width - 1) * 4 + c];
//         } else if (topCTU && x < topCTU.width) {
//           predictedValue = topCTU.data[(topCTU.height - 1) * topCTU.width * 4 + x * 4 + c];
//         }

//         decodedCTU.data[index] = c === 3 ? encodedCTU.data[index] : clamp(encodedCTU.data[index] + predictedValue, 0, 255);
//       }
//     }
//   }

//   return decodedCTU;
// }

// function decodeInterPrediction(encodedCTU: CTU, referenceCTU: CTU): CTU {
//   const decodedCTU = new CTU(encodedCTU.width, encodedCTU.height, new Uint8ClampedArray(encodedCTU.data.length));
//   const motionVector = encodedCTU.motionVector!;

//   for (let y = 0; y < encodedCTU.height; y++) {
//     for (let x = 0; x < encodedCTU.width; x++) {
//       const currentIndex = (y * encodedCTU.width + x) * 4;
//       const refIndex = ((y + motionVector.y) * referenceCTU.width + (x + motionVector.x)) * 4;

//       if (refIndex >= 0 && refIndex < referenceCTU.data.length) {
//         for (let c = 0; c < 4; c++) {
//           decodedCTU.data[currentIndex + c] = c === 3 ? encodedCTU.data[currentIndex + c] :
//             clamp(encodedCTU.data[currentIndex + c] + referenceCTU.data[refIndex + c], 0, 255);
//         }
//       } else {
//         decodedCTU.data.set(encodedCTU.data.subarray(currentIndex, currentIndex + 4), currentIndex);
//       }
//     }
//   }

//   return decodedCTU;
// }

// export function decodePredict(encodedCTUs: CTU[], referenceCTUs?: CTU[]): CTU[] {
//   return encodedCTUs.map((encodedCTU, index) => {
//     if (encodedCTU.predictionType === 'INTER' && referenceCTUs && index > 0) {
//       return decodeInterPrediction(encodedCTU, referenceCTUs[index]);
//     } else {
//       const leftCTU = index > 0 ? encodedCTUs[index - 1] : undefined;
//       const topCTU = index >= encodedCTUs[0].width ? encodedCTUs[index - encodedCTUs[0].width] : undefined;
//       return decodeIntraPrediction(encodedCTU, leftCTU, topCTU);
//     }
//   });
// }
