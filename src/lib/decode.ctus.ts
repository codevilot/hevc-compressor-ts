import { dom } from './dom';
import { CTU } from './encode.ctu';

export function decodeCtus(ctus: CTU[]): ImageData[] {
  const originalWidth = dom.Canvas.width;
  const originalHeight = dom.Canvas.height;
  const imageDataArray: ImageData[] = [];
  let currentImageData = new ImageData(originalWidth, originalHeight);
  let x = 0;
  let y = 0;

  for (const ctu of ctus) {
    for (let i = 0; i < ctu.height; i++) {
      for (let j = 0; j < ctu.width; j++) {
        const srcIndex = (i * ctu.width + j) * 4;
        const dstIndex = ((y + i) * originalWidth + (x + j)) * 4;
        currentImageData.data.set(
          ctu.data.subarray(srcIndex, srcIndex + 4),
          dstIndex
        );
      }
    }

    x += ctu.width;
    if (x >= originalWidth) {
      x = 0;
      y += ctu.height;
      if (y >= originalHeight) {
        imageDataArray.push(currentImageData);
        currentImageData = new ImageData(originalWidth, originalHeight);
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
