import pino from 'pino';

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const loggerOptions = {
  level,
  redact: {
    paths: [
      'req.headers.authorization',
      'request.headers.authorization',
      'headers.authorization'
    ],
    remove: true
  }
};

export const logger = pino(loggerOptions);
