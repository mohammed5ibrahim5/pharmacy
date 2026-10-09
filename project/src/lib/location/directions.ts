export function getDirectionsUrl(destination: { latitude: number; longitude: number }): string {
  const params = new URLSearchParams({ api: '1' });
  params.set('destination', `${destination.latitude},${destination.longitude}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function getMapsPreviewUrl(destination: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps?q=${destination.latitude},${destination.longitude}&z=16`;
}
