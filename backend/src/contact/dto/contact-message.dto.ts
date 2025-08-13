import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactMessageDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(10) @MaxLength(2000) message: string;

  @IsOptional() @MaxLength(0) website?: string;

  @IsOptional() @IsString() @MaxLength(2000) captchaToken?: string;
}