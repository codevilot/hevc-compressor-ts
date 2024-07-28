import { FPS } from '../constants';
import { dom } from './dom';

async function assembleVideoFromFrames(
  decodedFrames: ImageData[]
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = decodedFrames[0].width;
    canvas.height = decodedFrames[0].height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
      return reject(new Error('Canvas 2D context를 생성할 수 없습니다.'));

    const stream = canvas.captureStream(FPS);
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/mp4',
    });

    mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      resolve(blob);
    };

    let startTime: number | undefined;
    const frameDuration = 1000 / FPS;
    const drawNextFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const frameIndex = Math.max(
        Math.floor(elapsedTime / frameDuration) - 2,
        0
      );
      dom.updateProgress(Math.floor(frameIndex / decodedFrames.length) * 100);
      if (frameIndex >= decodedFrames.length) return mediaRecorder.stop();
      ctx.putImageData(decodedFrames[frameIndex], 0, 0);
      requestAnimationFrame(drawNextFrame);
    };

    mediaRecorder.start();
    requestAnimationFrame(drawNextFrame);
  });
}
export async function createVideoFromDecodedFrames(decodedFrames: ImageData[]) {
  try {
    dom.openModal('Creating video...');
    const videoBlob = await assembleVideoFromFrames(decodedFrames); // 30 FPS로 설정
    const processedVideo = dom.ProcessedVideo;
    processedVideo.src = URL.createObjectURL(videoBlob);
    return new Promise((res) => {
      processedVideo.onloadeddata = () => res(dom.closeModal());
    });
  } catch (error) {
    console.error('비디오 재구성 중 오류 발생:', error);
  }
}
