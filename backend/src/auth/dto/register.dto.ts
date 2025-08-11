import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, IsString as IsStringValidator } from 'class-validator';  // Измени импорт IsString на alias, чтобы избежать конфликта

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

  @IsOptional() 
  @IsArray()
  @IsStringValidator({ each: true })  
  skills?: string[]; 

  @IsOptional() 
  @IsString()
  experience?: string;

  @IsOptional() 
  @IsString()
  resume?: string;
}