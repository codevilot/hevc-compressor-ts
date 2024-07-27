import { CTU, encodeCTUS } from './ctu';

export const encodeCtx: Worker = self as any;

const FPS = 30;
export type encodedResult = CTU[];

const DEFAULT_CTU_SIZE = 16;
export const encode = async (frames: ImageData[]): Promise<encodedResult> => {
  const ctus = encodeCTUS(frames, DEFAULT_CTU_SIZE);
  // const predict = encodePredict(ctus);
  // const DCT = encodeDCT(ctus);
  return ctus;
};

encodeCtx.addEventListener('message', async (event: MessageEvent) => {
  const result = await encode(event.data.imageDataArray);
  encodeCtx.postMessage({ workName: 'encode-end', data: result });
});
