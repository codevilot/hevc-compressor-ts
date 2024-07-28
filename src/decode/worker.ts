import { encodedResult } from '../encode/worker';
import { decodeCtus } from './ctus';
// import { decodeDCT } from './DCT';

export const decodeCtx: Worker = self as any;
export type decodedData = {
  width: number;
  height: number;
  data: number[];
}[];

let savedDataChunk: encodedResult = [];

const CHUNK_SIZE = 1; // 적절한 크기로 조정

decodeCtx.addEventListener('message', async (event: MessageEvent) => {
  if (event.data.type === 'chunk') {
    savedDataChunk = savedDataChunk.concat(event.data.encodedData);
    if (event.data.isLastChunk) {
      const { data } = event;
      const result = await decode(savedDataChunk, data.width, data.height);

      for (let i = 0; i < result.length; i += CHUNK_SIZE) {
        const chunk = result.slice(i, i + CHUNK_SIZE);
        decodeCtx.postMessage({
          workName: 'decode-end',
          data: chunk,
          isLastChunk: i + CHUNK_SIZE >= result.length,
        });
      }
      savedDataChunk = [];
    }
  }
});

export async function decode(
  encodedCTUs: encodedResult,
  width: number,
  height: number
): Promise<decodedData> {
  // const DecodedDCT = decodeDCT(encodedCTUs);
  const imageData = decodeCtus(encodedCTUs, width, height);
  return imageData;
}
