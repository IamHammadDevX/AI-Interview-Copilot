import { RefObject, useCallback } from 'react';
import { canvasToJpegDataUrl } from '@/utils/helpers';

export const useScreenshot = (
  videoRef: RefObject<HTMLVideoElement>,
  capturing: boolean,
  loading: boolean,
  // eslint-disable-next-line no-unused-vars
  handleScreenshot?: (dataUrl: string, fileName: string) => void
) => {
  const screenshotDisabled = !capturing || loading;

  const takeScreenshot = useCallback(() => {
    if (screenshotDisabled || !videoRef.current) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const fileName = `screenshot-${Date.now()}.jpg`;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: fileName,
        });
        a.click();
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      0.8
    );

    if (handleScreenshot) {
      canvasToJpegDataUrl(canvas, 0.8)
        .then((dataUrl) => {
          handleScreenshot(dataUrl, fileName);
        })
        .catch(console.error);
    }
  }, [screenshotDisabled, videoRef, handleScreenshot]);

  return {
    takeScreenshot,
    screenshotDisabled,
  };
};
