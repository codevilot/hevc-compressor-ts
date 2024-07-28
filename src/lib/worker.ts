import { encodedResult } from '../encode/worker';
import { dom } from './dom';
const CHUNK_SIZE = 1000;
class VideoProcessor {
  public encodeWorker: Worker;
  public decodeWorker: Worker;

  constructor() {
    this.encodeWorker = new Worker(
      new URL('../encode/worker.ts', import.meta.url)
    );
    this.decodeWorker = new Worker(
      new URL('../decode/worker.ts', import.meta.url)
    );
  }

  async encodeVideo(frames: ImageData[]) {
    const transferableArray = frames.map((imageData: ImageData) => ({
      width: imageData.width,
      height: imageData.height,
      data: imageData.data.buffer,
    }));
    const buffers = transferableArray.map((item) => item.data);
    for (let i = 0; i < buffers.length; i += CHUNK_SIZE) {
      this.encodeWorker.postMessage(
        {
          type: 'chunk',
          data: transferableArray.slice(i, i + CHUNK_SIZE),
          isLastChunk: i + CHUNK_SIZE >= buffers.length,
        },
        buffers.slice(i, i + CHUNK_SIZE)
      );
    }
  }

  public decodeVideo(encodedData: encodedResult) {
    for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
      const progressStep = Math.floor((i / encodedData.length) * 100);
      dom.updateProgress(progressStep);
      this.decodeWorker.postMessage({
        type: 'chunk',
        encodedData: encodedData.slice(i, i + CHUNK_SIZE),
        width: dom.Canvas.width,
        height: dom.Canvas.height,
        isLastChunk: i + CHUNK_SIZE >= encodedData.length,
      });
    }
  }

  terminate() {
    this.encodeWorker.terminate();
    this.decodeWorker.terminate();
  }
}

export const videoProcessor = new VideoProcessor();
