import {
  IN_APP_NOTIFICATION_TYPE,
  IN_APP_NOTIFICATION_STATUS,
  validateInAppPayload,
  type InAppNotificationPayload,
} from './in-app-notification';

describe('validateInAppPayload', () => {
  const validPayload: InAppNotificationPayload = {
    tenantId: 'tenant-1',
    recipientId: 'user-1',
    title: 'Test notification',
    type: IN_APP_NOTIFICATION_TYPE.INFO,
  };

  it('should pass for valid payload', () => {
    const result = validateInAppPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if tenantId missing', () => {
    const result = validateInAppPayload({ ...validPayload, tenantId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tenantId is required');
  });

  it('should fail if recipientId missing', () => {
    const result = validateInAppPayload({ ...validPayload, recipientId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('recipientId is required');
  });

  it('should fail if title missing', () => {
    const result = validateInAppPayload({ ...validPayload, title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title is required');
  });

  it('should fail for invalid notification type', () => {
    const result = validateInAppPayload({ ...validPayload, type: 'INVALID' as any });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid notification type');
  });
});

describe('InAppNotificationType constants', () => {
  it('should have expected values', () => {
    expect(IN_APP_NOTIFICATION_TYPE.INFO).toBe('INFO');
    expect(IN_APP_NOTIFICATION_TYPE.WARNING).toBe('WARNING');
    expect(IN_APP_NOTIFICATION_TYPE.PROMOTION).toBe('PROMOTION');
  });
});

describe('InAppNotificationStatus constants', () => {
  it('should have expected values', () => {
    expect(IN_APP_NOTIFICATION_STATUS.UNREAD).toBe('UNREAD');
    expect(IN_APP_NOTIFICATION_STATUS.READ).toBe('READ');
    expect(IN_APP_NOTIFICATION_STATUS.DISMISSED).toBe('DISMISSED');
    expect(IN_APP_NOTIFICATION_STATUS.ARCHIVED).toBe('ARCHIVED');
  });
});
