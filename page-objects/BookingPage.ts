import { Page, expect } from '@playwright/test';

// AI 테스트케이스 생성기에 "사용 가능한 action 목록"으로 그대로 전달되는 메서드들.
// AI는 이 메서드 이름과 시그니처 밖의 동작을 임의로 만들어내지 않도록 프롬프트에서 제한된다.
export class BookingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async selectShop(name: string) {
    await this.page.getByRole('button', { name }).click();
  }

  async selectSlot(time: string) {
    await this.page.getByRole('button', { name: time }).click();
  }

  async payWithCard(cardNumber: string) {
    await this.page.getByPlaceholder(/카드번호/).fill(cardNumber);
    await this.page.getByRole('button', { name: '결제하기' }).click();
  }

  async expectConfirmed() {
    await expect(this.page.getByText('예약이 완료되었습니다')).toBeVisible();
  }

  async expectPaymentFailed() {
    await expect(this.page.getByText('결제에 실패했습니다')).toBeVisible();
  }

  async expectSlotReopened(time: string) {
    await expect(this.page.getByRole('button', { name: time })).toBeVisible();
  }
}
