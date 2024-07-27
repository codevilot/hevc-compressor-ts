import { dom } from './lib/dom';
import { id } from './constants';
import { encode, encodedResult } from './lib/encode';
import { decode } from './lib/decode';
import { createVideoFromDecodedFrames } from './lib/assembleVideo';

/**
 * dom에서 얻어온 HTMLElement는 대문자로 시작한다
 */
const UploadInput = <HTMLInputElement>dom.id(id.uploadInput);
const EncodeBtn = <HTMLButtonElement>dom.id(id.encodeButton);
const DecodeBtn = <HTMLButtonElement>dom.id(id.decodeButton);

let uploadedFile: File = undefined;
let encodedData: encodedResult = undefined;

(() => {
  UploadInput.addEventListener('change', async (event: InputEvent) => {
    const target = event.target as HTMLInputElement;
    const [file] = target.files;
    if (!(file && file.type.startsWith('video/'))) return;
    dom.ProcessedVideo.src = '';
    EncodeBtn.disabled = !file;
    await dom.setCanvas(file);
  });
  EncodeBtn.addEventListener('click', async () => {
    try {
      encodedData = await encode(uploadedFile);
      DecodeBtn.disabled = false;
    } catch (e) {
      console.error(e);
    }
  });
  DecodeBtn.addEventListener('click', async () => {
    try {
      const decodedData = await decode(encodedData);
      createVideoFromDecodedFrames(decodedData);
    } catch (e) {
      console.error(e);
    }
  });
})();
