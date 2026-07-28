import { DynamicModule, Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import type { Model } from 'mongoose';
import {
  JOB_RUNNER_MONGO_OPTIONS,
  type JobRunnerMongoOptions,
} from './job-runner-mongo.options';
import { JobRunnerMongoService } from './job-runner-mongo.service';
import { MongoJob, MongoJobSchema } from './mongo-job.schema';
import type { MongoJobDocument } from './mongo-job.schema';

@Module({})
export class JobRunnerMongoModule {
  static register(options: JobRunnerMongoOptions = {}): DynamicModule {
    const connectionName = options.connectionName?.trim() || undefined;
    const serviceProvider = connectionName
      ? {
          provide: JobRunnerMongoService,
          inject: [getModelToken(MongoJob.name, connectionName), JOB_RUNNER_MONGO_OPTIONS],
          useFactory: (
            model: Model<MongoJobDocument>,
            runnerOptions: JobRunnerMongoOptions,
          ) => new JobRunnerMongoService(model, runnerOptions),
        }
      : JobRunnerMongoService;
    return {
      module: JobRunnerMongoModule,
      imports: [
        MongooseModule.forFeature(
          [{ name: MongoJob.name, schema: MongoJobSchema }],
          connectionName,
        ),
        ScheduleModule.forRoot(),
      ],
      providers: [
        { provide: JOB_RUNNER_MONGO_OPTIONS, useValue: options },
        serviceProvider,
      ],
      exports: [JobRunnerMongoService],
    };
  }
}
