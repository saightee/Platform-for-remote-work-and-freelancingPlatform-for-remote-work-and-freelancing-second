import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string; // Например, "global_application_limit"

  @Column()
  value: string; // Значение в формате строки (например, "1000")
}