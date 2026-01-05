import { Module } from '@nestjs/common';
import { TrivyDbController } from './trivy-db.controller';

@Module({
  controllers: [TrivyDbController],
})
export class TrivyDbModule {}
