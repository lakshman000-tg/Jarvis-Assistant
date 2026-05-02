export interface EmergencyAlertOptions {
  location?: { lat: number; lng: number };
  message?: string;
}

export function triggerEmergencyAlert(options?: EmergencyAlertOptions): string {
  const timestamp = new Date().toLocaleString();
  const message = options?.message || 'EMERGENCY: SOS alert triggered via JARVIS!';
  const locationText = options?.location
    ? ` Location: https://maps.google.com/?q=${options.location.lat},${options.location.lng}`
    : '';

  const alertText = `🚨 ${message} Time: ${timestamp}.${locationText}`;

  // Copy to clipboard
  try {
    navigator.clipboard?.writeText(alertText);
  } catch {
    /* silently fail */
  }

  // Open maps if location available
  if (options?.location) {
    window.open(
      `https://maps.google.com/?q=${options.location.lat},${options.location.lng}`,
      '_blank'
    );
  }

  return alertText;
}
