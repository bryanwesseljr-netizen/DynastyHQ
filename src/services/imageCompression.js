export const compressImage = (file, maxDimension = 2400) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('This browser could not prepare the screenshot.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    image.onerror = () => reject(new Error('The selected screenshot could not be opened.'));
    image.src = event.target.result;
  };
  reader.onerror = () => reject(new Error('The selected screenshot could not be read.'));
  reader.readAsDataURL(file);
});
