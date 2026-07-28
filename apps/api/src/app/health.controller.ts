import { Controller, Get } from '@nestjs/common';
import { Public } from '@gomhoasen/iam';
import { GHS_CONTROLLERS } from '@gomhoasen/contracts';
import { HealthCheckService } from '@vt/platform-healthcheck';

@Controller(GHS_CONTROLLERS.HEALTH.MAIN)
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Public()
  @Get()
  async getHealth() {
    return this.health.check();
  }
}
