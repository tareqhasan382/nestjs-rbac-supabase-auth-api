import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigType } from '@nestjs/config';

import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Load config globally
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // import ConfigModule here too
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], //  This is REQUIRED
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigType<typeof configuration>>) => ({
        type: 'postgres',
        url: configService.get('database.url', { infer: true }),
        ssl: {
          rejectUnauthorized: false,
        },
        autoLoadEntities: true,
        synchronize: true, // Only in dev!
      }),
    }),

    // app modules
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
