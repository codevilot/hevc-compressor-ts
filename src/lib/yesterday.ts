import { dom } from './dom';

const FPS = 30;
const VIDEO_TAIL = 0.2;

class CTU {
  constructor(
    public width: number,
    public height: number,
    public pixels: Uint8ClampedArray
  ) {}
}

function splitIntoCTUs(frame: ImageData): CTU[] {
  const ctuSize = 32;
  const ctus: CTU[] = [];
  for (let y = 0; y < frame.height; y += ctuSize) {
    for (let x = 0; x < frame.width; x += ctuSize) {
      const ctuWidth = Math.min(ctuSize, frame.width - x);
      const ctuHeight = Math.min(ctuSize, frame.height - y);
      const pixels = new Uint8ClampedArray(ctuWidth * ctuHeight * 4);
      for (let j = 0; j < ctuHeight; j++) {
        for (let i = 0; i < ctuWidth; i++) {
          const srcIndex = ((y + j) * frame.width + (x + i)) * 4;
          const destIndex = (j * ctuWidth + i) * 4;
          pixels.set(frame.data.slice(srcIndex, srcIndex + 4), destIndex);
        }
      }
      ctus.push(new CTU(ctuWidth, ctuHeight, pixels));
    }
  }
  return ctus;
}

function performIntraPrediction(ctu: CTU): CTU {
  // Simplified intra-prediction: use top-left pixel as prediction
  const predictedPixels = new Uint8ClampedArray(ctu.pixels.length);
  const topLeftPixel = ctu.pixels.slice(0, 4);
  for (let i = 0; i < predictedPixels.length; i += 4) {
    predictedPixels.set(topLeftPixel, i);
  }
  return new CTU(ctu.width, ctu.height, predictedPixels);
}

function performInterPrediction(currentCTU: CTU, referenceCTU: CTU): CTU {
  // Simplified inter-prediction: use average of current and reference CTU
  const predictedPixels = new Uint8ClampedArray(currentCTU.pixels.length);
  for (let i = 0; i < predictedPixels.length; i++) {
    predictedPixels[i] = Math.round(
      (currentCTU.pixels[i] + referenceCTU.pixels[i]) / 2
    );
  }
  return new CTU(currentCTU.width, currentCTU.height, predictedPixels);
}

function transformAndQuantize(ctus: CTU[]): number[][][][] {
  const quantizationFactor = 0.1;
  return ctus.map((ctu) => {
    const dctBlocks: number[][][] = [];
    for (let y = 0; y < ctu.height; y += 8) {
      for (let x = 0; x < ctu.width; x += 8) {
        const block = extractBlock(ctu, x, y);
        const dctBlock = block.map((channel) => applyDCT(channel));
        const quantizedBlock = dctBlock.map((channel) =>
          quantize(channel, quantizationFactor)
        );
        dctBlocks.push(quantizedBlock);
      }
    }
    return dctBlocks;
  });
}

function extractBlock(ctu: CTU, x: number, y: number): number[][] {
  const block: number[][] = [[], [], []];
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const index = ((y + j) * ctu.width + (x + i)) * 4;
      block[0].push(ctu.pixels[index]);
      block[1].push(ctu.pixels[index + 1]);
      block[2].push(ctu.pixels[index + 2]);
    }
  }
  return block;
}

function applyDCT(channel: number[]): number[] {
  const N = 8;
  const output = new Array(64).fill(0);
  for (let v = 0; v < N; v++) {
    for (let u = 0; u < N; u++) {
      let sum = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const cos1 = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
          const cos2 = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
          sum += channel[y * N + x] * cos1 * cos2;
        }
      }
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      output[v * N + u] = (2 / N) * cu * cv * sum;
    }
  }
  return output;
}

function quantize(channel: number[], factor: number): number[] {
  return channel.map((value) => Math.round(value * factor));
}

class CABACEncoder {
  private bitstream: number[] = [];
  private context: number[] = new Array(256).fill(0);

  encode(value: number): void {
    const contextIndex = value % this.context.length;
    const probability = this.context[contextIndex] / 255;
    const encodedBit = Math.random() < probability ? 1 : 0;
    this.bitstream.push(encodedBit);
    this.updateContext(contextIndex, encodedBit);
  }

  private updateContext(index: number, bit: number): void {
    this.context[index] = (this.context[index] * 0.9 + bit * 255 * 0.1) | 0;
  }

  getBitstream(): Uint8Array {
    const byteLength = Math.ceil(this.bitstream.length / 8);
    const uint8Array = new Uint8Array(byteLength);
    for (let i = 0; i < this.bitstream.length; i++) {
      if (this.bitstream[i]) {
        uint8Array[i >> 3] |= 1 << (7 - (i & 7));
      }
    }
    return uint8Array;
  }
}

class CABACDecoder {
  private bitstream: number[];
  private context: number[] = new Array(256).fill(0);
  private index = 0;

  constructor(bitstream: Uint8Array) {
    this.bitstream = Array.from(bitstream).flatMap((byte) =>
      Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
    );
  }

  decode(): number {
    if (this.index >= this.bitstream.length) return -1;
    const contextIndex = this.index % this.context.length;
    const probability = this.context[contextIndex] / 255;
    const decodedBit = this.bitstream[this.index++];
    this.updateContext(contextIndex, decodedBit);
    return decodedBit === 1
      ? Math.floor(probability * 255)
      : Math.floor((1 - probability) * 255);
  }

  private updateContext(index: number, bit: number): void {
    this.context[index] = (this.context[index] * 0.9 + bit * 255 * 0.1) | 0;
  }
}

function performEntropyCoding(transformedCTUs: number[][][][]): Uint8Array {
  const cabacEncoder = new CABACEncoder();
  transformedCTUs.flat(3).forEach((value) => cabacEncoder.encode(value + 128));
  return cabacEncoder.getBitstream();
}

function decodeBitstream(bitstream: Uint8Array): CTU[] {
  const cabacDecoder = new CABACDecoder(bitstream);
  const transformedCTUs: number[][][][] = [];
  let currentCTU: number[][][] = [];
  let currentBlock: number[][] = [];
  let currentChannel: number[] = [];

  while (true) {
    const value = cabacDecoder.decode();
    if (value === -1) break;
    currentChannel.push(value - 128);

    if (currentChannel.length === 64) {
      currentBlock.push(currentChannel);
      currentChannel = [];
    }

    if (currentBlock.length === 3) {
      currentCTU.push(currentBlock);
      currentBlock = [];
    }

    if (currentCTU.length === 16) {
      transformedCTUs.push(currentCTU);
      currentCTU = [];
    }
  }

  return transformedCTUs.map((ctuBlocks) => {
    const pixels = new Uint8ClampedArray(32 * 32 * 4);
    ctuBlocks.forEach((block, blockIndex) => {
      const dequantizedBlock = block.map((channel) => dequantize(channel, 0.1));
      const idctBlock = dequantizedBlock.map((channel) => applyIDCT(channel));
      const x = (blockIndex % 4) * 8;
      const y = Math.floor(blockIndex / 4) * 8;
      for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
          const index = ((y + j) * 32 + (x + i)) * 4;
          pixels[index] = Math.max(
            0,
            Math.min(255, Math.round(idctBlock[0][j * 8 + i]))
          );
          pixels[index + 1] = Math.max(
            0,
            Math.min(255, Math.round(idctBlock[1][j * 8 + i]))
          );
          pixels[index + 2] = Math.max(
            0,
            Math.min(255, Math.round(idctBlock[2][j * 8 + i]))
          );
          pixels[index + 3] = 255;
        }
      }
    });
    return new CTU(32, 32, pixels);
  });
}

function dequantize(channel: number[], factor: number): number[] {
  return channel.map((value) => value / factor);
}

function applyIDCT(channel: number[]): number[] {
  const N = 8;
  const output = new Array(64).fill(0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let sum = 0;
      for (let v = 0; v < N; v++) {
        for (let u = 0; u < N; u++) {
          const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
          const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
          const cos1 = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
          const cos2 = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
          sum += cu * cv * channel[v * N + u] * cos1 * cos2;
        }
      }
      output[y * N + x] = (2 / N) * sum;
    }
  }
  return output;
}

function reconstructFrame(
  ctus: CTU[],
  width: number,
  height: number
): ImageData {
  const frameData = new Uint8ClampedArray(width * height * 4);
  let ctuIndex = 0;
  for (let y = 0; y < height; y += 32) {
    for (let x = 0; x < width; x += 32) {
      const ctu = ctus[ctuIndex++];
      if (!ctu?.height || !ctu?.width) continue;
      for (let j = 0; j < ctu.height; j++) {
        for (let i = 0; i < ctu.width; i++) {
          const srcIndex = (j * ctu.width + i) * 4;
          const destIndex = ((y + j) * width + (x + i)) * 4;
          frameData.set(ctu.pixels.slice(srcIndex, srcIndex + 4), destIndex);
        }
      }
    }
  }
  return new ImageData(frameData, width, height);
}

async function displayReconstructedVideo(
  frames: ImageData[],
  canvas: HTMLCanvasElement
): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get 2D context');

    const video = document.createElement('video');
    video.width = canvas.width;
    video.height = canvas.height;
    video.controls = true;
    document.body.appendChild(video);

    const stream = canvas.captureStream(FPS);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      video.src = URL.createObjectURL(blob);
      console.log('Video reconstruction completed');
      resolve();
    };

    mediaRecorder.start();

    let frameIndex = 0;
    const frameDuration = 1000 / FPS;
    let lastFrameTime = performance.now();

    function renderFrame(currentTime: number) {
      if (frameIndex >= frames.length) return mediaRecorder.stop();

      if (currentTime - lastFrameTime >= frameDuration) {
        ctx.putImageData(frames[frameIndex], 0, 0);
        frameIndex++;
        lastFrameTime = currentTime;
      }

      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
  });
}

const frameRecomposition = (frame: ImageData, previousFrame?: ImageData) => {
  const ctus = splitIntoCTUs(frame);
  const predictedCTUs = ctus.map((ctu, index) => {
    if (previousFrame) {
      const previousCTUs = splitIntoCTUs(previousFrame);
      return performInterPrediction(ctu, previousCTUs[index]);
    } else {
      return performIntraPrediction(ctu);
    }
  });
  const transformedCTUs = transformAndQuantize(predictedCTUs);
  const encodedBitstream = performEntropyCoding(transformedCTUs);
  const decodedCTUs = decodeBitstream(encodedBitstream);
  const reconstructedFrame = reconstructFrame(
    decodedCTUs,
    frame.width,
    frame.height
  );
  return reconstructedFrame;
};

export async function videoRecomposition(file: File): Promise<void> {
  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const frames: ImageData[] = [];
    const canvas = document.createElement('canvas');
    canvas.classList.add('w-6/12');
    dom.id('editor').appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let previousFrame: ImageData | undefined;

    while (video.currentTime < VIDEO_TAIL) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const reconstructedFrame = frameRecomposition(imageData, previousFrame);
      frames.push(reconstructedFrame);
      previousFrame = imageData;
      console.log(
        `Frame captured at ${video.currentTime}s, frame's length: ${frames.length}`
      );

      await new Promise((resolve) => {
        video.onseeked = resolve;
        video.currentTime += 1 / FPS;
      });
    }

    await displayReconstructedVideo(frames, canvas);
    console.log(`Total frames captured: ${frames.length}`);
  } catch (error) {
    console.error('Error in video recomposition:', error);
  }
}
