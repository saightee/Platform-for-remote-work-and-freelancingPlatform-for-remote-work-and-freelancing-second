import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('email_notifications')
export class EmailNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  job_post_id: string;  

  @Column()
  recipient_email: string;

  @Column()
  recipient_username: string;

  @Column({ nullable: true })
  message_id: string; 

  @Column({ default: false })
  opened: boolean;

  @Column({ default: false })
  clicked: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  sent_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  opened_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  clicked_at?: Date;
}