import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { Product, ProductImage } from './entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule { }
