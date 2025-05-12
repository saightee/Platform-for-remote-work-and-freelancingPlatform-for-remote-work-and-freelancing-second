import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('employers')
export class Employer {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  company_name?: string;

  @Column({ nullable: true })
  company_info?: string;

  @Column({ nullable: true })
  referral_link?: string;

  @Column({ nullable: true }) // Часовой пояс, например, "Europe/Moscow"
  timezone?: string;

  @Column({ nullable: true }) // Валюта, например, "USD"
  currency?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}