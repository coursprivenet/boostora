import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { YengapayClient } from "./yengapay.client";

@Module({
  imports: [HttpModule],
  providers: [YengapayClient],
  exports: [YengapayClient],
})
export class YengapayModule {}
