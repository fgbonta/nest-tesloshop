import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían propiedades extra
      // transform: true,
      // transformOptions: {
      //   enableImplicitConversion: true,
      // }
    })
  )

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
