import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min, MaxLength } from 'class-validator';

export class SubmitSuccessStoryDto {
  @IsString()
  @Length(1, 120)
  headline: string;

  @IsString()
  @Length(1, 2000)
  story: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsBoolean()
  allow_publish: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
