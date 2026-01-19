import crypto from 'crypto';


export const generateServiceToken = (serviceName: string, secret: string): string => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${serviceName}:${timestamp}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
    
    return `${serviceName}:${timestamp}:${signature}`;
};

export const  verifyServiceToken = (token: string | string[], serviceSecret: string) => {
    const parts = (token as string).split(':');
    if (parts.length !== 3) {
        throw new Error("invalid token format")
    }

    const [tokenServiceName, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr);

    //check timestamp (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {
        throw new Error("Token Expired")
    }
    
    //verify token
    const message = `${tokenServiceName}:${timestamp}`;
    const expectedSignature = crypto
        .createHmac('sha256', serviceSecret)
        .update(message)
        .digest('hex');

    if (signature !== expectedSignature) {
        throw new Error("Invalid signature")
    }

    return


}
