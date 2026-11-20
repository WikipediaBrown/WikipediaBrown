import { test, expect } from '@playwright/test';
async function mockGoogle(page: any, manage = false) {
  await page.addInitScript(
    ({ manage }: { manage: boolean }) => {
      const slot = new Date(Date.now() + 3 * 86400000);
      slot.setUTCHours(20, 0, 0, 0);
      const start = slot.toISOString();
      let paid = false;
      let cancelled = false;
      let success: (value: any) => void;
      const run = {
        withSuccessHandler(fn: any) {
          success = fn;
          return run;
        },
        withFailureHandler() {
          return run;
        },
        bookingApi(action: string, input: any) {
          const callback = success;
          let result: any;
          const config = {
            enabled: true,
            title: 'Private AI Advisory',
            amount: 50000,
            currency: 'usd',
            durationMinutes: 60,
            timeZone: 'America/Los_Angeles',
            policyText:
              'All payments are non-refundable, including cancellations. Cancelled paid sessions can be rescheduled to another available time without another payment.',
            policyVersion: 'test-1',
            horizonDays: 30,
          };
          if (action === 'config') result = config;
          if (action === 'slots') result = [start];
          if (action === 'reserve')
            result = {
              id: 'testbooking',
              token: 'testtoken',
              url: 'https://checkout.stripe.com/test',
            };
          if (action === 'cancel') cancelled = true;
          if (action === 'reschedule') cancelled = false;
          if (
            action === 'status' ||
            action === 'cancel' ||
            action === 'reschedule'
          )
            result = {
              id: 'testbooking',
              start,
              name: 'Jane Smith',
              status: cancelled
                ? 'cancelled'
                : manage
                  ? 'confirmed'
                  : 'pending',
              paymentStatus: manage ? 'paid' : 'unpaid',
              amount: 50000,
              currency: 'usd',
              meeting: manage ? 'https://meet.google.com/test' : '',
              canCancel: manage && !cancelled,
              canReschedule: manage,
              refundAmount: 0,
              refundStatus: '',
              checkoutUrl: manage ? '' : 'https://checkout.stripe.com/test',
              message: '',
            };
          setTimeout(() => callback(result), 5);
        },
      };
      (window as any).google = {
        script: {
          run,
          url: {
            getLocation: (callback: any) =>
              callback({
                hash: manage ? 'booking=testbooking&token=testtoken' : '',
              }),
          },
        },
      };
    },
    { manage },
  );
}
test('custom booking calendar, intake, policies and checkout work together', async ({
  page,
}, testInfo) => {
  await mockGoogle(page);
  await page.goto('http://127.0.0.1:4174');
  await expect(page.getByText('Choose a time', { exact: true })).toBeVisible();
  await page
    .locator('[data-bits-day]:not([data-unavailable]):not([data-disabled])')
    .first()
    .click();
  await page
    .getByRole('button', { name: /\d+:\d+ [AP]M/ })
    .first()
    .click();
  await page.getByLabel('Name', { exact: true }).fill('Jane Smith');
  await page.getByLabel('Email', { exact: true }).fill('jane@example.com');
  await page
    .getByLabel('Your main question')
    .fill('Which AI approach should I use for my business?');
  await page.getByRole('checkbox').check();
  await page.screenshot({
    path: `review/booking-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Reserve and pay $500.00' }).click();
  await expect(
    page.getByText('Your appointment', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Continue to secure payment' }),
  ).toHaveAttribute('href', 'https://checkout.stripe.com/test');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('management link displays confirmed appointment and cancellation result', async ({
  page,
}) => {
  await mockGoogle(page, true);
  await page.goto('http://127.0.0.1:4174');
  await expect(page.getByText('Hello, Jane Smith.')).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel session' }).click();
  await expect(page.getByText('cancelled', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Your paid session remains available.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await page
    .locator('[data-bits-day]:not([data-unavailable]):not([data-disabled])')
    .first()
    .click();
  await page
    .getByRole('button', { name: /\d+:\d+ [AP]M/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Confirm reschedule', exact: true })
    .click();
  await expect(page.getByText('confirmed', { exact: true })).toBeVisible();
});
