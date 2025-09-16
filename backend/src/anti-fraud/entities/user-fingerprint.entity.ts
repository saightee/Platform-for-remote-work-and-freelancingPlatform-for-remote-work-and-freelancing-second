import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_fingerprints')
@Index('uniq_user_fp_ip', ['user_id', 'fingerprint', 'ip'], { unique: true })
export class UserFingerprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text')
  fingerprint: string;

  @Column('text')
  ip: string;

  @Column({ type: 'boolean', default: false })
  is_proxy: boolean;

  @Column({ type: 'boolean', default: false })
  is_hosting: boolean;

  @Column({ type: 'int', default: 1 })
  seen_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_seen_at: Date;
}