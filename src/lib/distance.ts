import { calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import type { Pharmacy } from '@/types';

export function getPharmacyWithDistance(
  pharmacy: Pharmacy,
  userLat?: number,
  userLon?: number
): Pharmacy & { distance?: number } {
  if (userLat != null && userLon != null) {
    return {
      ...pharmacy,
      distance: calculateDistance(userLat, userLon, pharmacy.latitude, pharmacy.longitude),
    };
  }
  return pharmacy;
}

export function sortPharmaciesByDistance<T extends Pharmacy & { distance?: number }>(
  pharmacies: T[]
): T[] {
  return [...pharmacies].sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });
}

export { formatDistance };
