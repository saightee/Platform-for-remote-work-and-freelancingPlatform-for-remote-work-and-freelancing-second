import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTrackingSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultPostbackUrl?: string;

  @IsOptional()
  @IsString()
  defaultFbPixelCode?: string;

  @IsOptional()
  @IsString()
  defaultGaTagCode?: string;
}
