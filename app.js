(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const units = { seconds: 1n, milliseconds: 1000n, microseconds: 1000000n, nanoseconds: 1000000000n };
  let paused = false;
  let localInput = false;
  let liveDate = new Date();
  let toastTimer;

  function utc(date) { return date.toUTCString(); }
  function local(date) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(date); }
  function relative(date) {
    const seconds = (date.getTime() - Date.now()) / 1000;
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, size] of [['year',31557600],['month',2629800],['day',86400],['hour',3600],['minute',60],['second',1]]) {
      if (Math.abs(seconds) >= size || unit === 'second') return formatter.format(Math.round(seconds / size), unit);
    }
  }
  function copyButton(value, label) {
    const button = document.createElement('button');
    button.className = 'icon-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Copy ${label}`);
    button.innerHTML = '<svg aria-hidden="true"><use href="#copy"/></svg>';
    button.addEventListener('click', () => copy(typeof value === 'function' ? value() : value));
    return button;
  }
  async function copy(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(String(value));
      else {
        const area = document.createElement('textarea');
        area.value = String(value);
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.append(area);
        area.select();
        const success = document.execCommand('copy');
        area.remove();
        if (!success) throw new Error('Clipboard unavailable');
      }
      showToast('Copied to clipboard');
    } catch { showToast('Could not copy. Please select and copy the value.'); }
  }
  function showToast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }
  function renderResult(target, rows) {
    target.replaceChildren();
    for (const [label, value, copyable = false] of rows) {
      const row = document.createElement('div');
      row.className = 'result-row';
      const name = document.createElement('span');
      name.className = 'result-label';
      name.textContent = label;
      const output = document.createElement('span');
      output.className = 'result-value';
      const text = document.createElement(copyable ? 'code' : 'span');
      text.textContent = value;
      output.append(text);
      if (copyable) output.append(copyButton(value, label));
      row.append(name, output);
      target.append(row);
    }
  }
  function convertTimestamp() {
    const raw = $('timestamp').value.trim();
    try {
      if (!/^[+-]?\d+$/.test(raw)) throw new Error('Enter a whole-number Unix timestamp.');
      const digits = raw.replace(/^[+-]/, '').replace(/^0+(?=\d)/, '').length;
      const unit = $('unit').value === 'auto' ? (digits <= 10 ? 'seconds' : digits <= 13 ? 'milliseconds' : digits <= 16 ? 'microseconds' : 'nanoseconds') : $('unit').value;
      const value = BigInt(raw);
      const divisor = units[unit];
      // Floor negative fractions so the displayed millisecond contains the instant.
      const numerator = value * 1000n;
      let ms = numerator / divisor;
      if (numerator < 0n && numerator % divisor !== 0n) ms -= 1n;
      if (ms < -8640000000000000n || ms > 8640000000000000n) throw new Error('This timestamp is outside the supported date range.');
      const date = new Date(Number(ms));
      renderResult($('timestamp-result'), [['UTC', utc(date)], ['Your time zone', local(date)], ['Relative', relative(date)], ['Input format', unit[0].toUpperCase() + unit.slice(1)]]);
      $('timestamp-error').hidden = true;
    } catch (error) {
      $('timestamp-error').textContent = error.message;
      $('timestamp-error').hidden = false;
      $('timestamp-result').replaceChildren();
    }
  }
  function setDateFields(date) {
    const parts = localInput ? [date.getFullYear(), date.getMonth()+1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()] : [date.getUTCFullYear(), date.getUTCMonth()+1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
    const pad = value => String(value).padStart(2, '0');
    $('date').value = `${String(parts[0]).padStart(4,'0')}-${pad(parts[1])}-${pad(parts[2])}`;
    $('time').value = parts.slice(3).map(pad).join(':');
  }
  function convertDate() {
    try {
      if (!$('date').value || !$('time').value || !$('date').validity.valid || !$('time').validity.valid) throw new Error('Enter a valid date and time.');
      const date = new Date(`${$('date').value}T${$('time').value}${localInput ? '' : 'Z'}`);
      if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time.');
      if (localInput) {
        const [hour, minute] = $('time').value.split(':').map(Number);
        if (date.getHours() !== hour || date.getMinutes() !== minute) throw new Error('This local time does not exist because the clocks move forward.');
      }
      renderResult($('date-result'), [['Seconds', String(Math.floor(date.getTime()/1000)), true], ['Milliseconds', String(date.getTime()), true], ['UTC', utc(date)], ['Your time zone', local(date)]]);
      $('date-error').hidden = true;
    } catch (error) {
      $('date-error').textContent = error.message;
      $('date-error').hidden = false;
      $('date-result').replaceChildren();
    }
  }
  const formatters = [['UTC', utc], ['Your time zone', local], ['ISO 8601', date => date.toISOString()], ['RFC 2822', date => date.toUTCString().replace('GMT', '+0000')]];
  const formatNodes = formatters.map(([label, format]) => {
    const row = document.createElement('div');
    row.className = 'format-row';
    const name = document.createElement('span'); name.textContent = label;
    const code = document.createElement('code');
    // Read the current value at click time without replacing the focused button.
    const button = copyButton(() => code.textContent, label);
    row.append(name, code, button);
    $('format-rows').append(row);
    return { code, format };
  });
  function tick() {
    if (!paused) liveDate = new Date();
    $('live-timestamp').textContent = String(Math.floor(liveDate.getTime()/1000));
    $('live-date').textContent = utc(liveDate);
    for (const { code, format } of formatNodes) code.textContent = format(liveDate);
  }
  $('pause').addEventListener('click', () => {
    paused = !paused;
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').title = paused ? 'Resume the live clock' : 'Pause the live clock';
    $('live-label').textContent = paused ? 'Paused' : 'Live';
    tick();
  });
  $('copy-live').addEventListener('click', () => copy($('live-timestamp').textContent));
  $('timestamp-form').addEventListener('submit', event => { event.preventDefault(); convertTimestamp(); });
  $('date-form').addEventListener('submit', event => { event.preventDefault(); convertDate(); });
  $('timestamp').addEventListener('input', convertTimestamp);
  $('unit').addEventListener('change', convertTimestamp);
  $('date').addEventListener('input', convertDate);
  $('time').addEventListener('input', convertDate);
  $('use-now').addEventListener('click', () => {
    $('timestamp').value = String(Math.floor(Date.now()/1000));
    $('unit').value = 'auto';
    convertTimestamp();
  });
  for (const [id, isLocal] of [['utc-zone',false], ['local-zone',true]]) {
    $(id).addEventListener('click', () => {
      localInput = isLocal;
      $('utc-zone').classList.toggle('selected', !isLocal);
      $('local-zone').classList.toggle('selected', isLocal);
      $('utc-zone').setAttribute('aria-pressed', String(!isLocal));
      $('local-zone').setAttribute('aria-pressed', String(isLocal));
      $('zone-hint').textContent = isLocal ? `Using ${localZone}. Repeated DST times use the earlier offset.` : 'The entered date and time are in UTC.';
      convertDate();
    });
  }
  $('timestamp').value = String(Math.floor(Date.now()/1000));
  setDateFields(new Date());
  convertTimestamp();
  convertDate();
  tick();
  setInterval(tick, 1000);
})();
