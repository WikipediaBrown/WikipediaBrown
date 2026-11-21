const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const example = JSON.parse(fs.readFileSync('backend/config.example.json'));
function harness() {
  const c = {
    ...example,
    enabled: true,
    ownerEmail: 'owner@example.com',
    spreadsheetId: 'sheet',
    calendarId: 'calendar',
    weeklyHours: {
      0: [[600, 1020]],
      1: [[600, 1020]],
      2: [[600, 1020]],
      3: [[600, 1020]],
      4: [[600, 1020]],
      5: [[600, 1020]],
      6: [[600, 1020]],
    },
    minimumNoticeHours: 0,
    bufferMinutes: 0,
    horizonDays: 7,
    cancellationNoticeHours: 0,
    rescheduleNoticeHours: 0,
    refundPercent: 100,
    reminderHours: 24,
    policyText: 'Cancel for full refund.',
    policyVersion: '1',
    meetingMode: 'link',
    meetingLocation: 'https://meet.google.com/test',
    webAppUrl: 'https://script.google.com/macros/s/test/exec',
  };
  const records = [],
    events = new Map(),
    sessions = new Map(),
    sent = [];
  let calls = 0,
    failCalendar = false,
    refundCalls = 0;
  const context = {
    console,
    Intl,
    Date,
    JSON,
    Number,
    Array,
    Math,
    Set,
    encodeURIComponent,
    Utilities: { getUuid: () => crypto.randomUUID() },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    MailApp: { getRemainingDailyQuota: () => 100 },
    Calendar: {
      Events: {
        get: (id, event) => {
          if (!events.has(event)) throw Error('404 Not Found');
          return events.get(event);
        },
        insert: (e) => {
          if (failCalendar) throw Error('Temporary Calendar failure');
          const event = { ...e, htmlLink: 'https://calendar.google.com/event' };
          events.set(e.id, event);
          return event;
        },
        patch: (p, id, event) => {
          Object.assign(events.get(event), p);
          return events.get(event);
        },
        remove: (id, event) => events.delete(event),
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync('backend/Domain.gs', 'utf8') +
      '\n' +
      fs.readFileSync('backend/Booking.gs', 'utf8'),
    context,
  );
  context.config_ = () => c;
  context.rows_ = () => records;
  context.save_ = (row) => {
    const index = records.findIndex((x) => x.id === row.id);
    if (index < 0) records.push(row);
    else records[index] = row;
  };
  context.busy_ = () => [];
  context.token_ = (id) => 'token-' + id;
  context.send_ = (...args) => sent.push(args);
  context.Utilities.formatDate = (d) => d.toISOString();
  context.stripe_ = (method, path, payload, key) => {
    calls++;
    if (path === 'checkout/sessions') {
      if (sessions.has(key)) return sessions.get(key);
      const session = {
        id: 'cs_' + records.at(-1).id,
        url: 'https://checkout.stripe.com/test',
        status: 'open',
        payment_status: 'unpaid',
        amount_total: payload['line_items[0][price_data][unit_amount]'],
        currency: 'usd',
        client_reference_id: payload.client_reference_id,
        metadata: { booking_id: payload['metadata[booking_id]'] },
      };
      sessions.set(key, session);
      sessions.set(session.id, session);
      return session;
    }
    if (path.endsWith('/expire')) {
      const s = sessions.get(path.split('/')[2]);
      s.status = 'expired';
      return s;
    }
    if (path.startsWith('checkout/sessions/'))
      return sessions.get(path.split('/')[2]);
    if (path.startsWith('payment_intents/'))
      return { latest_charge: { amount_refunded: 0 } };
    if (path === 'refunds') {
      refundCalls++;
      return { id: 're_test', status: 'succeeded' };
    }
    if (path === 'refunds/re_test')
      return { id: 're_test', status: 'succeeded' };
    throw Error('Unexpected Stripe path: ' + path);
  };
  return {
    x: context,
    c,
    records,
    events,
    sessions,
    sent,
    setFail: (v) => (failCalendar = v),
    get refundCalls() {
      return refundCalls;
    },
    get calls() {
      return calls;
    },
  };
}
function payload(h, start) {
  return {
    name: 'Customer',
    email: 'customer@example.com',
    question: 'How should I evaluate an AI idea?',
    start,
    accepted: true,
    policyVersion: '1',
    requestId: crypto.randomUUID(),
  };
}
function reserve(h) {
  const slot = h.x.slots_(h.c)[0];
  assert.ok(slot);
  const p = payload(h, slot);
  const result = h.x.reserve_(h.c, p);
  return {
    p,
    result,
    row: h.records[0],
    session: h.sessions.get('checkout-' + result.id),
  };
}
function pay(s) {
  s.payment_status = 'paid';
  s.status = 'complete';
  s.payment_intent = 'pi_test';
}
test('Pacific availability follows PST and PDT rather than fixed UTC offset', () => {
  const { x, c } = harness();
  c.weeklyHours = { 1: [[600, 720]] };
  assert.equal(
    x.slotAllowed_(
      Date.parse('2026-01-12T18:00:00Z'),
      c,
      Date.parse('2026-01-11'),
    ),
    true,
  );
  assert.equal(
    x.slotAllowed_(
      Date.parse('2026-07-13T17:00:00Z'),
      c,
      Date.parse('2026-07-12'),
    ),
    true,
  );
  assert.equal(
    x.slotAllowed_(
      Date.parse('2026-07-13T16:30:00Z'),
      c,
      Date.parse('2026-07-12'),
    ),
    false,
  );
});
test('notice, blocked dates, window end and alignment are enforced', () => {
  const { x, c } = harness();
  const now = Date.parse('2026-01-12T17:00:00Z');
  c.minimumNoticeHours = 2;
  assert.equal(
    x.slotAllowed_(Date.parse('2026-01-12T18:00:00Z'), c, now),
    false,
  );
  c.minimumNoticeHours = 0;
  c.blockedDates = ['2026-01-12'];
  assert.equal(
    x.slotAllowed_(Date.parse('2026-01-12T18:00:00Z'), c, now),
    false,
  );
  c.blockedDates = [];
  assert.equal(
    x.slotAllowed_(Date.parse('2026-01-12T18:15:00Z'), c, now),
    false,
  );
  assert.equal(
    x.slotAllowed_(Date.parse('2026-01-13T00:30:00Z'), c, now),
    false,
  );
});
test('all-day boundaries use the calendar timezone on DST transition days', () => {
  const { x } = harness();
  assert.equal(
    new Date(x.midnight_('2026-03-08', 'America/Los_Angeles')).toISOString(),
    '2026-03-08T08:00:00.000Z',
  );
  assert.equal(
    new Date(x.midnight_('2026-03-09', 'America/Los_Angeles')).toISOString(),
    '2026-03-09T07:00:00.000Z',
  );
});
test('adjacent slots do not overlap; active operations block slots', () => {
  const { x } = harness();
  assert.equal(x.overlaps_(0, 60, 60, 120), false);
  assert.equal(x.overlaps_(0, 60, 59, 120), true);
  for (const status of [
    'creating',
    'pending',
    'paid',
    'confirmed',
    'attention',
  ])
    assert.equal(x.blocksSlot_({ status }), true);
  for (const status of ['expired', 'cancelled', 'refunded'])
    assert.equal(x.blocksSlot_({ status }), false);
});
test('configuration fails closed when availability and policies are unset', () => {
  const { x } = harness();
  const errors = x.configurationErrors_(example);
  assert.ok(errors.includes('ownerEmail'));
  assert.ok(errors.includes('calendarId'));
  assert.ok(errors.includes('webAppUrl'));
});
test('reservation uses server price and blocks a competing buyer', () => {
  const h = harness();
  const { p, row, session } = reserve(h);
  assert.equal(row.amount, 50000);
  assert.equal(session.amount_total, 50000);
  assert.throws(
    () =>
      h.x.reserve_(h.c, {
        ...p,
        email: 'second@example.com',
        requestId: crypto.randomUUID(),
        amount: 1,
      }),
    /no longer available/,
  );
});
test('retrying the same reservation returns the same checkout', () => {
  const h = harness();
  const { p, result } = reserve(h);
  const repeat = h.x.reserve_(h.c, p);
  assert.equal(repeat.id, result.id);
  assert.equal(h.records.length, 1);
  assert.equal(h.calls, 1);
});
test('policy acceptance and version are required before payment', () => {
  const h = harness(),
    p = payload(h, h.x.slots_(h.c)[0]);
  assert.throws(() => h.x.reserve_(h.c, { ...p, accepted: false }), /policies/);
  assert.throws(
    () => h.x.reserve_(h.c, { ...p, policyVersion: 'old' }),
    /policies/,
  );
});
test('paid session must match amount, currency and booking identity', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  assert.equal(h.x.paidSession_(session, row), true);
  for (const patch of [
    { amount_total: 1 },
    { currency: 'eur' },
    { client_reference_id: 'other' },
    { metadata: { booking_id: 'other' } },
    { status: 'open' },
  ])
    assert.equal(h.x.paidSession_({ ...session, ...patch }, row), false);
});
test('a forged/mismatched payment is retained for review without creating an event', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  session.amount_total = 1;
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'attention');
  assert.equal(h.events.size, 0);
});
test('background reconciliation confirms payment even without a browser redirect', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'confirmed');
  assert.equal(h.events.size, 1);
  assert.equal(h.sent.length, 2);
  h.x.reconcileOne_(h.c, row);
  assert.equal(h.events.size, 1);
  assert.equal(h.sent.length, 2);
});
test('Calendar failure after payment is recoverable with no second charge', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  h.setFail(true);
  assert.throws(() => h.x.reconcileOne_(h.c, row), /Calendar/);
  assert.equal(row.status, 'paid');
  h.setFail(false);
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'confirmed');
  assert.equal(h.sessions.size, 2);
});
test('calendar insertion retry recovers an event created before Sheet persistence', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  h.events.set(row.id, {
    id: row.id,
    htmlLink: 'https://calendar.google.com/event',
  });
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'confirmed');
  assert.equal(h.events.size, 1);
});
test('expired checkout releases reservation, local clock alone does not', () => {
  const h = harness();
  const { row, session } = reserve(h);
  row.expiresAt = Date.now() / 1000 - 1;
  h.x.stripe_ = (method, path) => {
    if (path.endsWith('/expire')) throw Error('Network unavailable');
    return session;
  };
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'pending');
  session.status = 'expired';
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'expired');
});
test('a paid checkout discovered during expiration is confirmed, not released', () => {
  const h = harness();
  const { row, session } = reserve(h);
  row.expiresAt = Date.now() / 1000 - 1;
  const original = h.x.stripe_;
  h.x.stripe_ = (method, path, ...rest) => {
    if (path.endsWith('/expire')) {
      pay(session);
      throw Error('Already complete');
    }
    return original(method, path, ...rest);
  };
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'confirmed');
});
test('cancellation retries do not create another refund', () => {
  const h = harness();
  const { row, session } = reserve(h);
  pay(session);
  h.x.reconcileOne_(h.c, row);
  row.cancelRequested = true;
  row.refundAmount = row.amount;
  h.x.cancel_(h.c, row);
  h.x.cancel_(h.c, row);
  assert.equal(h.refundCalls, 1);
  assert.equal(row.status, 'refunded');
  assert.equal(h.events.size, 0);
});
test('cancelled paid sessions retain rescheduling credit until completion', () => {
  const { x, c } = harness();
  for (const status of ['confirmed', 'cancelled'])
    assert.equal(
      x.policyAllows_(
        { status, paymentStatus: 'paid' },
        c,
        'reschedule',
        Date.now(),
      ),
      true,
    );
  for (const status of ['completed', 'refunded', 'pending'])
    assert.equal(
      x.policyAllows_(
        { status, paymentStatus: 'paid' },
        c,
        'reschedule',
        Date.now(),
      ),
      false,
    );
});
test('pending reschedule protects both old and new slots', () => {
  const h = harness();
  const { row } = reserve(h);
  const next = h.x.slots_(h.c)[0];
  row.status = 'confirmed';
  row.rescheduleTarget = next;
  const available = h.x.slots_(h.c);
  assert.ok(!available.includes(next));
  assert.ok(!available.includes(row.start));
});
test('owner operations are not public Apps Script RPC functions', () => {
  const source = fs.readFileSync('backend/Owner.gs', 'utf8');
  const names = [...source.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]);
  assert.deepEqual(
    names.filter((n) => !n.endsWith('_')),
    ['onOpen'],
  );
  const backend = fs.readFileSync('backend/Booking.gs', 'utf8');
  assert.deepEqual(
    [...backend.matchAll(/^function (\w+)\(/gm)]
      .map((m) => m[1])
      .filter((n) => !n.endsWith('_')),
    ['doGet', 'bookingApi'],
  );
});
test('Google Meet confirmation waits for a conference link and recovers on retry', () => {
  const h = harness();
  h.c.meetingMode = 'google-meet';
  const { row, session } = reserve(h);
  pay(session);
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'paid');
  assert.equal(h.sent.length, 0);
  h.events.get(row.id).hangoutLink = 'https://meet.google.com/abc-defg-hij';
  h.x.reconcileOne_(h.c, row);
  assert.equal(row.status, 'confirmed');
  assert.equal(row.meeting, 'https://meet.google.com/abc-defg-hij');
  assert.equal(h.events.size, 1);
});
test('spreadsheet cells cannot interpret customer input as formulas', () => {
  const { x } = harness();
  for (const value of [
    '=IMPORTXML("https://bad")',
    '+SUM(1,2)',
    '@SUM(1,2)',
    '-10',
  ])
    assert.ok(x.safeCell_(value).startsWith("'"));
  assert.equal(x.safeCell_('Customer'), 'Customer');
});

test('no-refund cancellation keeps payment and rebooks without another checkout', () => {
  const h = harness();
  h.c.refundPercent = 0;
  const { row, session } = reserve(h);
  pay(session);
  h.x.reconcileOne_(h.c, row);
  row.cancelRequested = true;
  row.refundAmount = 0;
  h.x.cancel_(h.c, row);
  assert.equal(row.status, 'cancelled');
  assert.equal(row.paymentStatus, 'paid');
  assert.equal(h.refundCalls, 0);
  const next = h.x.slots_(h.c)[0];
  h.x.reschedule_(h.c, row, next);
  assert.equal(row.status, 'confirmed');
  assert.equal(h.sessions.size, 2);
  assert.equal(h.refundCalls, 0);
  assert.equal(h.events.size, 1);
});
