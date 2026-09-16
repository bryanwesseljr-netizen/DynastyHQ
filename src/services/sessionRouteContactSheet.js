const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error(`Could not prepare ${file.name} for Session Import routing.`));
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

export const SESSION_ROUTE_BATCH_SIZE = 4;

export const buildSessionRouteContactSheet = async (files) => {
  const batch = [...(files || [])].slice(0, SESSION_ROUTE_BATCH_SIZE);
  if (!batch.length) throw new Error('No screenshots were supplied for Session Import routing.');

  const images = await Promise.all(batch.map(loadImage));
  const columns = batch.length === 1 ? 1 : 2;
  const rows = Math.ceil(batch.length / columns);
  const cellWidth = 820;
  const imageHeight = 455;
  const labelHeight = 54;
  const cellHeight = imageHeight + labelHeight;
  const gap = 18;
  const padding = 24;

  const canvas = document.createElement('canvas');
  canvas.width = padding * 2 + columns * cellWidth + Math.max(0, columns - 1) * gap;
  canvas.height = padding * 2 + rows * cellHeight + Math.max(0, rows - 1) * gap;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the Session Import routing sheet.');

  context.fillStyle = '#071018';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';

  images.forEach((image, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = padding + column * (cellWidth + gap);
    const y = padding + row * (cellHeight + gap);

    context.fillStyle = '#02070c';
    context.fillRect(x, y, cellWidth, imageHeight);

    const fitted = fitInside(image.width, image.height, cellWidth, imageHeight);
    const imageX = x + Math.round((cellWidth - fitted.width) / 2);
    const imageY = y + Math.round((imageHeight - fitted.height) / 2);
    context.drawImage(image, imageX, imageY, fitted.width, fitted.height);

    context.fillStyle = '#0f1d28';
    context.fillRect(x, y + imageHeight, cellWidth, labelHeight);
    context.fillStyle = '#f8fafc';
    context.font = '700 22px sans-serif';
    context.fillText(`SCREEN ${index + 1}`, x + 16, y + imageHeight + labelHeight / 2);
    context.fillStyle = '#9fb3c8';
    context.font = '600 18px sans-serif';
    context.fillText(batch[index].name.slice(0, 52), x + 145, y + imageHeight + labelHeight / 2);
  });

  return {
    imageDataUrl: canvas.toDataURL('image/jpeg', 0.82),
    files: batch,
  };
};
