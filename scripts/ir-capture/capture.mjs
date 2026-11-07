// Gyro IR 캡처 스크립트 — 실행 중인 로컬 Gyro(웹 4173, API 3001)의 실제 화면을 PNG로 저장한다.
// 사용법은 같은 폴더의 README.md 참고. 화면을 꾸미거나 응답을 흉내 내지 않는다.
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.GYRO_URL ?? 'http://localhost:4173';
const outDir = resolve(here, '../../presentations/gyro-ir-v3/captures');
const withChat = process.argv.includes('--chat');
const firstMessage = process.env.GYRO_CHAT_MESSAGE ?? '팀 일정 맞추는 데 시간이 너무 많이 들어요.';
const followUp = process.env.GYRO_CHAT_FOLLOWUP ?? '팀원은 5명이고, 무료로 바로 쓸 수 있으면 좋겠어요.';

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR' });
const page = await context.newPage();
// 캡처 중 클릭이 관심·랭킹 집계에 섞이지 않도록 이벤트 전송을 막는다.
await page.route('**/api/events', (route) => route.fulfill({ status: 202, body: '{}' }));
const saved = [];
const failed = [];

async function shot(name, fullPage = false) {
  await page.waitForTimeout(600);
  const path = resolve(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage });
  saved.push(`${name}.png`);
  console.log(`saved  ${name}.png`);
}

async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    failed.push(name);
    console.log(`skip   ${name}: ${error.message.split('\n')[0]}`);
  }
}

async function visible(selector, timeout = 15000) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout });
}

async function openHome() {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-enter-service]').first().click();
  await visible('#home');
}

await step('01-landing', async () => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await visible('#landing');
  await shot('01-landing');
});

await step('02-home-assistant', async () => {
  await openHome();
  await shot('02-home-assistant');
});

await step('03-discovery-catalog', async () => {
  await page.locator('#catalog-nav').click();
  await visible('#discovery');
  await page.locator('#home-service-list > *').first().waitFor({ state: 'visible', timeout: 30000 });
  await shot('03-discovery-catalog');
});

await step('04-profile', async () => {
  await page.locator('#start-button').click();
  await visible('#profile');
  await page.locator('#audience-choices button').first().click();
  const interests = page.locator('#interest-choices button');
  const count = Math.min(await interests.count(), 2);
  for (let i = 0; i < count; i += 1) await interests.nth(i).click();
  await page.locator('#profile-next:not([disabled])').waitFor({ timeout: 30000 });
  await shot('04-profile');
});

await step('05-card', async () => {
  await page.locator('#profile-next').click();
  await visible('#cards');
  await page.waitForTimeout(6000); // 카드 이미지 로딩 대기
  await shot('05-card');
});

await step('06-results', async () => {
  for (let i = 0; i < 12; i += 1) {
    if (await page.locator('#results').isVisible()) break;
    await page.locator(i % 3 === 2 ? '#reject-button' : '#like-button').click();
    await page.waitForTimeout(450);
  }
  await visible('#results', 5000);
  await shot('06-results');
});

if (withChat) {
  await step('08-chat', async () => {
    await openHome();
    await page.locator('#assistant-message').fill(firstMessage);
    await page.locator('#assistant-consent').check();
    await page.locator('#assistant-send').click();
    await page.locator('.assistant-message-pending').waitFor({ state: 'detached', timeout: 90000 });
    if (await page.getByText('모의 응답').count()) throw new Error('모의 응답 표시가 있어 캡처하지 않음');
    if (!(await page.locator('.assistant-message-ai').count())) throw new Error('AI 응답 없음 — API 설정 확인');
    await shot('08-chat-first-reply');
    if (!(await page.locator('.assistant-recommendation').count())) {
      await page.locator('#assistant-message').fill(followUp);
      await page.locator('#assistant-send').click();
      await page.locator('.assistant-message-pending').waitFor({ state: 'detached', timeout: 90000 });
    }
    await page.locator('.assistant-recommendation').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.assistant-recommendation').last().scrollIntoViewIfNeeded();
    await shot('09-chat-recommendations');
  });
}

await browser.close();
console.log(`\n저장 ${saved.length}장 → ${outDir}`);
if (failed.length) console.log(`건너뜀: ${failed.join(', ')}`);
