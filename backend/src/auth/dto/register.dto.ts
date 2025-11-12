import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, IsUrl,} from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() role: 'employer' | 'jobseeker';
  @IsOptional() @IsString() country?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];

  @IsOptional() @IsString() resume?: string;
  @IsOptional() @IsUrl() linkedin?: string;
  @IsOptional() @IsUrl() instagram?: string;
  @IsOptional() @IsUrl() facebook?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() date_of_birth?: string;
}