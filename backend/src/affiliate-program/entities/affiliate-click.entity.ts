import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { AffiliateLink } from './affiliate-link.entity';
import { AffiliateRegistration } from './affiliate-registration.entity';

@Entity('affiliate_clicks')
export class AffiliateClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AffiliateLink, (link) => link.clicks, {
    onDelete: 'CASCADE',
  })
  link: AffiliateLink;

  @Column({ unique: true })
  click_id: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent?: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country?: string | null;

  @Column({ type: 'text', nullable: true })
  sub1?: string | null;

  @Column({ type: 'text', nullable: true })
  sub2?: string | null;

  @Column({ type: 'text', nullable: true })
  sub3?: string | null;

  @Column({ type: 'text', nullable: true })
  sub4?: string | null;

  @Column({ type: 'text', nullable: true })
  sub5?: string | null;

  @OneToMany(() => AffiliateRegistration, (reg) => reg.click)
  registrations: AffiliateRegistration[];

  @CreateDateColumn()
  created_at: Date;
}
