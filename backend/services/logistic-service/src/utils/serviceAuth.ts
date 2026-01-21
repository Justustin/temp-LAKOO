import crypto from 'crypto';

export const DEFAULT_SERVICE_NAME = process.env.SERVICE_NAME || 'logistic-service';

export function generateServiceToken(serviceName: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${serviceName}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return `${serviceName}:${timestamp}:${signature}`;
}

export function verifyServiceToken(
  token: string,
  serviceSecret: string
): { serviceName: string; timestamp: number } {
  const parts = token.split(':');
  if (parts.length !== 3) {
    throw new Error('invalid token format');
  }

  const tokenServiceName = parts[0]!;
  const timestampStr = parts[1]!;
  const signature = parts[2]!;

  const timestamp = Number.parseInt(timestampStr, 10);
  if (!Number.isFinite(timestamp)) {
    throw new Error('invalid timestamp');
  }

  const now = Math.floor(Date.now() / 1000);
  if (timestamp - now > 60) {
    throw new Error('token timestamp is in the future');
  }
  if (now - timestamp > 300) {
    throw new Error('token expired');
  }

  const message = `${tokenServiceName}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', serviceSecret)
    .update(message)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('invalid signature');
  }

  return { serviceName: tokenServiceName, timestamp };
}

export function getServiceAuthHeaders(serviceName: string = DEFAULT_SERVICE_NAME): Record<string, string> {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) {
    throw new Error('SERVICE_SECRET not configured');
  }

  const token = generateServiceToken(serviceName, secret);
  return {
    'X-Service-Auth': token,
    'X-Service-Name': serviceName
  };
}

