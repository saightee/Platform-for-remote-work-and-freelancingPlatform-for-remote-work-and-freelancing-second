import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { AffiliateOffer } from './affiliate-offer.entity';

@Entity('affiliate_offer_geo_rules')
export class AffiliateOfferGeoRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AffiliateOffer, (offer) => offer.geo_rules, {
    onDelete: 'CASCADE',
  })
  offer: AffiliateOffer;

  @Column({ type: 'varchar', length: 2 })
  country: string; // ISO код, например "US"

  @Column({ type: 'numeric', nullable: true })
  cpa_amount: number | null;

  @Column({ type: 'numeric', nullable: true })
  revshare_percent: number | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency?: string | null;

  @Column({ default: true })
  is_active: boolean;
}
