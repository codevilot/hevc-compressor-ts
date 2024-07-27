import { decodeCtus } from "./decode.ctus";
import { decodeDCT } from "./decode.DCT";


// 메인 디코딩 함수
export async function decode(encodedCTUs: number[][][][]): Promise<ImageData[]> {
    const DecodedDCT = decodeDCT(encodedCTUs)
    const imageData = decodeCtus(DecodedDCT)

  return imageData;
}

