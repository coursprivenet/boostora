import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PanelFollowsClient } from "./panelfollows.client";

@Module({
  imports: [HttpModule],
  providers: [PanelFollowsClient],
  exports: [PanelFollowsClient],
})
export class PanelFollowsModule {}
