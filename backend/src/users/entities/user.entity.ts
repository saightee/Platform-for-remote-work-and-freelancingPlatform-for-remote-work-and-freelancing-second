import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
  role: 'employer' | 'jobseeker' | 'admin';

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'varchar', nullable: true }) // Добавляем поле для аватарки
  avatar: string | null;

  @Column({ type: 'boolean', default: false }) // Добавляем поле для статуса верификации
  identity_verified: boolean;

  @Column({ type: 'varchar', nullable: true }) // Добавляем поле для документа
  identity_document: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}