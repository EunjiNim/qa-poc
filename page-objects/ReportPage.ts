import { Page, expect } from '@playwright/test';

// 조회형(read-only) 화면용 POM. BookingPage와 달리 "클릭해서 다음 단계로 넘어가는" 메서드가 아니라
// "특정 데이터 상태를 주입하고 화면에 올바르게 표시되는지 검증하는" 메서드로 구성된다.
export class ReportPage {
  constructor(private page: Page) {}

  async goto(scenario: string) {
    await this.page.goto(`/report.html?scenario=${scenario}`);
  }

  async expectMileageDisplayed(text: string) {
    await expect(this.page.locator('#mileage')).toHaveText(text);
  }

  async expectEmptyState() {
    await expect(this.page.getByText('이번 달 정비 내역이 없습니다.')).toBeVisible();
  }

  async expectAccessDenied() {
    await expect(this.page.getByText('접근 권한이 없습니다')).toBeVisible();
  }

  // 시각적 회귀: 레이아웃이 깨졌는지(텍스트 길이, 숫자 자리수 등으로 인한 줄바꿈/overflow)는
  // 개별 텍스트 assertion보다 스크린샷 비교가 더 잘 잡아낸다.
  async expectVisualMatch(snapshotName: string) {
    await expect(this.page).toHaveScreenshot(`${snapshotName}.png`);
  }
}
