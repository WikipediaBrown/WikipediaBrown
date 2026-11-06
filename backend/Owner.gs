/* This project must be bound to the private booking spreadsheet. Owner actions
   end in underscore so google.script.run cannot invoke them. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Advisory')
    .addItem('Set up booking sheets', 'setupBooking_')
    .addItem('Validate configuration', 'validateBooking_')
    .addItem('Refresh payments and reminders', 'ownerReconcile_')
    .addSeparator()
    .addItem('Retry selected booking', 'retrySelected_')
    .addItem('Reschedule selected booking', 'rescheduleSelected_')
    .addItem('Cancel selected booking (no refund)', 'cancelSelected_')
    .addItem('Cancel and fully refund selected booking', 'refundSelected_')
    .addItem('Mark selected session completed', 'completeSelected_')
    .addItem('Show selected customer management link', 'showLink_')
    .addToUi();
}
function requireOwner_() {
  var email = Session.getActiveUser().getEmail();
  if (!email || email.toLowerCase() !== config_().ownerEmail.toLowerCase())
    throw new Error('Only the configured owner can perform this action.');
}
function setupBooking_() {
  requireOwner_();
  var c = config_(),
    book = SpreadsheetApp.getActiveSpreadsheet();
  if (book.getId() !== c.spreadsheetId)
    throw new Error('Spreadsheet ID does not match configuration.');
  if (!book.getSheetByName('Bookings')) {
    var s = book.insertSheet('Bookings');
    s.appendRow([
      'Booking ID',
      'Session start (Pacific)',
      'Customer',
      'Email',
      'Question',
      'Status',
      'Payment',
      'Amount',
      'Currency',
      'Calendar',
      'Checkout',
      'Needs attention',
      'System record',
    ]);
    s.setFrozenRows(1);
    s.getRange('A1:M1').setFontWeight('bold');
    s.hideColumns(13);
    s.setColumnWidths(1, 12, 170);
    s.getRange('B:B').setNumberFormat('@');
    s.protect()
      .setDescription('System-managed bookings; use AI Advisory menu')
      .setWarningOnly(true);
    s.getRange(1, 1, s.getMaxRows(), 13).createFilter();
  }
  if (!book.getSheetByName('History'))
    book
      .insertSheet('History')
      .appendRow(['Time (UTC)', 'Booking ID', 'Operation']);
  if (
    !PropertiesService.getScriptProperties().getProperty('BOOKING_SIGNING_KEY')
  )
    PropertiesService.getScriptProperties().setProperty(
      'BOOKING_SIGNING_KEY',
      Utilities.getUuid() + Utilities.getUuid(),
    );
  ScriptApp.getProjectTriggers()
    .filter(function (t) {
      return t.getHandlerFunction() === 'reconcileBookings_';
    })
    .forEach(function (t) {
      ScriptApp.deleteTrigger(t);
    });
  ScriptApp.newTrigger('reconcileBookings_')
    .timeBased()
    .everyMinutes(5)
    .create();
  book.setSpreadsheetTimeZone(c.timeZone);
  SpreadsheetApp.getUi().alert(
    'Sheets and the shared reconciliation trigger are configured. Validate settings before enabling booking.',
  );
}
function validateBooking_() {
  requireOwner_();
  var c = config_(),
    errors = configurationErrors_(c);
  if (!PropertiesService.getScriptProperties().getProperty('STRIPE_API_KEY'))
    errors.push('STRIPE_API_KEY');
  SpreadsheetApp.getUi().alert(
    errors.length
      ? 'Complete these settings: ' + errors.join(', ')
      : 'Configuration fields are complete. Run the deployment acceptance checks before enabling booking.',
  );
}
function selected_() {
  requireOwner_();
  var sheet = SpreadsheetApp.getActiveSheet(),
    range = sheet.getActiveRange();
  if (sheet.getName() !== 'Bookings' || !range || range.getRow() < 2)
    throw new Error('Select a booking row in Bookings.');
  return find_(String(sheet.getRange(range.getRow(), 1).getValue()));
}
function ownerReconcile_() {
  requireOwner_();
  reconcileBookings_();
}
function retrySelected_() {
  var selected = selected_();
  locked_(function () {
    var row = find_(selected.id);
    row.error = '';
    row.alerted = false;
    reconcileOne_(config_(), row);
    save_(row, 'Owner retry');
  });
}
function confirmOwnerAction_(text) {
  var ui = SpreadsheetApp.getUi();
  return ui.alert(text, ui.ButtonSet.YES_NO) === ui.Button.YES;
}
function cancelSelected_() {
  var selected = selected_();
  if (!confirmOwnerAction_('Cancel ' + selected.name + ' without a refund?'))
    return;
  locked_(function () {
    var row = find_(selected.id);
    if (!['confirmed', 'paid'].includes(row.status))
      throw new Error('Only paid bookings can be cancelled here.');
    row.cancelRequested = true;
    row.refundAmount = 0;
    save_(row, 'Owner cancellation');
    cancel_(config_(), row);
  });
}
function refundSelected_() {
  var selected = selected_();
  if (
    !confirmOwnerAction_(
      'Cancel ' + selected.name + ' and refund the full payment?',
    )
  )
    return;
  locked_(function () {
    var row = find_(selected.id);
    if (!row.paymentIntent || ['cancelled', 'refunded'].includes(row.status))
      throw new Error('Select an active paid booking.');
    row.cancelRequested = true;
    row.refundAmount = row.amount;
    save_(row, 'Owner full refund');
    cancel_(config_(), row);
  });
}
function rescheduleSelected_() {
  var selected = selected_(),
    ui = SpreadsheetApp.getUi(),
    answer = ui.prompt(
      'Reschedule booking',
      'Enter an ISO timestamp with offset, e.g. 2026-12-04T14:00:00-08:00. Availability is checked before updating.',
      ui.ButtonSet.OK_CANCEL,
    );
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  var date = new Date(answer.getResponseText());
  if (isNaN(date.getTime())) throw new Error('Invalid timestamp.');
  locked_(function () {
    var c = config_(),
      row = find_(selected.id);
    if (!['confirmed', 'cancelled'].includes(row.status))
      throw new Error('Select a confirmed or cancelled paid booking.');
    if (row.status === 'cancelled') {
      reschedule_(c, row, date.toISOString());
      return;
    }
    assertAvailable_(c, date.toISOString(), row.id);
    row.rescheduleTarget = date.toISOString();
    save_(row, 'Owner rescheduling');
    finishReschedule_(c, row);
    notify_(c, row);
  });
}
function showLink_() {
  var row = selected_();
  SpreadsheetApp.getUi().alert(
    'Private customer link. Anyone with this link can manage this booking.\n\n' +
      manageUrl_(row, config_()),
  );
}

function completeSelected_() {
  var selected = selected_();
  if (
    !confirmOwnerAction_(
      'Mark ' +
        selected.name +
        "'s session completed? This closes its rescheduling credit.",
    )
  )
    return;
  locked_(function () {
    var row = find_(selected.id);
    if (row.status !== 'confirmed' || Date.parse(row.end) > Date.now())
      throw new Error(
        'Only a confirmed session that has ended can be marked completed.',
      );
    row.status = 'completed';
    save_(row, 'Owner marked session completed');
  });
}
