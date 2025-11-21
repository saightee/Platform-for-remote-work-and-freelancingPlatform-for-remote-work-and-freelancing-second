import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateAffiliateProfileDto {
  @IsOptional()
  @IsIn(['individual', 'company'])
  account_type?: 'individual' | 'company';

  @IsOptional()
  @IsString()
  company_name?: string | null;

  @IsOptional()
  @IsString()
  website_url?: string | null;

  @IsOptional()
  @IsString()
  traffic_sources?: string | null;

  @IsOptional()
  @IsString()
  promo_geo?: string | null;

  @IsOptional()
  @IsString()
  monthly_traffic?: string | null;

  @IsOptional()
  @IsString()
  payout_method?: string | null;

  @IsOptional()
  @IsString()
  payout_details?: string | null;

  @IsOptional()
  @IsString()
  telegram?: string | null;

  @IsOptional()
  @IsString()
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  skype?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
