import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ClinicalRecordsModule } from './modules/clinical-records/clinical-records.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { StorageModule } from './modules/storage/storage.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuditModule } from './modules/audit/audit.module';
import databaseConfig from './config/database.config';
import { RoleValidationMiddleware } from './common/middleware/role-validation.middleware';
import { RateLimitingMiddleware } from './common/middleware/rate-limiting.middleware';
import { AuditLoggingMiddleware } from './common/middleware/audit-logging.middleware';

@Module({
  imports: [
    // Configuration (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('database.host'),
        port: cfg.get<number>('database.port'),
        username: cfg.get<string>('database.username'),
        password: cfg.get<string>('database.password'),
        database: cfg.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,       // always false — use migrations
        migrationsRun: false,
        ssl: cfg.get<boolean>('database.ssl') ? { rejectUnauthorized: true } : false,
        extra: {
          // Connection pool
          max: 20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        },
      }),
    }),

    // Feature modules
    AuthModule,
    TenantsModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentsModule,
    ClinicalRecordsModule,
    FhirModule,
    StorageModule,
    BillingModule,
    AuditModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middlewares in order:
    // 1. Audit logging (logs all requests)
    // 2. Rate limiting (applies limits based on endpoint)
    // 3. Role validation (enforces access control)

    consumer
      .apply(AuditLoggingMiddleware)
      .forRoutes('*');

    consumer
      .apply(RateLimitingMiddleware)
      .forRoutes('*');

    consumer
      .apply(RoleValidationMiddleware)
      .forRoutes(
        { path: 'v1/dashboard*', method: RequestMethod.ALL },
      );
  }
}
