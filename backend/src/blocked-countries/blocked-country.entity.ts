import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('blocked_countries')
export class BlockedCountry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  country_code: string; // Код страны (например, "IN" для Индии)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}