import 'reflect-metadata';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { ApiExceptionFilter, ResponseEnvelopeInterceptor } from '@vt/platform-api-contract';
import { LocalFileStorageAdapter } from '@vt/platform-file-storage-local';
import { AppModule } from '../../src/app/app.module';
import { StripReservedFieldsPipe } from '@gomhoasen/core';
import { QuoteEmailService } from '../../../../libs/modules/quote/src/lib/services/quote-email.service';
import { QuotePdfService } from '../../../../libs/modules/quote/src/lib/services/quote-pdf.service';

export interface QuoteServiceOverrides {
  pdf?: Pick<QuotePdfService, 'generate'>;
  email?: Pick<QuoteEmailService, 'sendQuote'>;
}

function flattenValidationErrors(errors: ValidationError[]): Array<{ field: string; message: string }> {
  return errors.flatMap((error) => {
    const ownErrors = error.constraints
      ? Object.values(error.constraints).map((message) => ({ field: error.property, message }))
      : [];
    const childErrors = error.children?.length ? flattenValidationErrors(error.children) : [];
    return [...ownErrors, ...childErrors];
  });
}

function configureProcessEnv(mongodbUri: string): void {
  process.env.APP_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'ghs-e2e-jwt-secret';
  process.env.MONGODB_URI = mongodbUri;
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || 'apps/api/uploads-e2e';
}

function applyOverrides(builder: TestingModuleBuilder, overrides?: QuoteServiceOverrides): void {
  if (overrides?.pdf) {
    builder.overrideProvider(QuotePdfService).useValue(overrides.pdf);
  }
  if (overrides?.email) {
    builder.overrideProvider(QuoteEmailService).useValue(overrides.email);
  }
}

export async function createApiTestApp(mongodbUri: string, overrides?: QuoteServiceOverrides): Promise<NestExpressApplication> {
  configureProcessEnv(mongodbUri);
  const builder = Test.createTestingModule({ imports: [AppModule] });
  applyOverrides(builder, overrides);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  const config = app.get(ConfigService);
  const uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? 'apps/api/uploads-e2e');

  await new LocalFileStorageAdapter({ rootDir: uploadDir }).ensureRoot();

  app.setGlobalPrefix('api');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalPipes(
    new StripReservedFieldsPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: flattenValidationErrors(errors),
      }),
    }),
  );

  await app.init();
  return app;
}
