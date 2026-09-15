import { Module } from "@nestjs/common";
import { PanelFollowsModule } from "../panelfollows/panelfollows.module";
import { ProviderServicesService } from "./provider-services.service";
import { ProviderServicesController } from "./provider-services.controller";

@Module({
  imports: [PanelFollowsModule],
  providers: [ProviderServicesService],
  controllers: [ProviderServicesController],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}
