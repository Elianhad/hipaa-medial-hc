import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthContextService } from './auth-context.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { Professional } from '../professionals/professional.entity';
import { Tenant } from '../tenants/tenant.entity';
import { TenantMembership } from '../tenants/tenant-membership.entity';
import { AuthUserProvisioningService } from './auth-user-provisioning.service';

/**
 * AuthModule
 *
 * Integrates Auth0 via Passport JWT strategy.
 * The JWT is validated using JWKS from Auth0's discovery endpoint.
 * Role claims are normalized from supported Auth0 claim keys in common/auth/role-claims.ts.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, Professional, Tenant, TenantMembership]),
  ],
  providers: [JwtStrategy, AuthContextService, AuthUserProvisioningService],
  controllers: [AuthController],
  exports: [PassportModule],
})
export class AuthModule { }
