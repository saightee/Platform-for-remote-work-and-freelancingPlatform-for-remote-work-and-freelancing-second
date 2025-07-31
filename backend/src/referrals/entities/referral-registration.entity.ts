import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ReferralLink } from './referral-link.entity';
import { User } from '../../users/entities/user.entity';

@Entity('referral_registrations')
export class ReferralRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ReferralLink, (link) => link.registrationsDetails, { onDelete: 'CASCADE' })
  referral_link: ReferralLink;

  @ManyToOne(() => User, (user) => user.referralRegistrations, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}