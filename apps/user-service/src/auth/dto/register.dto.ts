import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { RegisterDto as RegisterSchema } from '@sonoria/schemas';

export class RegisterDto implements RegisterSchema {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
