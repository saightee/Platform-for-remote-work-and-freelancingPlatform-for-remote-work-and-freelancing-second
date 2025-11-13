import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUrl,
  IsIn,
} from 'class-validator';

export class AffiliateRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsIn(['affiliate'])
  role: 'affiliate';

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  account_type?: 'individual' | 'company';

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsUrl()
  website_url: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traffic_sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  promo_geo?: string[];

  @IsOptional()
  @IsString()
  monthly_traffic?: string;

  @IsOptional()
  @IsString()
  payout_method?: string;

  @IsOptional()
  @IsString()
  payout_details?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  skype?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
