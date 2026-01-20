
import { Request, Response, NextFunction } from 'express';
import { verifyServiceToken } from '../utils/serviceAuth';

const SERVICE_AUTH_HEADER = 'X-Service-Auth';
const SERVICE_NAME_HEADER = 'X-Service-Name';


export const serviceAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {

    const token = req.headers[SERVICE_AUTH_HEADER.toLowerCase()];
    const serviceName = req.headers[SERVICE_NAME_HEADER.toLowerCase()];

    if (!token || !serviceName) {
        return res.status(401).json({
            error: 'Service authentication required'
        });
    }

    const serviceSecret = process.env.SERVICE_SECRET;
    if (!serviceSecret) {
        return res.status(500).json({
            error: 'Service secret not configured'
        });
    }


    try {
        verifyServiceToken(token, serviceSecret)
    } catch (error) {
        return res.status(401).json({
            error: error
        })
    }
    
    //valid service auth
    next();
};
