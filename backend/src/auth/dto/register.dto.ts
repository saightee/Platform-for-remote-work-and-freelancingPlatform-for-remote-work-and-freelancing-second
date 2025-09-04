import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, IsUrl } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  role: 'employer' | 'jobseeker';

  // Только для jobseeker
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  resume?: string;

  @IsOptional() @IsUrl() linkedin?: string;
  @IsOptional() @IsUrl() instagram?: string;
  @IsOptional() @IsUrl() facebook?: string;

  @IsOptional() @IsString()
  description?: string;
}