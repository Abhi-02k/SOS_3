/**
 * Security & Input Validation Layer
 * Protects against injection, spoofed coordinates, parameter pollution, and DDoS flooding.
 */

// Coordinate range bounds
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

// Device ID sanitizer: alphanumeric, dash, underscore only, length 3..64
export function sanitizeDeviceId(deviceId: unknown): string | null {
  if (typeof deviceId !== 'string') return null;
  const trimmed = deviceId.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return null;
  // Strip any characters that aren't alphanumeric or safe dashes
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length >= 3 ? sanitized : null;
}

// Emergency ID sanitizer
export function sanitizeEmergencyId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (trimmed.length < 5 || trimmed.length > 80) return null;
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length >= 5 ? sanitized : null;
}

// In-memory sliding window rate limiter for API protection
const ipRequests = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const current = ipRequests.get(identifier);

  if (!current || now > current.resetAt) {
    ipRequests.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: limit - current.count };
}
