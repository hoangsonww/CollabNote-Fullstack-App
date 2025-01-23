import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Allow CORS for local dev
  app.enableCors({
    origin: ['http://localhost:5173'], // default Vite port
    credentials: true,
  });

  await app.listen(4000, () => {
    console.log(`NestJS Backend running on http://localhost:4000`);
  });
}
bootstrap();
