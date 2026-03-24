import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Registramos la entidad
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule], // EXPORTAMOS TypeOrmModule para que otros lo puedan usar
})
export class UsersModule { }