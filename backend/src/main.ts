import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable CORS for all origins
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  });

  // Middleware to log all incoming requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`Incoming Request: ${req.method} ${req.url}`);
    next();
  });

  const port = configService.get<number>('PORT', 4000); // Use PORT from config or default to 4000

  await app.listen(port, () => {
    logger.log(`NestJS Backend running on port ${port} and ready for cloud deployment`);
  });
}

bootstrap();
