# Video Encoder TS

The main objective of this project is to implement a simplified version of the H.265/HEVC video codec using TypeScript.

## Installation and Setup

To get started with this project, follow these steps:

```
//1. Clone the repository:
git clone https://github.com/codevilot/video-encoder-ts
//2. Navigate to the project directory:
cd video-encoder-ts
//3. Install dependencies:
pnpm install
//4. Start the project:
pnpm start
```

## Key Features

1. **Frame Extraction and Assembly**: Extract frames from video files and reassemble frames back into video.
2. **Block Partitioning**: Divide each frame into Coding Tree Units (CTUs).
3. **Prediction**: Implement intra-prediction (within the same frame) and inter-prediction (between frames).
4. **Transform and Quantization**: Use Discrete Cosine Transform (DCT) and quantization for data compression.
5. **Entropy Coding**: Implement a simplified version of Context-Adaptive Binary Arithmetic Coding (CABAC).
6. **Encoding and Decoding**: Combine implemented components to encode video frames into a compressed bitstream and decode it back to reconstruct video frames.

## How to Use

1. Upload a video file using the UPLOAD button in the web interface.
2. Click the 'ENCODE' button to compress the video.
3. Click the 'DECODE' button to reconstruct the compressed video.
4. Compare the original video and the reconstructed video side by side.

## Technology Stack

- TypeScript
- HTML5 Video and Canvas API
- MediaRecorder API
- Web Workers (for performance optimization)
