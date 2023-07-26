interface Dimensions {
  aspectRatio: string;
  maxWidth: number;
  maxHeight: number;
}

export function calculateActualDimensions(dimensions: Dimensions): { width: number, height: number } {
  const { aspectRatio, maxWidth, maxHeight } = dimensions;
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);

  const actualWidth = Math.min(maxWidth, Math.floor(maxHeight * widthRatio / heightRatio));
  const actualHeight = Math.min(maxHeight, Math.floor(maxWidth * heightRatio / widthRatio));

  return { width: actualWidth, height: actualHeight };
}