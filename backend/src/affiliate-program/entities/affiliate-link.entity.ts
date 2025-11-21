import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AffiliateOffer } from './affiliate-offer.entity';
import { AffiliateClick } from './affiliate-click.entity';
import { AffiliateRegistration } from './affiliate-registration.entity';

@Entity('affiliate_links')
@Index(['code'], { unique: true })
export class AffiliateLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_user_id' })
  affiliate_user: User;

  @ManyToOne(() => AffiliateOffer, (offer) => offer.links, {
    onDelete: 'CASCADE',
  })
  offer: AffiliateOffer;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  landing_path?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'text', nullable: true })
  postback_url_override?: string | null;

  @Column({ type: 'text', nullable: true })
  fb_pixel_code_override?: string | null;

  @Column({ type: 'text', nullable: true })
  ga_tag_code_override?: string | null;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => AffiliateClick, (click) => click.link)
  clicks: AffiliateClick[];

  @OneToMany(() => AffiliateRegistration, (reg) => reg.link)
  registrations: AffiliateRegistration[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
