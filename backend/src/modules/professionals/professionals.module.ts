import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from './professional.entity';
import { User } from './user.entity';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { MockSisaService } from './mock-sisa.service';

@Module({
  imports: [TypeOrmModule.forFeature([Professional, User])],
  providers: [ProfessionalsService, MockSisaService],
  controllers: [ProfessionalsController],
  exports: [ProfessionalsService, MockSisaService, TypeOrmModule],
})
export class ProfessionalsModule {}
