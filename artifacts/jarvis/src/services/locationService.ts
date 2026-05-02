export interface LocationResult {
  success: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  error?: string;
}

export async function getCurrentLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    return { success: false, error: 'Geolocation not supported by this browser.' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let address: string | undefined;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          address = data.display_name;
        } catch {
          address = undefined;
        }

        resolve({ success: true, lat: latitude, lng: longitude, accuracy: Math.round(accuracy), address });
      },
      (err) => {
        let error = 'Location access denied.';
        if (err.code === err.PERMISSION_DENIED) error = 'Location permission denied. Please allow location access.';
        else if (err.code === err.POSITION_UNAVAILABLE) error = 'Location unavailable.';
        else if (err.code === err.TIMEOUT) error = 'Location request timed out.';
        resolve({ success: false, error });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function formatLocation(result: LocationResult): string {
  if (!result.success) return `Location error: ${result.error}`;
  const coords = `${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)}`;
  if (result.address) {
    const short = result.address.split(',').slice(0, 3).join(',');
    return `${short} (${coords}, ±${result.accuracy}m)`;
  }
  return `${coords} ±${result.accuracy}m`;
}
