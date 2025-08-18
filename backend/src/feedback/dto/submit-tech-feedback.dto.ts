import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitTechFeedbackDto {
  @IsIn(['Bug', 'UI', 'Perfomance', 'Data', 'Other'])
  category: 'Bug' | 'UI' | 'Perfomance' | 'Data' | 'Other';

  @IsString()
  @MaxLength(500)
  summary: string;

  @IsOptional()
  @IsString()
  steps_to_reproduce?: string;

  @IsOptional()
  @IsString()
  expected_result?: string;

  @IsOptional()
  @IsString()
  actual_result?: string;
}
