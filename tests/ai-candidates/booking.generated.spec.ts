import { test } from '@playwright/test';
import { BookingPage } from '../../page-objects/BookingPage';

// risk: high | id: TC-001
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 미카 정비소 10:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('10:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('10:00');
});

// risk: high | id: TC-002
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 미카 정비소 14:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('14:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('14:00');
});

// risk: high | id: TC-003
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 미카 정비소 16:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('16:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('16:00');
});

// risk: high | id: TC-004
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 서울 모터스 10:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('서울 모터스');
  await booking.selectSlot('10:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('10:00');
});

// risk: high | id: TC-005
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 서울 모터스 14:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('서울 모터스');
  await booking.selectSlot('14:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('14:00');
});

// risk: high | id: TC-006
test('결제 실패 시 슬롯이 다시 열리는지 확인 - 서울 모터스 16:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('서울 모터스');
  await booking.selectSlot('16:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('16:00');
});

// risk: medium | id: TC-007
test('결제 성공 시 슬롯이 다시 열리지 않고 예약 확정되는지 확인 - 미카 정비소 10:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('10:00');
  await booking.payWithCard('1234');
  await booking.expectConfirmed();
});

// risk: medium | id: TC-008
test('결제 성공 시 슬롯이 다시 열리지 않고 예약 확정되는지 확인 - 서울 모터스 14:00', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('서울 모터스');
  await booking.selectSlot('14:00');
  await booking.payWithCard('1234');
  await booking.expectConfirmed();
});

