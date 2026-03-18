import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Professional } from './professional.entity';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Professional, User])],
  exports: [TypeOrmModule],
})
export class ProfessionalsModule {}
