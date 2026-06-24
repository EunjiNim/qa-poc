import { test } from '@playwright/test';
import { ReportPage } from '../../page-objects/ReportPage';

// risk: medium | id: TC-101 | type: display
test('정상 데이터 표시', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('normal');
  await report.expectMileageDisplayed('45,230 km');
});

// risk: medium | id: TC-102 | type: display
test('정비 내역 없음 - 빈 상태 안내', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('empty');
  await report.expectEmptyState();
});

// risk: high | id: TC-103 | type: display
test('다른 사용자 리포트 접근 차단', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('unauthorized');
  await report.expectAccessDenied();
});

// risk: low | id: TC-104 | type: display
test('대형 주행거리 값 - 레이아웃 시각적 회귀', async ({ page }) => {
  const report = new ReportPage(page);
  await report.goto('large');
  await report.expectVisualMatch('report-large-mileage');
});

