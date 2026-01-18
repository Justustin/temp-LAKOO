/**
 * Environment configuration with validation
 * Fails fast at startup if required config is missing
 */

interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  databaseUrl: string;

  // Auth (required in production)
  gatewaySecretKey?: string;
  internalApiKey?: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

function validateConfig(): EnvConfig {
  const nodeEnv = getOptionalEnv('NODE_ENV', 'development') as string;
  const isProduction = nodeEnv === 'production';

  // Database is always required
  const databaseUrl = getRequiredEnv('ADDRESS_DATABASE_URL');

  // Auth keys required in production
  let gatewaySecretKey: string | undefined;
  let internalApiKey: string | undefined;

  if (isProduction) {
    gatewaySecretKey = getRequiredEnv('GATEWAY_SECRET_KEY');
    internalApiKey = getRequiredEnv('INTERNAL_API_KEY');
  } else {
    gatewaySecretKey = getOptionalEnv('GATEWAY_SECRET_KEY');
    internalApiKey = getOptionalEnv('INTERNAL_API_KEY');

    if (!gatewaySecretKey && !internalApiKey) {
      console.warn(
        'WARNING: Running without GATEWAY_SECRET_KEY and INTERNAL_API_KEY. ' +
        'Authentication is bypassed in development mode.'
      );
    }
  }

  return {
    port: parseInt(getOptionalEnv('PORT', '3010') as string, 10),
    nodeEnv,
    databaseUrl,
    gatewaySecretKey,
    internalApiKey
  };
}

// Validate on import - fail fast
export const config = validateConfig();
