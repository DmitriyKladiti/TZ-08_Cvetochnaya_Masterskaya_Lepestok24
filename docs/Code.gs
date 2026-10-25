// Укажите ID своей таблицы между /d/ и /edit в её URL.
const SPREADSHEET_ID = '1bvdS8GTi6XtXcJxZS_L7bngTxrNdXGmLd3EVGpX-ROs';
const HEADERS = ['request_id', 'created_at', 'name', 'phone', 'email', 'item_id', 'delivery_date',
  'delivery_zone', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'status'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  const clean = key => String(p[key] || '').trim();
  const missing = ['request_id', 'name', 'phone', 'item_id', 'delivery_date', 'delivery_zone'].filter(key => !clean(key));
  if (missing.length) return jsonResponse({ok:false, error:'missing_required', fields:missing});
  const id = clean('request_id');
  if (!/^REQ-[A-F0-9]{8}-[A-F0-9]{4}-4[A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}$/i.test(id)) {
    return jsonResponse({ok:false, error:'invalid_request_id'});
  }
  const phone = clean('phone');
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
    return jsonResponse({ok:false, error:'invalid_phone'});
  }
  const email = clean('email');
  // E-mail в форме необязателен; проверяем формат, только если он указан.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ok:false, error:'invalid_email'});
  }
  if (!['center','north','south','suburb','pickup'].includes(clean('delivery_zone'))) {
    return jsonResponse({ok:false, error:'invalid_direction'});
  }
  if (['name','phone','email','utm_source','utm_medium','utm_campaign','utm_content'].some(key => clean(key).length > 200)) {
    return jsonResponse({ok:false, error:'value_too_long'});
  }
  // Проверка ID и запись выполняются под одной блокировкой.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return jsonResponse({ok:false, error:'busy_retry'});
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('leads');
    if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) {
      return jsonResponse({ok:false, error:'invalid_sheet_schema'});
    }
    const duplicate = sheet.getRange('A:A').createTextFinder(id)
      .matchEntireCell(true).matchCase(false).useRegularExpression(false).findNext();
    if (duplicate) return jsonResponse({ok:false, error:'duplicate_request_id'});
    const createdAt = new Date();
    const source = clean('utm_source') || 'direct';
    const medium = clean('utm_medium') || 'none';
    const campaign = clean('utm_campaign') || 'not_set';
    const content = clean('utm_content') || 'not_set';
    const status = 'new'; // Присланный клиентом status игнорируется.
    sheet.appendRow([id, createdAt, textCell(clean('name')), textCell(phone), textCell(email),
      textCell(clean('item_id')), clean('delivery_date'), clean('delivery_zone'),
      textCell(source), textCell(medium), textCell(campaign), textCell(content), status]);
    SpreadsheetApp.flush();
    return jsonResponse({ok:true, request_id:id});
  } catch (error) {
    // Не возвращаем клиенту детали таблицы и содержимое заявки.
    return jsonResponse({ok:false, error:'storage_error'});
  } finally {
    lock.releaseLock();
  }
}

function textCell(value) {
  // Не даём введённому тексту превратиться в формулу Google Sheets.
  return /^[=+@-]/.test(value) ? "'" + value : value;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
