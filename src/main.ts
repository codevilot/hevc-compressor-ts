import { dom } from './lib/dom';
import { id } from './constants';
import { videoRecomposition } from './lib/videoRecomposition';

/**
 * dom에서 얻어온 HTMLElement는 대문자로 시작한다
 */
const UploadInput = <HTMLInputElement>dom.id(id.uploadInput);
const RawVideo = <HTMLVideoElement>dom.id(id.rawVideo);

const setVideo = (file: File) => {
  const rawVideoSrc = URL.createObjectURL(file);
  RawVideo.src = rawVideoSrc;
};

(() => {
  UploadInput.addEventListener('change', async (event: InputEvent) => {
    const target = event.target as HTMLInputElement;
    const [file] = target.files;

    if (!(file && file.type.startsWith('video/'))) return;
    setVideo(file);
    await videoRecomposition(file);
  });
})();
