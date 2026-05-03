import { Mp3Encoder } from '@breezystack/lamejs';

let mp3encoder: Mp3Encoder | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'INIT':
      const { channels, sampleRate, bitRate } = data;
      mp3encoder = new Mp3Encoder(channels, sampleRate, bitRate);
      break;

    case 'ENCODE':
      if (!mp3encoder) return;
      const { left, right } = data;
      
      // Convert Float32 to Int16 for LameJS
      const leftInt16 = convertFloat32ToInt16(left);
      const rightInt16 = right ? convertFloat32ToInt16(right) : undefined;
      
      const mp3buf = rightInt16 
        ? mp3encoder.encodeBuffer(leftInt16, rightInt16)
        : mp3encoder.encodeBuffer(leftInt16);
      
      if (mp3buf.length > 0) {
        self.postMessage({ type: 'DATA', data: new Int8Array(mp3buf) }, [new Int8Array(mp3buf).buffer] as any);
      }
      break;

    case 'FINISH':
      if (!mp3encoder) return;
      const mp3bufFinal = mp3encoder.flush();
      if (mp3bufFinal.length > 0) {
        self.postMessage({ type: 'DATA', data: new Int8Array(mp3bufFinal) }, [new Int8Array(mp3bufFinal).buffer] as any);
      }
      self.postMessage({ type: 'DONE' });
      break;
  }
};

function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    const s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf;
}
