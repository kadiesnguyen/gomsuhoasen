'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GHS_API } from '@gomhoasen/contracts';
import { showroomApiPost } from './showroom-api-client';
import {
  loadVietnamGeoTree,
  wardsForProvince,
  type GeoProvince,
  type GeoWard,
} from './vietnam-geo';
import css from './checkout-order-modal.module.css';

export interface CheckoutOrderModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productSlug?: string;
  unitPrice: number;
  priceLabel?: string;
}

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export function CheckoutOrderModal({
  open,
  onClose,
  productId,
  productName,
  productSlug,
  unitPrice,
  priceLabel,
}: CheckoutOrderModalProps) {
  const [provinces, setProvinces] = useState<GeoProvince[]>([]);
  const [wards, setWards] = useState<GeoWard[]>([]);
  const [geoError, setGeoError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tree, setTree] = useState<Awaited<ReturnType<typeof loadVietnamGeoTree>>>([]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setDone(false);
    setGeoError('');
    let cancelled = false;
    loadVietnamGeoTree()
      .then((data) => {
        if (cancelled) return;
        setTree(data);
        setProvinces(data.map(({ code, name, fullName }) => ({ code, name, fullName })));
      })
      .catch(() => {
        if (!cancelled) setGeoError('Không tải được danh sách tỉnh/thành.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      setWardCode('');
      return;
    }
    setWards(wardsForProvince(tree, provinceCode));
    setWardCode('');
  }, [provinceCode, tree]);

  const province = useMemo(
    () => provinces.find((item) => item.code === provinceCode),
    [provinces, provinceCode],
  );
  const ward = useMemo(() => wards.find((item) => item.code === wardCode), [wards, wardCode]);
  const total = unitPrice * quantity;
  const displayPrice = priceLabel || (unitPrice > 0 ? formatVnd(unitPrice) : 'Liên hệ');

  const resetAndClose = () => {
    if (submitting) return;
    setCustomerName('');
    setCustomerPhone('');
    setStreet('');
    setProvinceCode('');
    setWardCode('');
    setQuantity(1);
    setError('');
    setDone(false);
    onClose();
  };

  const submit = async () => {
    setError('');
    const name = customerName.trim();
    const phone = normalizePhone(customerPhone);
    const address = street.trim();
    if (name.length < 2) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }
    if (address.length < 3) {
      setError('Vui lòng nhập địa chỉ chi tiết.');
      return;
    }
    if (!province || !ward) {
      setError('Vui lòng chọn Tỉnh/TP và Phường/Xã.');
      return;
    }

    setSubmitting(true);
    try {
      await showroomApiPost(GHS_API.ORDER.PUBLIC_SUBMIT, {
        customerName: name,
        customerPhone: phone,
        shippingAddress: {
          street: address,
          provinceCode: province.code,
          provinceName: province.fullName || province.name,
          wardCode: ward.code,
          wardName: ward.fullName || ward.name,
        },
        lineItems: [
          {
            productId,
            productName,
            productSlug,
            quantity,
            unitPrice,
          },
        ],
      });
      setDone(true);
    } catch {
      setError('Không gửi được đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={css.backdrop} role="presentation" onClick={resetAndClose}>
      <div
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-order-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={css.head}>
          <h2 id="checkout-order-title">Đặt hàng</h2>
          <button type="button" className={css.close} aria-label="Đóng" onClick={resetAndClose}>
            ×
          </button>
        </div>

        <div className={css.product}>
          <div className={css.productName}>{productName}</div>
          <div className={css.productMeta}>Đơn giá: {displayPrice}</div>
        </div>

        {done ? (
          <div className={css.form}>
            <p className={css.success}>
              Đã nhận đơn hàng. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.
            </p>
            <div className={css.actions}>
              <button type="button" className={css.submit} onClick={resetAndClose}>
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <div className={css.form}>
            <div className={css.field}>
              <label htmlFor="checkout-name">Họ và tên</label>
              <input
                id="checkout-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
              />
            </div>
            <div className={css.field}>
              <label htmlFor="checkout-phone">Số điện thoại</label>
              <input
                id="checkout-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                disabled={submitting}
              />
            </div>
            <div className={css.field}>
              <label htmlFor="checkout-street">Địa chỉ chi tiết</label>
              <textarea
                id="checkout-street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                autoComplete="street-address"
                disabled={submitting}
              />
            </div>
            <div className={css.row}>
              <div className={css.field}>
                <label htmlFor="checkout-province">Tỉnh/TP</label>
                <select
                  id="checkout-province"
                  value={provinceCode}
                  onChange={(e) => setProvinceCode(e.target.value)}
                  disabled={submitting || Boolean(geoError)}
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={css.field}>
                <label htmlFor="checkout-ward">Phường/Xã</label>
                <select
                  id="checkout-ward"
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                  disabled={submitting || !provinceCode}
                >
                  <option value="">Chọn phường/xã</option>
                  {wards.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={css.field}>
              <label>Số lượng</label>
              <div className={css.qty}>
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  disabled={submitting || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  disabled={submitting}
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className={css.total}>
              <span>Tổng cộng</span>
              <span>{unitPrice > 0 ? formatVnd(total) : 'Liên hệ báo giá'}</span>
            </div>

            {geoError ? <p className={css.error}>{geoError}</p> : null}
            {error ? <p className={css.error}>{error}</p> : null}

            <div className={css.actions}>
              <button
                type="button"
                className={css.submit}
                disabled={submitting || Boolean(geoError)}
                onClick={() => void submit()}
              >
                {submitting ? 'Đang gửi...' : 'Đặt hàng'}
              </button>
              <button type="button" className={css.secondary} disabled={submitting} onClick={resetAndClose}>
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
