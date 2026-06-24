import { test } from '@playwright/test';
import { ReportPage } from '../../page-objects/ReportPage';

// risk: high | id: TC-101 | type: display
test('정상 데이터 마일리지 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('normal');
  await report.expectMileageDisplayed('45,230 km');
  await report.expectVisualMatch('snapshot_normal');
});

// risk: medium | id: TC-102 | type: display
test('정비 항목 없는 경우 빈 상태 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('empty');
  await report.expectMileageDisplayed('12,000 km');
  await report.expectEmptyState();
  await report.expectVisualMatch('snapshot_empty');
});

// risk: medium | id: TC-103 | type: display
test('대용량 마일리지 데이터 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('large');
  await report.expectMileageDisplayed('987,654 km');
  await report.expectVisualMatch('snapshot_large');
});

// risk: high | id: TC-104 | type: display
test('비인가 접근 시 접근 차단 메시지 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('unauthorized');
  await report.expectAccessDenied();
  await report.expectVisualMatch('snapshot_unauthorized');
});

