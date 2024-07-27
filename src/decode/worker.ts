import { encodedResult } from '../lib/encode';
import { decodeCtus } from './ctus';
// import { decodeDCT } from './DCT';

export const decodeCtx: Worker = self as any;
export type decodedData = {
  width: number;
  height: number;
  data: number[];
}[];
decodeCtx.addEventListener('message', async (event: MessageEvent) => {
  const { data } = event;
  const result = await decode(data.encodedData, data.width, data.height);
  decodeCtx.postMessage({ workName: 'decode-end', data: result });
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
