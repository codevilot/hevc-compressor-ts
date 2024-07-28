import { dom } from './lib/dom';
import { id } from './constants';
import { createVideoFromDecodedFrames } from './lib/assembleVideo';
import { videoProcessor } from './lib/worker';
import { convertToImageDataArray } from './lib/convertToImageDataArray';
import { CTU } from './encode/ctu';
import { encodedResult } from './encode/worker';
import { decodedData } from './decode/worker';

/**
 * dom에서 얻어온 HTMLElement는 대문자로 시작한다
 */

const UploadInput = <HTMLInputElement>dom.id(id.uploadInput);
const EncodeBtn = <HTMLButtonElement>dom.id(id.encodeButton);
const DecodeBtn = <HTMLButtonElement>dom.id(id.decodeButton);

let uploadedFile: File = undefined;
let encodedData: encodedResult = undefined;
let decodeChunk: decodedData = [];
(() => {
  UploadInput.addEventListener('change', async (event: InputEvent) => {
    const target = event.target as HTMLInputElement;
    const [file] = target.files;
    if (!(file && file.type.startsWith('video/'))) return;
    uploadedFile = file;
    dom.ProcessedVideo.src = '';
    EncodeBtn.disabled = !file;
    await dom.setCanvas(file);
  });
  EncodeBtn.addEventListener('click', async () => {
    try {
      const frames = await dom.exportFrames();
      videoProcessor.encodeVideo(frames);
    } catch (e) {
      console.error(e);
    }
  });
  DecodeBtn.addEventListener('click', async () => {
    try {
      videoProcessor.decodeVideo(encodedData);
    } catch (e) {
      console.error(e);
    }
  });
  videoProcessor.encodeWorker.onmessage = (event) => {
    if (event.data.workName === 'encode-end') {
      encodedData = event.data.data;
      DecodeBtn.disabled = false;
    }
  };
  videoProcessor.decodeWorker.onmessage = (event) => {
    console.log(decodeChunk);
    if (event.data.workName === 'decode-end') {
      decodeChunk = decodeChunk.concat(event.data.data);
      if (event.data.isLastChunk) {
        const imageDataArray = convertToImageDataArray(decodeChunk);
        createVideoFromDecodedFrames(imageDataArray);
        decodeChunk = [];
      }
    }
    console.log(event.data);
  };
})();
