import { test } from '@playwright/test';
import { ReportPage } from '../../page-objects/ReportPage';

// risk: high | id: TC-101 | type: display
test('정상 데이터 - 누적 주행거리 및 정비 내역 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('normal');
  await report.expectMileageDisplayed('45,230 km');
  await report.expectVisualMatch('maintenance-report-normal');
});

// risk: high | id: TC-102 | type: display
test('정비 내역 없음 - 빈 상태 안내 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('empty');
  await report.expectMileageDisplayed('12,000 km');
  await report.expectEmptyState();
  await report.expectVisualMatch('maintenance-report-empty');
});

// risk: medium | id: TC-103 | type: display
test('대용량 주행거리 데이터 - 높은 누적 주행거리 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('large');
  await report.expectMileageDisplayed('987,654 km');
  await report.expectVisualMatch('maintenance-report-large');
});

// risk: high | id: TC-104 | type: display
test('비인가 접근 - 접근 차단 메시지 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('unauthorized');
  await report.expectAccessDenied();
  await report.expectVisualMatch('maintenance-report-unauthorized');
});

