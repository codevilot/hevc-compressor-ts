import { dom } from './dom';
import { encodeCTUS } from './encode.ctu';
import { encodeDCT } from './encode.DCT';

const FPS = 30;

export const exportFrames = async (file: File): Promise<ImageData[]> => {
  let timeStamp = 0;
  const frames: ImageData[] = [];

  await dom.setCanvas(file);
  // Frame Extraction
  while (timeStamp < dom.Video.duration) {
    await dom.nextFrame(FPS);
    timeStamp += 1 / FPS;
    const frame = dom.getFrame();
    frames.push(frame);
  }
  return frames;
};
const DEFAULT_CTU_SIZE = 16;
export const encode = async (file: File) => {
  const frames = await exportFrames(file);
  const ctus = encodeCTUS(frames, DEFAULT_CTU_SIZE);
  // const predict = encodePredict(ctus);
  // const DCT = encodeDCT(ctus);
  return ctus;
};
