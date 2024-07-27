export class CTU {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  predictionType: 'INTRA' | 'INTER' | 'NONE';
  motionVector: { x: number; y: number } | null;

  constructor(width: number, height: number, data: Uint8ClampedArray) {
    this.width = width;
    this.height = height;
    this.data = data;
    this.predictionType = 'NONE';
    this.motionVector = null;
  }
}

export function encodeCTUS(
  imageDataArray: { width: number; height: number; data: ArrayBuffer }[],
  ctuSize: number = 64
): CTU[] {
  const ctus: CTU[] = [];

  for (const imageData of imageDataArray) {
    const { width, height, data } = imageData;
    const uint8Data = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y += ctuSize) {
      for (let x = 0; x < width; x += ctuSize) {
        const ctuWidth = Math.min(ctuSize, width - x);
        const ctuHeight = Math.min(ctuSize, height - y);
        const ctuData = new Uint8ClampedArray(ctuWidth * ctuHeight * 4);

        for (let i = 0; i < ctuHeight; i++) {
          for (let j = 0; j < ctuWidth; j++) {
            const srcIndex = ((y + i) * width + (x + j)) * 4;
            const dstIndex = (i * ctuWidth + j) * 4;
            ctuData.set(uint8Data.subarray(srcIndex, srcIndex + 4), dstIndex);
          }
        }

        ctus.push(new CTU(ctuWidth, ctuHeight, ctuData));
      }
    }
  }

  return ctus;
}
