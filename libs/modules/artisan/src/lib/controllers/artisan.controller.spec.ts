// Task card: R2-007T
// Ref read:
// - /Users/bonbon177tb/Documents/zalominiapp/v2/libs/catalog/src/lib/controllers/admin/brand.controller.ts
// Kept: controller-to-service contract tests
// Dropped: tenant request context
// Adapted: public ACTIVE-only list and avatar upload guard

import { HttpException } from '@nestjs/common';
import { ARTISAN_STATUSES } from '@gomhoasen/contracts';
import { ArtisanController } from './artisan.controller';
import { PublicArtisanController } from './public-artisan.controller';

describe('ArtisanController', () => {
  function createController() {
    const service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findActiveBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setAvatar: jest.fn(),
      softDelete: jest.fn(),
    };

    return {
      service,
      controller: new ArtisanController(service as never),
      publicController: new PublicArtisanController(service as never),
    };
  }

  it('forces public list to ACTIVE status', async () => {
    const { publicController, service } = createController();
    service.findAll.mockResolvedValue([]);

    await publicController.findAll({ search: 'men lam' });

    expect(service.findAll).toHaveBeenCalledWith({ status: ARTISAN_STATUSES.ACTIVE, search: 'men lam' });
  });

  it('uses active slug lookup for public detail', async () => {
    const { publicController, service } = createController();
    service.findActiveBySlug.mockResolvedValue({ slug: 'nghe-nhan-a' });

    await publicController.findBySlug('nghe-nhan-a');

    expect(service.findActiveBySlug).toHaveBeenCalledWith('nghe-nhan-a');
  });

  it('admin list preserves requested filters', async () => {
    const { controller, service } = createController();
    service.findAll.mockResolvedValue([]);

    await controller.findAll({ status: ARTISAN_STATUSES.INACTIVE, search: 'men lam' });

    expect(service.findAll).toHaveBeenCalledWith({ status: ARTISAN_STATUSES.INACTIVE, search: 'men lam' });
  });

  it('rejects avatar upload when file is missing', async () => {
    const { controller } = createController();

    await expect(controller.uploadAvatar('artisan-1', undefined)).rejects.toBeInstanceOf(HttpException);
  });

  it('stores avatar as relative upload path', async () => {
    const { controller, service } = createController();
    service.setAvatar.mockResolvedValue({ avatar: 'uploads/artisans/artisan-1/avatar/avatar.png' });

    await controller.uploadAvatar('artisan-1', { filename: 'avatar.png' } as Express.Multer.File);

    expect(service.setAvatar).toHaveBeenCalledWith('artisan-1', 'uploads/artisans/artisan-1/avatar/avatar.png');
  });
});
