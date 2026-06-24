import { test } from '@playwright/test';
import { BookingPage } from '../../page-objects/BookingPage';

// 이 파일은 tests/ai-candidates/booking.generated.spec.ts에서 승격된 결과물입니다.
// 승격 근거: 이번 PoC 작업 중 실제로 결제 실패 시나리오에서 진짜 UI 버그를 한 번 잡아냈고,
// 수정 후 재실행에서 안정적으로 통과했습니다. (운영 모델 설계 문서의 "승격 기준" 항목과 동일한 흐름)
// core 스위트는 CI에서 실패 시 배포를 막는 권한을 가집니다.

test('정상 예약 흐름', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('14:00');
  await booking.payWithCard('4111111111111111');
  await booking.expectConfirmed();
});

test('결제 실패 시 슬롯 재오픈', async ({ page }) => {
  const booking = new BookingPage(page);
  await booking.goto();
  await booking.selectShop('미카 정비소');
  await booking.selectSlot('10:00');
  await booking.payWithCard('0000');
  await booking.expectPaymentFailed();
  await booking.expectSlotReopened('10:00');
});
