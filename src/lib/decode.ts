import { decodeCtus } from './decode.ctus';
import { decodeDCT } from './decode.DCT';
import { CTU } from './encode.ctu';

// 메인 디코딩 함수
export async function decode(encodedCTUs: CTU[]): Promise<ImageData[]> {
  // const DecodedDCT = decodeDCT(encodedCTUs);
  const imageData = decodeCtus(encodedCTUs);

  return imageData;
}
