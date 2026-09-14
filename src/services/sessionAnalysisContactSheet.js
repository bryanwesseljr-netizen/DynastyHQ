const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error(`Could not prepare ${file.name} for paired analysis.`));
  };
  image.src = url;
});

const fitInside = (width, height, maxWidth, maxHeight) => {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const SESSION_ANALYSIS_BATCH_SIZE = 2;

export const buildSessionAnalysisContactSheet = async (files) => {
  const batch = [...(files || [])].slice(0, SESSION_ANALYSIS_BATCH_SIZE);
  if (!batch.length) throw new Error('No screenshots were supplied for paired analysis.');
  if (batch.length === 1) return null;

  const images = await Promise.all(batch.map(loadImage));
  const width = 1760;
  const imageHeight = 940;
  const labelHeight = 64;
  const gap = 18;
  const padding = 22;
  const canvas = document.createElement('canvas');
  canvas.width = width + padding * 2;
  canvas.height = padding * 2 + batch.length * (imageHeight + labelHeight) + (batch.length - 1) * gap;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the paired analysis sheet.');

  context.fillStyle = '#071018';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';

  images.forEach((image, index) => {
    const x = padding;
    const y = padding + index * (imageHeight + labelHeight + gap);
    context.fillStyle = '#02070c';
    context.fillRect(x, y, width, imageHeight);
    const fitted = fitInside(image.width, image.height, width, imageHeight);
    context.drawImage(
      image,
      x + Math.round((width - fitted.width) / 2),
      y + Math.round((imageHeight - fitted.height) / 2),
      fitted.width,
      fitted.height,
    );
    context.fillStyle = '#0f1d28';
    context.fillRect(x, y + imageHeight, width, labelHeight);
    context.fillStyle = '#f8fafc';
    context.font = '700 26px sans-serif';
    context.fillText(`SCREEN ${index + 1}`, x + 18, y + imageHeight + labelHeight / 2);
    context.fillStyle = '#9fb3c8';
    context.font = '600 21px sans-serif';
    context.fillText(batch[index].name.slice(0, 70), x + 175, y + imageHeight + labelHeight / 2);
  });

  return {
    imageDataUrl: canvas.toDataURL('image/jpeg', 0.88),
    files: batch,
  };
};
