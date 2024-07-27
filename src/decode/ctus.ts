import { CTU } from '../encode/ctu';

export function decodeCtus(
  ctus: CTU[],
  originalWidth: number,
  originalHeight: number
): { width: number; height: number; data: number[] }[] {
  const imageDataArray: { width: number; height: number; data: number[] }[] =
    [];
  let currentImageData = {
    width: originalWidth,
    height: originalHeight,
    data: new Array(originalWidth * originalHeight * 4).fill(0),
  };
  let x = 0;
  let y = 0;

  for (const ctu of ctus) {
    for (let i = 0; i < ctu.height; i++) {
      for (let j = 0; j < ctu.width; j++) {
        const srcIndex = (i * ctu.width + j) * 4;
        const dstIndex = ((y + i) * originalWidth + (x + j)) * 4;
        for (let k = 0; k < 4; k++) {
          currentImageData.data[dstIndex + k] = ctu.data[srcIndex + k];
        }
      }
    }

    x += ctu.width;
    if (x >= originalWidth) {
      x = 0;
      y += ctu.height;
      if (y >= originalHeight) {
        imageDataArray.push(currentImageData);
        currentImageData = {
          width: originalWidth,
          height: originalHeight,
          data: new Array(originalWidth * originalHeight * 4).fill(0),
        };
        x = 0;
        y = 0;
      }
    }
  }

  if (y > 0 || x > 0) {
    imageDataArray.push(currentImageData);
  }

  return imageDataArray;
}
