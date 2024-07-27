import { decodedData } from '../decode/worker';

export function convertToImageDataArray(decodedData: decodedData): ImageData[] {
  console.log(decodedData);
  return decodedData.map((item) => {
    if (item.data.length !== item.width * item.height * 4) {
      throw new Error('Invalid data length for image dimensions');
    }
    const uint8Array = new Uint8ClampedArray(item.data);
    return new ImageData(uint8Array, item.width, item.height);
  });
}
