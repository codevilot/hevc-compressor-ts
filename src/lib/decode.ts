import { decodeCtus } from './decode.ctus';
import { decodeDCT } from './decode.DCT';
import { encodedResult } from './encode';
import { CTU } from './encode.ctu';

// 메인 디코딩 함수
export async function decode(encodedCTUs: encodedResult): Promise<ImageData[]> {
  // const DecodedDCT = decodeDCT(encodedCTUs);
  const imageData = decodeCtus(encodedCTUs);

  return imageData;
}
