import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
