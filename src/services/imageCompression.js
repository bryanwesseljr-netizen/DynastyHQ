export const compressImage = (
  file,
  maxDimension = 2400,
  quality = 0.9,
  timeoutMs = 15000,
) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  let settled = false;
  let image = null;

  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    callback(value);
  };

  const fail = (message) => finish(reject, message instanceof Error ? message : new Error(message));
  const timeoutId = window.setTimeout(() => {
    try { reader.abort(); } catch { /* no-op */ }
    if (image) image.src = '';
    fail('Preparing this image took too long. Try a smaller photo or a JPEG/WebP copy.');
  }, timeoutMs);

  reader.onload = (event) => {
    image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const largestSide = Math.max(image.width, image.height);
        if (!largestSide) {
          fail('The selected image has invalid dimensions.');
          return;
        }
        const scale = Math.min(1, maxDimension / largestSide);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          fail('This browser could not prepare the image.');
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        finish(resolve, canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        fail(error?.message || 'The selected image could not be prepared.');
      }
    };
    image.onerror = () => fail('The selected image could not be opened.');
    image.src = event.target.result;
  };
  reader.onerror = () => fail('The selected image could not be read.');
  reader.onabort = () => {
    if (!settled) fail('Image preparation was canceled.');
  };
  reader.readAsDataURL(file);
});
