import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginDto as LoginSchema } from '@sonoria/schemas';

export class LoginDto implements LoginSchema {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
