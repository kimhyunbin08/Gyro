import { expect, test } from '@playwright/test';

const services = Array.from({ length: 11 }, (_, index) => ({
  id: `service-${index + 1}`,
  name: `테스트 서비스 ${index + 1}`,
  tagline: '지역 서비스 발견 테스트',
  description: '설명',
  imageUrl: 'https://example.com/image.png',
  serviceUrl: `https://example.com/service-${index + 1}`,
  tags: ['학습'],
  audiences: ['student'],
  health: { status: 'healthy' },
}));

test('loads the real discovery flow and continues after a ten-card round', async ({ page }) => {
  await page.route('**/config.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ apiUrl: 'http://gyro-api.test' }),
  }));
  await page.route('http://gyro-api.test/api/services', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ services }),
  }));
  await page.route('http://gyro-api.test/api/events', (route) => route.fulfill({
    status: 202,
    contentType: 'application/json',
    body: '{}',
  }));

  await page.goto('/');
  const startButton = page.getByRole('button', { name: /발견 시작하기/ });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  await page.getByRole('button', { name: '학생이에요' }).click();
  await page.getByRole('button', { name: '학습' }).click();
  await page.getByRole('button', { name: /카드 만나보기/ }).click();
  await expect(page.locator('#progress')).toHaveText('1 / 10');

  for (let index = 0; index < 10; index += 1) {
    await page.locator('#reject-button').click();
    await page.waitForTimeout(350);
  }

  await expect(page.locator('#results-eyebrow')).toHaveText('중간 결과');
  await expect(page.locator('#results-pill')).toHaveText('10 / 11');
  await expect(page.getByRole('button', { name: /다음 1개 더 보기/ })).toBeVisible();

  await page.getByRole('button', { name: /다음 1개 더 보기/ }).click();
  await expect(page.locator('#progress')).toHaveText('1 / 1');
});
