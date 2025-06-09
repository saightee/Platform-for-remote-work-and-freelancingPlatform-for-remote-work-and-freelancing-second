import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateModeratorDto {
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
  secretKey: string;
}