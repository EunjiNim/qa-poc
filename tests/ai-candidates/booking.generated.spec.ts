import { test } from '@playwright/test';
import { BookingPage } from '../../page-objects/BookingPage';

// risk: high | id: TC-001
test('결제 실패 시 슬롯이 다시 열리는지 확인', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('테스트 매장');
  await booking.selectSlot('10:00');
  await booking.payWithCard('0000-0000-0000-0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('10:00');
});

// risk: high | id: TC-002
test('결제 성공 시 슬롯이 다시 열리지 않는지 확인', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('테스트 매장');
  await booking.selectSlot('11:00');
  await booking.payWithCard('1234-5678-9012-3456');
  await booking.expectConfirmed();
});

// risk: high | id: TC-003
test('결제 실패 후 재시도하여 예약 확정 가능한지 확인', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('테스트 매장');
  await booking.selectSlot('14:00');
  await booking.payWithCard('0000-0000-0000-0000');
  await booking.selectSlot('14:00');
  await booking.payWithCard('1234-5678-9012-3456');
  await booking.expectConfirmed();
});

// risk: high | id: TC-004
test('결제 실패 후 다른 사용자가 동일 슬롯 예약 가능한지 확인', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('테스트 매장');
  await booking.selectSlot('15:00');
  await booking.payWithCard('0000-0000-0000-0000');
  await booking.selectSlot('15:00');
  await booking.payWithCard('9999-8888-7777-6666');
  await booking.expectSlotReopened('15:00');
  await booking.expectConfirmed();
});

// risk: low | id: TC-005
test('[POM 확장 필요] 결제 실패 후 슬롯 재오픈 시 UI에 즉시 반영되는지 확인', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('테스트 매장');
  await booking.selectSlot('16:00');
  await booking.payWithCard('0000-0000-0000-0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('16:00');
});

