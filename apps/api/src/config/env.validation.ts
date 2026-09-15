import { plainToInstance } from "class-transformer";
import { IsInt, IsString, Min, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  PANELFOLLOWS_API_KEY!: string;

  @IsString()
  PANELFOLLOWS_BASE_URL!: string;

  @IsString()
  PANELFOLLOWS_WEBHOOK_SECRET!: string;

  @IsString()
  YENGAPAY_ORGANIZATION_ID!: string;

  @IsString()
  YENGAPAY_PROJECT_ID!: string;

  @IsString()
  YENGAPAY_API_KEY!: string;

  @IsString()
  YENGAPAY_WEBHOOK_SECRET!: string;
}

/** Fails fast at boot if a required secret/config value is missing — never at first use in prod. */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }

  return validated;
}
