import crypto from 'crypto';

export class CryptoUtils {
  /**
   * Verify Xendit webhook callback token
   *
   * Xendit uses a simple token verification - the x-callback-token header
   * should match the Webhook Verification Token configured in Xendit dashboard.
   *
   * @param receivedToken - Token from x-callback-token header
   * @param expectedToken - Your Xendit webhook verification token
   * @returns boolean - true if token is valid
   */
  static verifyXenditWebhook(
    _payload: string, // Kept for backwards compatibility, not used
    receivedToken: string,
    expectedToken: string
  ): boolean {
    if (!receivedToken || !expectedToken) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    // First check lengths to avoid Buffer.from errors
    if (receivedToken.length !== expectedToken.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedToken, 'utf8'),
        Buffer.from(expectedToken, 'utf8')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a unique payment code
   * Format: PAY-YYYYMMDD-XXXXXX
   */
  static generatePaymentCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${date}-${random}`;
  }

  /**
   * Generate a unique refund code
   * Format: REF-YYYYMMDD-XXXXXX
   */
  static generateRefundCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REF-${date}-${random}`;
  }

  /**
   * Generate a unique settlement code
   * Format: SET-YYYYMMDD-XXXXXX
   */
  static generateSettlementCode(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SET-${date}-${random}`;
  }

  /**
   * Generate a unique transaction code with custom prefix
   */
  static generateCode(prefix: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${date}-${random}`;
  }

  /**
   * Hash a string using SHA256
   */
  static hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Generate a random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate idempotency key
   */
  static generateIdempotencyKey(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Verify HMAC signature (for general webhook verification)
   */
  static verifyHmac(
    data: string,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate HMAC signature
   */
  static generateHmac(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }
}
