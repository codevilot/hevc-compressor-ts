import { dom } from './dom';

class CTU {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}
}

function rgb2ycbcr(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return [y, cb, cr];
}

function ycbcr2rgb(
  y: number,
  cb: number,
  cr: number
): [number, number, number] {
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  ];
}

function dct(block: number[][]): number[][] {
  const N = block.length;
  const result = Array(N)
    .fill(0)
    .map(() => Array(N).fill(0));

  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum +=
            block[x][y] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      result[u][v] = (2 / N) * cu * cv * sum;
    }
  }
  return result;
}

function idct(block: number[][]): number[][] {
  const N = block.length;
  const result = Array(N)
    .fill(0)
    .map(() => Array(N).fill(0));

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      let sum = 0;
      for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
          const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
          const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
          sum +=
            cu *
            cv *
            block[u][v] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
        }
      }
      result[x][y] = (2 / N) * sum;
    }
  }
  return result;
}

function quantize(block: number[][], factor: number): number[][] {
  return block.map((row) => row.map((val) => Math.round(val / factor)));
}

function dequantize(block: number[][], factor: number): number[][] {
  return block.map((row) => row.map((val) => val * factor));
}

function intraPrediction(
  block: number[][],
  top: number[],
  left: number[]
): number[][] {
  const size = block.length;
  const predicted = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));

  const dcValue = Math.round(
    (top.reduce((a, b) => a + b, 0) + left.reduce((a, b) => a + b, 0)) /
      (2 * size)
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x === 0 && y === 0) {
        predicted[y][x] = dcValue;
      } else if (y === 0) {
        predicted[y][x] = top[x];
      } else if (x === 0) {
        predicted[y][x] = left[y];
      } else {
        predicted[y][x] = Math.round(
          (predicted[y][x - 1] + predicted[y - 1][x]) / 2
        );
      }
    }
  }

  return predicted;
}

function interPrediction(
  currentBlock: number[][],
  referenceBlock: number[][]
): number[][] {
  const size = currentBlock.length;
  const predicted = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      predicted[y][x] = referenceBlock[y][x];
    }
  }

  return predicted;
}

function encode(frame: ImageData, previousFrame?: ImageData): Float32Array {
  const width = frame.width;
  const height = frame.height;
  const ctuSize = 8;

  const ctus: CTU[] = [];
  for (let y = 0; y < height; y += ctuSize) {
    for (let x = 0; x < width; x += ctuSize) {
      ctus.push(
        new CTU(
          x,
          y,
          Math.min(ctuSize, width - x),
          Math.min(ctuSize, height - y)
        )
      );
    }
  }

  const encodedData: number[] = [];

  for (const ctu of ctus) {
    const blockY: number[][] = Array(ctuSize)
      .fill(0)
      .map(() => Array(ctuSize).fill(0));
    const blockCb: number[][] = Array(ctuSize)
      .fill(0)
      .map(() => Array(ctuSize).fill(0));
    const blockCr: number[][] = Array(ctuSize)
      .fill(0)
      .map(() => Array(ctuSize).fill(0));

    for (let y = 0; y < ctu.height; y++) {
      for (let x = 0; x < ctu.width; x++) {
        const index = ((ctu.y + y) * width + (ctu.x + x)) * 4;
        const [yVal, cbVal, crVal] = rgb2ycbcr(
          frame.data[index],
          frame.data[index + 1],
          frame.data[index + 2]
        );
        blockY[y][x] = yVal;
        blockCb[y][x] = cbVal - 128;
        blockCr[y][x] = crVal - 128;
      }
    }

    const topY =
      ctu.y > 0
        ? Array(ctuSize)
            .fill(0)
            .map((_, i) => frame.data[((ctu.y - 1) * width + ctu.x + i) * 4])
        : Array(ctuSize).fill(0);
    const leftY =
      ctu.x > 0
        ? Array(ctuSize)
            .fill(0)
            .map((_, i) => frame.data[((ctu.y + i) * width + ctu.x - 1) * 4])
        : Array(ctuSize).fill(0);
    const predictedY = intraPrediction(blockY, topY, leftY);

    let residualY = blockY.map((row, y) =>
      row.map((val, x) => val - predictedY[y][x])
    );

    if (previousFrame) {
      const referenceBlockY = Array(ctuSize)
        .fill(0)
        .map(() => Array(ctuSize).fill(0));
      for (let y = 0; y < ctu.height; y++) {
        for (let x = 0; x < ctu.width; x++) {
          const index = ((ctu.y + y) * width + (ctu.x + x)) * 4;
          referenceBlockY[y][x] = previousFrame.data[index];
        }
      }
      const interPredictedY = interPrediction(blockY, referenceBlockY);
      const interResidualY = blockY.map((row, y) =>
        row.map((val, x) => val - interPredictedY[y][x])
      );

      // Choose the better prediction (intra or inter)
      if (
        Math.abs(interResidualY.flat().reduce((a, b) => a + b, 0)) <
        Math.abs(residualY.flat().reduce((a, b) => a + b, 0))
      ) {
        residualY = interResidualY;
        encodedData.push(1); // Inter prediction flag
      } else {
        encodedData.push(0); // Intra prediction flag
      }
    } else {
      encodedData.push(0); // Intra prediction flag for the first frame
    }

    const dctY = dct(residualY);
    const dctCb = dct(blockCb);
    const dctCr = dct(blockCr);

    const quantizationFactorY = 10;
    const quantizationFactorC = 20;
    const quantizedY = quantize(dctY, quantizationFactorY);
    const quantizedCb = quantize(dctCb, quantizationFactorC);
    const quantizedCr = quantize(dctCr, quantizationFactorC);

    encodedData.push(
      ...quantizedY.flat(),
      ...quantizedCb.flat(),
      ...quantizedCr.flat()
    );
  }

  return new Float32Array(encodedData);
}

function decode(
  encodedData: Float32Array,
  width: number,
  height: number,
  previousFrame?: ImageData
): ImageData {
  const ctuSize = 8;
  const decodedFrame = new ImageData(width, height);

  let dataIndex = 0;
  for (let y = 0; y < height; y += ctuSize) {
    for (let x = 0; x < width; x += ctuSize) {
      const ctuWidth = Math.min(ctuSize, width - x);
      const ctuHeight = Math.min(ctuSize, height - y);

      const predictionFlag = encodedData[dataIndex++];

      const quantizedY: number[][] = Array(ctuSize)
        .fill(0)
        .map(() => Array(ctuSize).fill(0));
      const quantizedCb: number[][] = Array(ctuSize)
        .fill(0)
        .map(() => Array(ctuSize).fill(0));
      const quantizedCr: number[][] = Array(ctuSize)
        .fill(0)
        .map(() => Array(ctuSize).fill(0));

      for (let i = 0; i < ctuSize; i++) {
        for (let j = 0; j < ctuSize; j++) {
          quantizedY[i][j] = encodedData[dataIndex++];
        }
      }
      for (let i = 0; i < ctuSize; i++) {
        for (let j = 0; j < ctuSize; j++) {
          quantizedCb[i][j] = encodedData[dataIndex++];
        }
      }
      for (let i = 0; i < ctuSize; i++) {
        for (let j = 0; j < ctuSize; j++) {
          quantizedCr[i][j] = encodedData[dataIndex++];
        }
      }

      const quantizationFactorY = 10;
      const quantizationFactorC = 20;
      const dequantizedY = dequantize(quantizedY, quantizationFactorY);
      const dequantizedCb = dequantize(quantizedCb, quantizationFactorC);
      const dequantizedCr = dequantize(quantizedCr, quantizationFactorC);

      const idctY = idct(dequantizedY);
      const idctCb = idct(dequantizedCb);
      const idctCr = idct(dequantizedCr);

      let predictedY: number[][];

      if (predictionFlag === 0) {
        // Intra prediction
        const topY =
          y > 0
            ? Array(ctuSize)
                .fill(0)
                .map((_, i) => decodedFrame.data[((y - 1) * width + x + i) * 4])
            : Array(ctuSize).fill(0);
        const leftY =
          x > 0
            ? Array(ctuSize)
                .fill(0)
                .map((_, i) => decodedFrame.data[((y + i) * width + x - 1) * 4])
            : Array(ctuSize).fill(0);
        predictedY = intraPrediction(idctY, topY, leftY);
      } else {
        // Inter prediction
        if (!previousFrame)
          throw new Error('Previous frame is required for inter prediction');
        const referenceBlockY = Array(ctuSize)
          .fill(0)
          .map(() => Array(ctuSize).fill(0));
        for (let i = 0; i < ctuHeight; i++) {
          for (let j = 0; j < ctuWidth; j++) {
            const index = ((y + i) * width + (x + j)) * 4;
            referenceBlockY[i][j] = previousFrame.data[index];
          }
        }
        predictedY = interPrediction(idctY, referenceBlockY);
      }

      const reconstructedY = idctY.map((row, i) =>
        row.map((val, j) => val + predictedY[i][j])
      );

      for (let i = 0; i < ctuHeight; i++) {
        for (let j = 0; j < ctuWidth; j++) {
          const index = ((y + i) * width + (x + j)) * 4;
          const [r, g, b] = ycbcr2rgb(
            reconstructedY[i][j],
            idctCb[i][j] + 128,
            idctCr[i][j] + 128
          );
          decodedFrame.data[index] = r;
          decodedFrame.data[index + 1] = g;
          decodedFrame.data[index + 2] = b;
          decodedFrame.data[index + 3] = 255;
        }
      }
    }
  }

  return decodedFrame;
}

export async function videoRecomposition(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      canvas.classList.add('w-6/12');
      dom.id('editor').appendChild(canvas);

      const frameRate = 30;
      const totalFrames = 30;

      const encodedFrames: Float32Array[] = [];
      let previousFrame: ImageData | undefined;

      let currentFrame = 0;
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const encodedFrame = encode(imageData, previousFrame);
        encodedFrames.push(encodedFrame);

        const debugCanvas = document.createElement('canvas');
        debugCanvas.width = canvas.width;
        debugCanvas.height = canvas.height;
        const debugCtx = debugCanvas.getContext('2d')!;
        const decodedFrame = decode(
          encodedFrame,
          canvas.width,
          canvas.height,
          previousFrame
        );
        debugCtx.putImageData(decodedFrame, 0, 0);
        dom.id('editor').appendChild(debugCanvas);

        previousFrame = imageData;
        currentFrame++;

        if (currentFrame < totalFrames) {
          video.currentTime = currentFrame / frameRate;
        } else {
          const decodedFrames: ImageData[] = [];
          let prevDecodedFrame: ImageData | undefined;
          for (let i = 0; i < encodedFrames.length; i++) {
            const decodedFrame = decode(
              encodedFrames[i],
              canvas.width,
              canvas.height,
              prevDecodedFrame
            );
            decodedFrames.push(decodedFrame);
            prevDecodedFrame = decodedFrame;
          }

          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = canvas.width;
          outputCanvas.height = canvas.height;
          const outputCtx = outputCanvas.getContext('2d')!;

          const stream = outputCanvas.captureStream(frameRate);
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 8000000, // 8 Mbps
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (event) => {
            chunks.push(event.data);
          };

          recorder.onstop = () => {
            const video = document.createElement('video');
            video.width = canvas.width;
            video.height = canvas.height;
            video.controls = true;
            dom.id('editor').appendChild(video);
            const blob = new Blob(chunks, { type: 'video/webm' });
            video.src = URL.createObjectURL(blob);
            resolve(blob);
          };

          recorder.start();

          let frameIndex = 0;
          function drawNextFrame() {
            if (frameIndex < decodedFrames.length) {
              outputCtx.putImageData(decodedFrames[frameIndex], 0, 0);
              frameIndex++;
              setTimeout(drawNextFrame, 1000 / frameRate);
            } else {
              recorder.stop();
            }
          }

          drawNextFrame();
        }
      };

      video.currentTime = 0;
    };
    video.onerror = reject;
  });
}
