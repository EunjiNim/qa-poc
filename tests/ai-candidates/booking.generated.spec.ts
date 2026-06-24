import { test } from '@playwright/test';
import { BookingPage } from '../page-objects/BookingPage';

// risk: high | id: TC-001
test('정상 예약 흐름', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('14:00');
  await booking.payWithCard('4111111111111111');
  await booking.expectConfirmed();
});

// risk: high | id: TC-002
test('결제 실패 시 슬롯 재오픈', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('10:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('10:00');
});

// risk: medium | id: TC-003
test('다른 정비소에서도 동일한 결제 실패 처리', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('서울 모터스');
  await booking.selectSlot('16:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('16:00');
});

