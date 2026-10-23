export type Config = {
  enabled: boolean;
  title: string;
  amount: number;
  currency: string;
  durationMinutes: number;
  timeZone: string;
  policyText: string;
  policyVersion: string;
  horizonDays: number;
  webAppUrl?: string;
};
export type BookingRecord = {
  id: string;
  start: string;
  name: string;
  status: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  meeting: string;
  canCancel: boolean;
  canReschedule: boolean;
  refundAmount: number;
  refundStatus: string;
  checkoutUrl: string;
  message: string;
};
declare global {
  interface Window {
    google?: {
      script: {
        run: any;
        url: {
          getLocation: (callback: (location: { hash: string }) => void) => void;
        };
      };
    };
  }
}
export function api<T>(
  action: string,
  input: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!window.google?.script?.run) {
      reject(
        new Error(
          'Open this booking tool through its deployed Google Apps Script URL.',
        ),
      );
      return;
    }
    window.google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((e: { message: string }) =>
        reject(new Error(e.message || 'The request failed. Please retry.')),
      )
      .bookingApi(action, input);
  });
}
export function locationData(): Promise<URLSearchParams> {
  return new Promise((resolve) => {
    if (window.google?.script?.url)
      window.google.script.url.getLocation((location) =>
        resolve(new URLSearchParams(location.hash)),
      );
    else resolve(new URLSearchParams(window.location.hash.slice(1)));
  });
}
