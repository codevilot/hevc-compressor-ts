import { dom } from './dom';

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
    this.encodeWorker.postMessage(
      { imageDataArray: transferableArray },
      buffers
    );
  }

  decodeVideo(encodedData: any) {
    this.decodeWorker.postMessage({
      encodedData: encodedData,
      width: dom.Canvas.width,
      height: dom.Canvas.height,
    });
  }

  terminate() {
    this.encodeWorker.terminate();
    this.decodeWorker.terminate();
  }
}

export const videoProcessor = new VideoProcessor();
