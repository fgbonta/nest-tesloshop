import { BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { validate as isUUID } from 'uuid';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { Product, ProductImage } from './entities/index.js';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>
  ) { }

  async create(createProductDto: CreateProductDto) {
    try {
      /*
      solo se ejecutan los hooks de entidad de TypeORM si creas y guardas una instancia de la entidad (repository.create(...) + repository.save(...)).
      Si insertas con repository.insert(...) o QueryBuilder.insert(), TypeORM ejecuta un INSERT directo en PostgreSQL y no dispara los hooks (@BeforeInsert(), @AfterInsert(), etc.). 
      */

      const { images = [], ...productProperties } = createProductDto;

      const product = this.productRepository.create({
        ...productProperties,
        images: images.map(url => this.productImageRepository.create({ url })),
      });
      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error: unknown) {
      this.handleDBExeptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { offset, limit } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });

    return products.map(product => ({
      ...product,
      images: product.images?.map(image => image.url)
    }));
  }

  async findOne(term: string) {

    let product: Product | null = null;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {

      const queryBuilder = this.productRepository.createQueryBuilder('product');
      product = await queryBuilder
        .where('(UPPER(product.title) = :title OR product.slug = :slug)', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('product.images', 'productImages')
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with ${term} not found`);
    }

    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map(image => image.url)
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    // 1. findOne / findOneBy + merge + save
    // 2. update(id, dto) directo en el repositorio

    // 3.
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
      images: []
    });

    if (!product) {
      throw new NotFoundException(`Product with id: ${id} not foud`);
    }

    try {
      await this.productRepository.save(product);

      return product;
    } catch (error: unknown) {
      this.handleDBExeptions(error);
    }
  }

  async remove(id: string) {
    /*
    remove(entity) vs delete(id): 
    remove carga la entidad (aquí vía this.findOne(id)), dispara los hooks o subscribers de TypeORM y devuelve 404 si el ID no existe.
    delete ejecuta un DELETE directo en una sola consulta, pero no dispara hooks de entidad y no avisa si no borró ninguna fila
    */
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  private handleDBExeptions(error: unknown) {

    if (error instanceof HttpException) {
      throw error;
    }

    const dbError = error as {
      code?: string;
      detail?: string;
    }

    if (dbError?.code === '23505') {
      throw new BadRequestException(dbError?.detail ?? 'Duplicate record');
    }

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
