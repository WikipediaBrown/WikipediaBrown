/* Public RPC surface: doGet and bookingApi only. All privileged helpers end in _. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Booking').setTitle(
    'Private AI Advisory — Wikipedia Brown',
  );
}
function bookingApi(action, input) {
  var c = config_(),
    p = input || {};
  if (action === 'config')
    return {
      enabled: c.enabled && configurationErrors_(c).length === 0,
      title: c.title,
      amount: c.amount,
      currency: c.currency,
      durationMinutes: c.durationMinutes,
      timeZone: c.timeZone,
      policyText: c.policyText || '',
      policyVersion: c.policyVersion || '',
      horizonDays: c.horizonDays || 0,
      webAppUrl: c.webAppUrl || '',
    };
  if (
    configurationErrors_(c).length ||
    (!c.enabled &&
      (action === 'reserve' || (action === 'slots' && !p.ignoreId)))
  )
    throw new Error('Booking is not currently open.');
  if (action === 'slots')
    return slots_(c, p.ignoreId ? authorize_(p.id, p.token).id : null);
  return locked_(function () {
    if (action === 'reserve') return reserve_(c, p);
    var row = authorize_(p.id, p.token);
    if (action === 'status') {
      reconcileOne_(c, row);
      return publicBooking_(row, c);
    }
    if (action === 'cancel') {
      if (!policyAllows_(row, c, 'cancel', Date.now()))
        throw new Error(
          'Online cancellation is outside the policy window. Contact the organizer.',
        );
      row.cancelRequested = true;
      row.refundAmount = Math.round((row.amount * row.refundPercent) / 100);
      save_(row, 'Cancellation requested');
      cancel_(c, row);
      return publicBooking_(row, c);
    }
    if (action === 'reschedule') return reschedule_(c, row, p.start);
    throw new Error('Unknown action.');
  });
}
function config_() {
  var raw =
    PropertiesService.getScriptProperties().getProperty('BOOKING_CONFIG');
  if (!raw) throw new Error('Booking is not configured.');
  return JSON.parse(raw);
}
function secret_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing server configuration: ' + name);
  return value;
}
function locked_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000))
    throw new Error('Booking is busy. Please try again.');
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}
function sheet_() {
  return SpreadsheetApp.openById(config_().spreadsheetId).getSheetByName(
    'Bookings',
  );
}
function rows_() {
  var s = sheet_();
  if (!s || s.getLastRow() < 2) return [];
  return s
    .getRange(2, 13, s.getLastRow() - 1, 1)
    .getValues()
    .map(function (r) {
      return JSON.parse(r[0]);
    });
}
function find_(id) {
  if (!/^[a-f0-9]{32}$/.test(id || ''))
    throw new Error('Invalid booking link.');
  var row = rows_().find(function (r) {
    return r.id === id;
  });
  if (!row) throw new Error('Booking not found.');
  return row;
}
function token_(id) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(id, secret_('BOOKING_SIGNING_KEY')),
  ).replace(/=+$/, '');
}
function authorize_(id, token) {
  var expected = token_(String(id)),
    given = String(token || '');
  var difference = expected.length ^ given.length;
  for (var i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  if (difference) throw new Error('Invalid booking link.');
  return find_(id);
}
function safeCell_(value) {
  var s = String(value || '');
  return /^[=+@\-\t\r]/.test(s) ? "'" + s : s;
}
function save_(row, note) {
  row.updated = new Date().toISOString();
  var s = sheet_();
  var ids =
    s.getLastRow() > 1
      ? s.getRange(2, 1, s.getLastRow() - 1, 1).getValues()
      : [];
  var index = ids.findIndex(function (x) {
    return x[0] === row.id;
  });
  var cells = [
    row.id,
    Utilities.formatDate(
      new Date(row.start),
      config_().timeZone,
      'EEE, MMM d, yyyy h:mm a z',
    ),
    row.name,
    row.email,
    row.question,
    row.status,
    row.paymentStatus || '',
    row.amount / 100,
    row.currency,
    row.calendarUrl || '',
    row.checkoutUrl || '',
    row.error || '',
    JSON.stringify(row),
  ].map(safeCell_);
  s.getRange(
    index < 0 ? s.getLastRow() + 1 : index + 2,
    1,
    1,
    cells.length,
  ).setValues([cells]);
  if (note)
    SpreadsheetApp.openById(config_().spreadsheetId)
      .getSheetByName('History')
      .appendRow([new Date().toISOString(), row.id, safeCell_(note)]);
}
function manageUrl_(row, c) {
  return c.webAppUrl + '#booking=' + row.id + '&token=' + token_(row.id);
}
function publicBooking_(row, c) {
  return {
    id: row.id,
    start: row.start,
    name: row.name,
    status: row.status,
    paymentStatus: row.paymentStatus || 'unpaid',
    amount: row.amount,
    currency: row.currency,
    meeting: row.meeting || '',
    canCancel: policyAllows_(row, c, 'cancel', Date.now()),
    canReschedule: policyAllows_(row, c, 'reschedule', Date.now()),
    refundAmount: row.refundAmount || 0,
    refundStatus: row.refundStatus || '',
    checkoutUrl: row.status === 'pending' ? row.checkoutUrl : '',
    message: row.error
      ? 'Your booking needs organizer attention. You will be contacted.'
      : '',
  };
}
function busy_(c, from, to, ignoreEvent) {
  var ids = Array.from(
      new Set([c.calendarId].concat(c.conflictCalendarIds || [])),
    ),
    busy = [];
  ids.forEach(function (id) {
    var pageToken;
    do {
      var result = Calendar.Events.list(id, {
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        singleEvents: true,
        maxResults: 2500,
        pageToken: pageToken,
      });
      (result.items || []).forEach(function (e) {
        if (
          e.status === 'cancelled' ||
          e.transparency === 'transparent' ||
          e.id === ignoreEvent
        )
          return;
        var a = e.start.dateTime
          ? Date.parse(e.start.dateTime)
          : midnight_(e.start.date, result.timeZone || c.timeZone);
        var b = e.end.dateTime
          ? Date.parse(e.end.dateTime)
          : midnight_(e.end.date, result.timeZone || c.timeZone);
        busy.push([a, b]);
      });
      pageToken = result.nextPageToken;
    } while (pageToken);
  });
  return busy;
}
function slots_(c, ignoreId) {
  var now = Date.now(),
    end = now + c.horizonDays * 86400000,
    all = rows_(),
    ignore = ignoreId
      ? all.find(function (r) {
          return r.id === ignoreId;
        })
      : null;
  var busy = busy_(c, now, end, ignore && ignore.eventId),
    buffer = c.bufferMinutes * 60000,
    out = [];
  var reservations = all.filter(function (r) {
    return r.id !== ignoreId && blocksSlot_(r);
  });
  reservations = reservations.concat(
    reservations
      .filter(function (r) {
        return r.rescheduleTarget;
      })
      .map(function (r) {
        return {
          start: r.rescheduleTarget,
          end: new Date(
            Date.parse(r.rescheduleTarget) + c.durationMinutes * 60000,
          ).toISOString(),
        };
      }),
  );
  for (var t = Math.ceil(now / 1800000) * 1800000; t <= end; t += 1800000) {
    if (!slotAllowed_(t, c, now)) continue;
    var finish = t + c.durationMinutes * 60000;
    if (
      busy.some(function (b) {
        return overlaps_(t - buffer, finish + buffer, b[0], b[1]);
      }) ||
      reservations.some(function (r) {
        return overlaps_(
          t - buffer,
          finish + buffer,
          Date.parse(r.start),
          Date.parse(r.end),
        );
      })
    )
      continue;
    out.push(new Date(t).toISOString());
  }
  return out;
}
function assertAvailable_(c, start, ignoreId) {
  if (!slots_(c, ignoreId).includes(start))
    throw new Error('That time is no longer available. Choose another slot.');
}
function stripe_(method, path, payload, key) {
  var options = {
    method: method,
    headers: { Authorization: 'Bearer ' + secret_('STRIPE_API_KEY') },
    muteHttpExceptions: true,
  };
  if (key) options.headers['Idempotency-Key'] = key;
  if (payload)
    options.payload = Object.keys(payload)
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
      })
      .join('&');
  options.contentType = 'application/x-www-form-urlencoded';
  var response = UrlFetchApp.fetch(
    'https://api.stripe.com/v1/' + path,
    options,
  );
  var body = JSON.parse(response.getContentText());
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    var e = new Error(
      'Payment service request failed (' + response.getResponseCode() + ').',
    );
    e.stripeCode = body.error && body.error.code;
    throw e;
  }
  return body;
}
function reserve_(c, p) {
  if (
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 120 ||
    typeof p.email !== 'string' ||
    p.email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(p.email) ||
    typeof p.question !== 'string' ||
    p.question.trim().length < 10 ||
    p.question.length > 3000
  )
    throw new Error(
      'Provide your name, email, and a question (10–3000 characters).',
    );
  if (p.policyVersion !== c.policyVersion || p.accepted !== true)
    throw new Error('Read and accept the current booking policies.');
  if (typeof p.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(p.requestId))
    throw new Error('Invalid request. Reload the booking page.');
  var existing = rows_().find(function (r) {
    return r.requestId === p.requestId;
  });
  if (existing) {
    if (existing.email !== p.email.trim().toLowerCase())
      throw new Error('Invalid request.');
    if (!existing.checkoutUrl && existing.status === 'creating')
      createCheckout_(c, existing);
    return {
      id: existing.id,
      token: token_(existing.id),
      url: existing.checkoutUrl,
    };
  }
  if (
    rows_().some(function (r) {
      return (
        r.email === p.email.trim().toLowerCase() &&
        ['pending', 'creating'].includes(r.status)
      );
    })
  )
    throw new Error(
      'You already have a pending reservation. Use its booking link or wait for it to expire.',
    );
  var cache = CacheService.getScriptCache(),
    key = 'reservations:' + Math.floor(Date.now() / 60000),
    attempts = Number(cache.get(key) || 0);
  if (attempts >= 10)
    throw new Error('Too many reservation requests. Try again shortly.');
  cache.put(key, String(attempts + 1), 120);
  assertAvailable_(c, p.start, null);
  var id = Utilities.getUuid().replace(/-/g, ''),
    row = {
      id: id,
      requestId: p.requestId,
      name: p.name.trim(),
      email: p.email.trim().toLowerCase(),
      question: p.question.trim(),
      start: p.start,
      end: new Date(
        Date.parse(p.start) + c.durationMinutes * 60000,
      ).toISOString(),
      status: 'creating',
      amount: c.amount,
      currency: c.currency,
      durationMinutes: c.durationMinutes,
      created: new Date().toISOString(),
      policyText: c.policyText,
      policyVersion: c.policyVersion,
      cancellationNoticeHours: c.cancellationNoticeHours,
      rescheduleNoticeHours: c.rescheduleNoticeHours,
      refundPercent: c.refundPercent,
      expiresAt: Math.floor(Date.now() / 1000) + 1800,
    };
  save_(row, 'Reservation created');
  createCheckout_(c, row);
  return { id: id, token: token_(id), url: row.checkoutUrl };
}
function createCheckout_(c, row) {
  var url = manageUrl_(row, c),
    payload = {
      mode: 'payment',
      customer_email: row.email,
      client_reference_id: row.id,
      success_url: url,
      cancel_url: url,
      expires_at: row.expiresAt,
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': row.currency,
      'line_items[0][price_data][unit_amount]': row.amount,
      'line_items[0][price_data][product_data][name]':
        c.title + ' — ' + c.durationMinutes + ' minutes',
      'line_items[0][quantity]': 1,
      'metadata[booking_id]': row.id,
      'payment_intent_data[metadata][booking_id]': row.id,
    };
  var session = stripe_(
    'post',
    'checkout/sessions',
    payload,
    'checkout-' + row.id,
  );
  row.checkoutId = session.id;
  row.checkoutUrl = session.url;
  row.status = 'pending';
  save_(row, 'Checkout created');
}
function reconcileOne_(c, row) {
  if (row.cancelRequested) {
    cancel_(c, row);
    return;
  }
  if (row.status === 'creating') {
    if (Date.now() / 1000 - row.expiresAt > 86400) {
      row.error =
        'Checkout creation outcome unresolved; inspect Stripe before releasing reservation.';
      save_(row);
      return;
    }
    createCheckout_(c, row);
  }
  if (row.status === 'pending') {
    var s = stripe_(
      'get',
      'checkout/sessions/' + encodeURIComponent(row.checkoutId),
    );
    if (paidSession_(s, row)) {
      row.paymentIntent = s.payment_intent;
      row.paymentStatus = 'paid';
      row.status = 'paid';
      save_(row, 'Payment verified');
    } else if (s.payment_status === 'paid') {
      row.error = 'Payment details mismatch; inspect Stripe.';
      row.status = 'attention';
      save_(row, 'Payment mismatch');
      return;
    } else if (s.status === 'expired') {
      row.status = 'expired';
      save_(row, 'Checkout expired');
      return;
    } else if (Date.now() / 1000 >= row.expiresAt && s.status === 'open') {
      try {
        stripe_(
          'post',
          'checkout/sessions/' + row.checkoutId + '/expire',
          {},
          'expire-' + row.id,
        );
      } catch (e) {}
      s = stripe_('get', 'checkout/sessions/' + row.checkoutId);
      if (paidSession_(s, row)) {
        row.paymentIntent = s.payment_intent;
        row.paymentStatus = 'paid';
        row.status = 'paid';
        save_(row, 'Payment verified');
      } else if (s.status === 'expired') {
        row.status = 'expired';
        save_(row, 'Reservation released after Stripe expiration');
        return;
      }
    }
  }
  if (row.status === 'paid') confirm_(c, row);
  if (row.status === 'confirmed') {
    if (Date.now() - (row.refundChecked || 0) > 86400000) checkRefund_(c, row);
    if (row.cancelRequested) {
      cancel_(c, row);
      return;
    }
    if (row.rescheduleTarget) finishReschedule_(c, row);
    notify_(c, row);
  }
}
function event_(c, row) {
  try {
    return Calendar.Events.get(c.calendarId, row.eventId || row.id);
  } catch (e) {
    if (/not found|404/i.test(e.message)) return null;
    throw e;
  }
}
function confirm_(c, row) {
  var e = event_(c, row);
  if (!e) {
    var busy = busy_(
      c,
      Date.parse(row.start) - c.bufferMinutes * 60000,
      Date.parse(row.end) + c.bufferMinutes * 60000,
      null,
    );
    if (
      busy.some(function (b) {
        return overlaps_(
          Date.parse(row.start) - c.bufferMinutes * 60000,
          Date.parse(row.end) + c.bufferMinutes * 60000,
          b[0],
          b[1],
        );
      })
    ) {
      row.error =
        'Payment received but the calendar now has a conflict. Contact customer to reschedule or refund.';
      save_(row, 'Calendar conflict');
      return;
    }
    var resource = {
      id: row.eventId || row.id,
      summary: c.title + ' — ' + row.name,
      description: row.question + '\n\nManage booking: ' + manageUrl_(row, c),
      location: c.meetingLocation || '',
      start: { dateTime: row.start, timeZone: c.timeZone },
      end: { dateTime: row.end, timeZone: c.timeZone },
      attendees: [{ email: row.email }],
      reminders: { useDefault: true },
    };
    if (c.meetingMode === 'google-meet')
      resource.conferenceData = {
        createRequest: {
          requestId: row.eventId || row.id,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    e = Calendar.Events.insert(resource, c.calendarId, {
      sendUpdates: 'all',
      conferenceDataVersion: 1,
    });
  }
  row.eventId = e.id;
  row.calendarUrl = e.htmlLink;
  if (e.status === 'cancelled') {
    row.error =
      'Calendar event was cancelled outside the booking tool; owner review required.';
    save_(row);
    return;
  }
  row.meeting =
    c.meetingMode === 'google-meet'
      ? e.hangoutLink ||
        ((e.conferenceData && e.conferenceData.entryPoints) || [])
          .filter(function (p) {
            return p.entryPointType === 'video';
          })
          .map(function (p) {
            return p.uri;
          })[0] ||
        ''
      : c.meetingLocation;
  if (!row.meeting) {
    row.error =
      'Google Meet conference is pending or unavailable. Check destination calendar conference support.';
    save_(row);
    return;
  }
  row.status = 'confirmed';
  row.error = '';
  save_(row, 'Calendar confirmed');
  notify_(c, row);
}
function send_(to, subject, body) {
  if (MailApp.getRemainingDailyQuota() < 1)
    throw new Error('Daily email quota exhausted.');
  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: body,
    name: 'Wikipedia Brown — AI Advisory',
  });
}
function notify_(c, row) {
  var when = Utilities.formatDate(
      new Date(row.start),
      c.timeZone,
      'EEE, MMM d, yyyy h:mm a z',
    ),
    body =
      'Your AI advisory session is confirmed.\n\n' +
      when +
      '\n' +
      row.meeting +
      '\n\nYour question: ' +
      row.question +
      '\n\nManage your booking: ' +
      manageUrl_(row, c) +
      '\n\nBooking policies accepted:\n' +
      row.policyText;
  if (!row.customerNotified) {
    send_(row.email, 'AI advisory confirmed', body);
    row.customerNotified = true;
    save_(row);
  }
  if (!row.ownerNotified) {
    send_(
      c.ownerEmail,
      'New paid advisory booking — ' + row.name,
      body + '\n\nCustomer: ' + row.email + '\nCalendar: ' + row.calendarUrl,
    );
    row.ownerNotified = true;
    save_(row);
  }
}
function reschedule_(c, row, start) {
  c = Object.assign({}, c, {
    durationMinutes: row.durationMinutes || c.durationMinutes,
  });
  if (!policyAllows_(row, c, 'reschedule', Date.now()))
    throw new Error(
      'Online rescheduling is outside the policy window. Contact the organizer.',
    );
  if (row.rescheduleTarget)
    throw new Error('A schedule change is already processing.');
  assertAvailable_(c, start, row.id);
  if (row.status === 'cancelled') {
    row.previousStart = row.start;
    row.start = start;
    row.end = new Date(
      Date.parse(start) + (row.durationMinutes || c.durationMinutes) * 60000,
    ).toISOString();
    row.revision = (row.revision || 0) + 1;
    row.eventId = row.id + 'a' + row.revision.toString(16);
    row.status = 'paid';
    row.cancelRequested = false;
    row.cancelCustomerNotified = false;
    row.cancelOwnerNotified = false;
    row.customerNotified = false;
    row.ownerNotified = false;
    row.reminded = false;
    row.error = '';
    save_(row, 'Cancelled paid session rebooked');
    confirm_(c, row);
  } else {
    row.rescheduleTarget = start;
    save_(row, 'Rescheduling requested');
    finishReschedule_(c, row);
    notify_(c, row);
  }
  return publicBooking_(row, c);
}
function finishReschedule_(c, row) {
  var start = row.rescheduleTarget,
    end = new Date(
      Date.parse(start) + (row.durationMinutes || c.durationMinutes) * 60000,
    ).toISOString();
  Calendar.Events.patch(
    {
      start: { dateTime: start, timeZone: c.timeZone },
      end: { dateTime: end, timeZone: c.timeZone },
    },
    c.calendarId,
    row.eventId,
    { sendUpdates: 'all' },
  );
  row.start = start;
  row.end = end;
  delete row.rescheduleTarget;
  row.customerNotified = false;
  row.ownerNotified = false;
  row.reminded = false;
  row.error = '';
  save_(row, 'Rescheduled');
}
function cancel_(c, row) {
  if (row.status === 'cancelled' || row.status === 'refunded') {
    cancelNotice_(c, row);
    return;
  }
  if (row.refundAmount > 0 && !row.refundId) {
    var refund = stripe_(
      'post',
      'refunds',
      { payment_intent: row.paymentIntent, amount: row.refundAmount },
      'refund-' + row.id,
    );
    row.refundId = refund.id;
    row.refundStatus = refund.status;
    save_(row, 'Refund requested');
  }
  if (row.refundId) {
    var r = stripe_('get', 'refunds/' + row.refundId);
    row.refundStatus = r.status;
    if (r.status !== 'succeeded') {
      row.error = 'Refund ' + r.status + '; organizer review required.';
      save_(row);
      return;
    }
  }
  if (row.eventId) {
    var e = event_(c, row);
    if (e && e.status !== 'cancelled')
      Calendar.Events.remove(c.calendarId, row.eventId, { sendUpdates: 'all' });
  }
  row.status = row.refundAmount > 0 ? 'refunded' : 'cancelled';
  row.error = '';
  save_(row, 'Cancellation completed');
  cancelNotice_(c, row);
}
/* Install one shared five-minute job. Its entry point is private to public RPC. */
function reconcileBookings_() {
  var c = config_();
  locked_(function () {
    var started = Date.now();
    var rows = rows_(),
      props = PropertiesService.getScriptProperties(),
      cursor = Number(props.getProperty('RECONCILE_CURSOR') || 0);
    for (var i = 0; i < rows.length; i++) {
      if (Date.now() - started > 15000) break;
      var index = (cursor + i) % rows.length,
        row = rows[index];
      props.setProperty('RECONCILE_CURSOR', String((index + 1) % rows.length));
      try {
        if (
          ['creating', 'pending', 'paid', 'confirmed'].includes(row.status) ||
          (row.cancelRequested &&
            (!row.cancelCustomerNotified || !row.cancelOwnerNotified))
        )
          reconcileOne_(c, row);
        if (row.error && !row.alerted) {
          send_(
            c.ownerEmail,
            'Booking needs attention: ' + row.id,
            'Review the private booking Sheet. ' + row.error,
          );
          row.alerted = true;
          save_(row);
        } else if (!row.error && row.alerted) {
          row.alerted = false;
          save_(row);
        }
        if (
          row.status === 'confirmed' &&
          !row.reminded &&
          c.reminderHours > 0 &&
          Date.parse(row.start) > Date.now() &&
          Date.parse(row.start) - Date.now() <= c.reminderHours * 3600000
        ) {
          send_(
            row.email,
            'Reminder: AI advisory session',
            Utilities.formatDate(
              new Date(row.start),
              c.timeZone,
              'EEE, MMM d h:mm a z',
            ) +
              '\n' +
              row.meeting +
              '\n' +
              manageUrl_(row, c),
          );
          row.reminded = true;
          save_(row);
        }
      } catch (e) {
        row.error = e.message;
        save_(row, 'Operation failed');
        if (!row.alerted) {
          try {
            send_(
              c.ownerEmail,
              'Booking needs attention: ' + row.id,
              'Review the private booking Sheet. ' + e.message,
            );
            row.alerted = true;
            save_(row);
          } catch (ignore) {}
        }
      }
    }
  });
}

function cancelNotice_(c, row) {
  if (!row.cancelCustomerNotified) {
    send_(
      row.email,
      'AI advisory cancelled',
      'Your appointment has been cancelled.\nRefund: ' +
        (row.refundAmount / 100).toFixed(2) +
        ' ' +
        row.currency.toUpperCase() +
        '.\n' +
        manageUrl_(row, c),
    );
    row.cancelCustomerNotified = true;
    save_(row);
  }
  if (!row.cancelOwnerNotified) {
    send_(
      c.ownerEmail,
      'AI advisory cancelled — ' + row.name,
      manageUrl_(row, c),
    );
    row.cancelOwnerNotified = true;
    save_(row);
  }
}
function checkRefund_(c, row) {
  var pi = stripe_(
      'get',
      'payment_intents/' + row.paymentIntent + '?expand%5B%5D=latest_charge',
    ),
    charge = pi.latest_charge;
  row.refundChecked = Date.now();
  if (charge && charge.amount_refunded > 0) {
    if (charge.refunded) {
      row.cancelRequested = true;
      row.refundAmount = charge.amount_refunded;
      var refunds = stripe_(
        'get',
        'refunds?payment_intent=' + row.paymentIntent + '&limit=100',
      );
      var succeeded = refunds.data.filter(function (r) {
        return r.status === 'succeeded';
      });
      if (succeeded.length) {
        row.refundId = succeeded[0].id;
        row.refundStatus = 'succeeded';
      }
    } else {
      row.error = 'A partial refund was issued in Stripe; review the booking.';
    }
  }
  save_(row);
}
