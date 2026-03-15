import { AppError } from '../types/errors';

export function extractBearerToken(headers: Record<string, any>): string {
    const header = headers['authorization'] || headers['Authorization'];
    if (!header || typeof header !== 'string') {
        throw new AppError('Missing Authorization header', 'missing_authorization_header', 401);
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw new AppError('Invalid Authorization header', 'invalid_authorization_header', 401);
    }

    return token;
}
