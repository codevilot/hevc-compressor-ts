import { dom } from "./dom"

const isDev =true
const FPS = 30

const recomposeFrame = (frame:ImageData)=>{
  return frame
}

export const recomposeVideo= async(file: File) =>{
  let timeStamp = 0;
  const frames: ImageData[] = [];
  if(isDev){
    document.body.append( dom.Video)
    document.body.append(dom.Canvas)
  }
  
  await dom.setCanvas(file)
  while(timeStamp < 2){
    await dom.nextFrame(FPS)
    timeStamp += 1/FPS  
    const frame = dom.getFrame()
    const reconstructedFrame = recomposeFrame(frame)
    frames.push(reconstructedFrame)
  }
}
