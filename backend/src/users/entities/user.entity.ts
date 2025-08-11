import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReferralRegistration } from '../../referrals/entities/referral-registration.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  username: string;

  @Column()
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  @Column({ type: 'boolean', default: false })
  identity_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  identity_document: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: 'active' | 'blocked';

  @Column({ type: 'int', default: 0 })
  risk_score: number;

  @Column({ type: 'boolean', default: false })
  is_email_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  referral_source: string | null;

  @OneToMany(() => ReferralRegistration, (reg) => reg.user)
  referralRegistrations: ReferralRegistration[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}