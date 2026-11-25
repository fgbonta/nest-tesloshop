import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

import { Product } from "./product.entity.js";

@Entity()
export class ProductImage {

    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({
        type: 'text',
    })
    url: string;

    // relations
    @ManyToOne(
        () => Product,
        (product) => product.images
    )
    product: Relation<Product>;
}