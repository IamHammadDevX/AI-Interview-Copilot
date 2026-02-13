export const canvasToJpegDataUrl = (
  canvas: HTMLCanvasElement,
  quality = 0.8
): Promise<string> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob returned null'));
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob); // → data:image/jpeg;base64,
      },
      'image/jpeg',
      quality
    );
  });
