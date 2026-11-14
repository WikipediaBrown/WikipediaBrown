/* Pure scheduling/payment rules, exercised by tests. No Google dependencies. */
function overlaps_(a, b, c, d) {
  return a < d && c < b;
}
function blocksSlot_(row) {
  return !['expired', 'cancelled', 'refunded'].includes(row.status);
}
function paidSession_(session, booking) {
  return (
    session.payment_status === 'paid' &&
    session.status === 'complete' &&
    session.amount_total === booking.amount &&
    session.currency === booking.currency &&
    session.client_reference_id === booking.id &&
    session.metadata &&
    session.metadata.booking_id === booking.id
  );
}
function localParts_(date, zone) {
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date(date));
  var p = {};
  parts.forEach(function (x) {
    p[x.type] = x.value;
  });
  return {
    day: p.year + '-' + p.month + '-' + p.day,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      p.weekday,
    ),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}
function slotAllowed_(start, config, now) {
  var p = localParts_(start, config.timeZone),
    end = start + config.durationMinutes * 60000;
  if (
    !Number.isFinite(start) ||
    start < now + config.minimumNoticeHours * 3600000 ||
    start > now + config.horizonDays * 86400000
  )
    return false;
  if ((config.blockedDates || []).includes(p.day)) return false;
  var endParts = localParts_(end, config.timeZone);
  if (
    p.day !== endParts.day ||
    endParts.minutes - p.minutes !== config.durationMinutes
  )
    return false;
  return (config.weeklyHours[String(p.weekday)] || []).some(function (w) {
    return (
      p.minutes >= w[0] &&
      endParts.minutes <= w[1] &&
      (p.minutes - w[0]) % 30 === 0
    );
  });
}
function policyAllows_(row, config, type, now) {
  if (type === 'reschedule')
    return (
      row.paymentStatus === 'paid' &&
      ['confirmed', 'cancelled'].includes(row.status)
    );
  return row.status === 'confirmed';
}
function configurationErrors_(c) {
  var errors = [];
  if (!['google-meet', 'link'].includes(c.meetingMode))
    errors.push('meetingMode');
  if (c.meetingMode === 'link' && !c.meetingLocation)
    errors.push('meetingLocation');
  [
    'ownerEmail',
    'spreadsheetId',
    'calendarId',
    'webAppUrl',
    'policyText',
    'policyVersion',
  ].forEach(function (k) {
    if (!c[k]) errors.push(k);
  });
  [
    'minimumNoticeHours',
    'bufferMinutes',
    'cancellationNoticeHours',
    'rescheduleNoticeHours',
    'reminderHours',
  ].forEach(function (k) {
    if (typeof c[k] !== 'number' || !Number.isFinite(c[k]) || c[k] < 0)
      errors.push(k);
  });
  if (
    !Number.isInteger(c.horizonDays) ||
    c.horizonDays < 1 ||
    c.horizonDays > 90
  )
    errors.push('horizonDays (1–90)');
  if (
    !Number.isInteger(c.durationMinutes) ||
    c.durationMinutes < 15 ||
    c.durationMinutes > 240
  )
    errors.push('durationMinutes');
  if (!Number.isInteger(c.amount) || c.amount < 50) errors.push('amount');
  if (c.currency !== 'usd') errors.push('currency (this offer is USD)');
  if (
    typeof c.refundPercent !== 'number' ||
    c.refundPercent < 0 ||
    c.refundPercent > 100
  )
    errors.push('refundPercent');
  if (!c.weeklyHours || !Object.keys(c.weeklyHours).length)
    errors.push('weeklyHours');
  Object.keys(c.weeklyHours || {}).forEach(function (day) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(c.weeklyHours[day])) {
      errors.push('weeklyHours');
      return;
    }
    c.weeklyHours[day].forEach(function (w) {
      if (
        !Array.isArray(w) ||
        w.length !== 2 ||
        !Number.isInteger(w[0]) ||
        !Number.isInteger(w[1]) ||
        w[0] < 0 ||
        w[1] > 1440 ||
        w[0] >= w[1]
      )
        errors.push('weeklyHours window');
    });
  });
  try {
    localParts_(Date.now(), c.timeZone);
  } catch (e) {
    errors.push('timeZone');
  }
  if (
    c.webAppUrl &&
    !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(
      c.webAppUrl,
    )
  )
    errors.push('webAppUrl');
  return errors;
}

function midnight_(day, zone) {
  var target = Date.parse(day + 'T00:00:00Z'),
    guess = target;
  for (var i = 0; i < 3; i++) {
    var p = localParts_(guess, zone);
    var asUTC = Date.parse(p.day + 'T00:00:00Z') + p.minutes * 60000;
    guess += target - asUTC;
  }
  return guess;
}
