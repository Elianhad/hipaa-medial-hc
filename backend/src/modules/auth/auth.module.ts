import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule
 *
 * Integrates Auth0 via Passport JWT strategy.
 * The JWT is validated using JWKS from Auth0's discovery endpoint.
 * Role claims are read from the custom namespace `https://hipaa-hce/role`.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
