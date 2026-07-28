import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLoggerService } from '@vt/platform-audit-log';
import { AuditLog } from '../schemas/audit-log.schema';

describe('AuditLoggerService', () => {
  let service: AuditLoggerService;
  let mockModel: {
    create: jest.Mock;
    find: jest.Mock;
    sort: jest.Mock;
    limit: jest.Mock;
    exec: jest.Mock;
  };

  beforeEach(async () => {
    mockModel = {
      create: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ action: 'TEST' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggerService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<AuditLoggerService>(AuditLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list audit logs', async () => {
    const result = await service.list();
    expect(mockModel.find).toHaveBeenCalledWith({});
    expect(result.items.length).toBe(1);
    expect(result.items[0].action).toBe('TEST');
  });

  it('should log action asynchronously', async () => {
    await service.log({ action: 'LOGIN' });
    expect(mockModel.create).toHaveBeenCalledWith({ action: 'LOGIN' });
  });
});
