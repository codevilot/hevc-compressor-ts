import { CTU, encodeCTUS } from './ctu';

export const encodeCtx: Worker = self as any;

export type encodedResult = CTU[];

const DEFAULT_CTU_SIZE = 16;
let savedDataChunk: ImageData[] = [];

encodeCtx.addEventListener('message', async (event: MessageEvent) => {
  if (event.data.type === 'chunk') {
    savedDataChunk = savedDataChunk.concat(event.data.data);
    if (event.data.isLastChunk) {
      const result = await encode(savedDataChunk);
      encodeCtx.postMessage({
        workName: 'encode-end',
        data: result,
      });
      savedDataChunk = [];
    }
  }
});

export const encode = async (frames: ImageData[]): Promise<encodedResult> => {
  const ctus = encodeCTUS(frames, DEFAULT_CTU_SIZE);
  // const predict = encodePredict(ctus);
  // const DCT = encodeDCT(ctus);
  return ctus;
};
