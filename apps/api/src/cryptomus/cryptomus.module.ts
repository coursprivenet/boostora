import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CryptomusClient } from "./cryptomus.client";

@Module({
  imports: [HttpModule],
  providers: [CryptomusClient],
  exports: [CryptomusClient],
})
export class CryptomusModule {}
