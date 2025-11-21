import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateAffiliateLinkDto {
  @IsUUID()
  offerId: string;

  @IsOptional()
  @IsString()
  landingPath?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
