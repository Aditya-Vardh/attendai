/** Haversine distance between two lat/lng pairs, returns metres */
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoCheckResult {
  allowed: boolean;
  distanceM: number;
  radiusM: number;
}

export const OFFICE_NAME = "KLH Bachupally Campus";
export const OFFICE_LAT = parseFloat(import.meta.env.VITE_OFFICE_LAT ?? "17.5388");
export const OFFICE_LNG = parseFloat(import.meta.env.VITE_OFFICE_LNG ?? "78.3861");
export const OFFICE_RADIUS_M = parseFloat(import.meta.env.VITE_OFFICE_RADIUS_M ?? "350");

export function checkGeoAllowed(lat: number, lng: number): GeoCheckResult {
  const distanceM = haversineMetres(OFFICE_LAT, OFFICE_LNG, lat, lng);
  return {
    allowed: distanceM <= OFFICE_RADIUS_M,
    distanceM: Math.round(distanceM),
    radiusM: OFFICE_RADIUS_M,
  };
}

/** Promisified wrapper around navigator.geolocation.getCurrentPosition */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}
