import 'reflect-metadata';
import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GHS_API } from '@gomhoasen/contracts';
import { ApiExceptionFilter, ResponseEnvelopeInterceptor } from '@vt/platform-api-contract';
import { resolveCorsOrigins } from '@vt/platform-config';
import { COMMON_ERROR_CODES, DomainBadRequestException } from '@vt/platform-error';
import { LocalFileStorageAdapter } from '@vt/platform-file-storage-local';
import { createHttpRequestLogger } from '@vt/platform-system-log';
import { AppModule } from './app/app.module';
import { StripReservedFieldsPipe } from '@gomhoasen/core';

type AuthenticatedUser = {
  sub?: string;
  id?: string;
};

function flattenValidationErrors(errors: ValidationError[]): Array<{ field: string; message: string }> {
  return errors.flatMap((error) => {
    const ownErrors = error.constraints
      ? Object.values(error.constraints).map((message) => ({ field: error.property, message }))
      : [];
    const childErrors = error.children?.length ? flattenValidationErrors(error.children) : [];
    return [...ownErrors, ...childErrors];
  });
}

function getAuthenticatedUserId(request: { user?: unknown }): string | undefined {
  const candidate = request.user;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return undefined;
  }
  const user = candidate as AuthenticatedUser;
  return typeof user.sub === 'string'
    ? user.sub
    : typeof user.id === 'string'
    ? user.id
    : undefined;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT') ?? 4310;
  const host = config.get<string>('API_HOST');
  const uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? 'apps/api/uploads');
  const docsPathPattern = /^\/api\/docs(?:\/|$)/;

  await new LocalFileStorageAdapter({ rootDir: uploadDir }).ensureRoot();

  app.setGlobalPrefix('api');
  app.use(createHttpRequestLogger({
    context: 'gomhoasen.api',
    skipPaths: [GHS_API.HEALTH.CHECK, docsPathPattern],
    getUserId: getAuthenticatedUserId,
  }));
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  const nodeEnv = config.get<string>('APP_ENV') ?? config.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
  const corsOrigin = resolveCorsOrigins({
    corsOrigins: config.get<string>('CORS_ORIGIN'),
    nodeEnv,
  });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalPipes(
    new StripReservedFieldsPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new DomainBadRequestException(
        COMMON_ERROR_CODES.VALIDATION_FAILED,
        'Dữ liệu không hợp lệ',
        { errors: flattenValidationErrors(errors) },
      ),
    })
  );

  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
}

void bootstrap();
