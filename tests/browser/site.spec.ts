import { test, expect } from '@playwright/test';
test('homepage preserves content and star canvas across navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Wikipedia');
  await page.screenshot({
    path: `review/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator('#stars')).toHaveCount(1);
  await expect(page.getByText('Office hours', { exact: false })).toHaveCount(0);
  await page.locator('main a[href="/advisory/"]').first().click();
  await expect(page.locator('h1')).toContainText('A conversation');
  await expect(page.locator('#stars')).toHaveCount(1);
  await expect(page.getByText('Booking is not open yet')).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('blog keeps all five routes, syntax highlighting, copy controls and feed', async ({
  page,
  request,
}) => {
  await page.goto('/blog/');
  await expect(page.locator('.posts__item')).toHaveCount(5);
  await page
    .getByRole('link', { name: 'What an AI Agent Actually Is', exact: true })
    .click();
  await expect(page.locator('h1')).toHaveText('What an AI Agent Actually Is');
  await expect(page.locator('main')).toContainText('The driver');
  await page.goto('/blog/why-i-ask-swift-engineers-to-build-autocomplete/');
  await expect(page.locator('pre').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy code to clipboard' }).first(),
  ).toBeVisible();
  expect((await request.get('/feed.xml')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});
test('mobile navigation uses a dismissible shadcn sheet', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'AI Advisory' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('A conversation');
});
test('unknown URL retains interactive terminal', async ({ page }) => {
  await page.goto('/no-such-page/');
  await expect(
    page.getByRole('heading', { name: 'Case unsolved.' }),
  ).toBeVisible();
  await page.getByLabel('Terminal command').fill('help');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('cd <page>');
});
test('reduced motion preserves a still starfield', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(200);
  const first = await page
    .locator('#stars')
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.waitForTimeout(100);
  const second = await page
    .locator('#stars')
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  expect(first).toEqual(second);
});
