import { dom } from './lib/dom';
import { id } from './constants';
import { recomposeVideo } from './lib/Recomposition';

/**
 * dom에서 얻어온 HTMLElement는 대문자로 시작한다
 */
const UploadInput = <HTMLInputElement>dom.id(id.uploadInput);

(() => {
  UploadInput.addEventListener('change', async (event: InputEvent) => {
    const target = event.target as HTMLInputElement;
    const [file] = target.files;
    if (!(file && file.type.startsWith('video/'))) return;
    await recomposeVideo(file);
  });
})();
