let scanner_timer = setInterval(function () {
  if (document.getElementById('serialnumberForm') === null) {
    return;
  }

  clearInterval(scanner_timer);
  scanner_setUp();
}, 200);

function scanner_setUp() {
  // set up backdrop and pop over input field
  if ($('#scanner_backdrop').length) {
    return;
  }

  const backdrop = $('<div>', {
    id: 'scanner_backdrop',
    css: {
      display: 'block',
      position: 'absolute',
      top: '0px',
      left: '-200%',
      width: '100%',
      height: '100%',
      backgroundColor: '#80808080',
    },
  });
  const input = $('<input>', {
    id: 'scanner_input',
    type: 'text',
    class:
      'ui-inputfield ui-inputtext ui-widget ui-state-default ui-corner-all',
    css: {
      top: '50%',
      left: '50%',
      width: '200px',
      margin: '-50px 0 0 -100px',
      display: 'block',
      position: 'absolute',
    },
  });
  const button = $('<button>', {
    id: 'scanner_showInput',
    class:
      'ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only securpharm-button pull-right',
    role: 'button',
    type: 'button',
  });
  button.append($('<span class="ui-button-text ui-c">Izmantot skeneri</span>'));
  button.on('click', scanner_showBackdrop);
  $('#serialnumberForm').prepend(button);

  backdrop.on('click', function (e) {
    if (e.target === this) {
      scanner_hideBackdrop();
    }
  });

  input.on('keyup', function ({ originalEvent: event }) {
    if (event.keyCode === 13) {
      scanner_fillForm(scanner_parseGTIN(input.val()));
      scanner_hideBackdrop();
    }

    if (/^[a-zA-Z0-9\]]$/.test(event.key) === false) {
      return;
    }

    if (event.ctrlKey) {
      if (event.key === ']') {
        input.val(input.val() + '\x1d');
      }
    }

    $('#output').text(encodeURI(input.val()));

    event.stopPropagation();
    event.preventDefault();

    return false;
  });

  backdrop.append(input);
  $('body').append(backdrop);
}

function scanner_hideBackdrop() {
  $('#scanner_backdrop').css('left', '-200%');
  $('#scanner_input').blur();
  $('#scanner_input').val('');
}

function scanner_showBackdrop() {
  if (!$('#scanner_backdrop').length) {
    scanner_setUp();
  }

  $('#scanner_backdrop').css('left', '0px');
  $('#scanner_input').focus();
}

function scanner_parseGTIN(data) {
  const minLen = 3;
  const GS = '\x1d';

  const gs1_gtin = '01';
  const gs1_lot = '10';
  const gs1_exp = '17';
  const gs1_sn = '21';

  let start = 0;
  const pkg = { scheme: 'GTIN' };

  while (true) {
    if (start >= data.length - 1) {
      break;
    }

    s = data.substring(start);

    if (s.startsWith(GS)) {
      start += GS.length;
      continue;
    }

    if (s.length < minLen) {
      return '';
    }

    const appId = s.substr(0, 2);
    switch (appId) {
      case gs1_gtin:
        // GTIN PC is 14 digits long
        length = 14;
        pkg.pc = s.substr(2, length);
        start = start + appId.length + length;

        break;
      case gs1_lot:
        i = s.indexOf(GS);
        if (i === -1) {
          i = s.length;
        }

        pkg.lot = s.substring(2, i);
        start = start + appId.length + pkg.lot.length + GS.length;

        break;
      case gs1_exp:
        pkg.rawExp = s.substr(2, 6);
        pkg.exp = scanner_parseDate(pkg.rawExp);
        start = start + appId.length + pkg.rawExp.length;

        break;
      case gs1_sn:
        i = s.indexOf(GS);
        if (i === -1) {
          i = s.length;
        }

        pkg.sn = s.substring(2, i);
        start = start + appId.length + pkg.sn.length + GS.length;

        break;
    }
  }

  return pkg;
}

function scanner_parseDate(date) {
  /**
   * Disclaimer.
   *
   * The date parsing function is meant for parsing the expiry dates for medicines. That means that
   *    the range will not extend too far in the past (not before Y2K) and not too far in the
   *    future (less than the next century). So it is safe to assume the year starts with '20'.
   *
   * As for calculating the leap years we don't need to check if the year is the century year. Leap
   *    year calculation is needed to get the last day of the month when the date part is '00' and
   *    month part is '02' (February).
   */
  const [year, month, day] = [
    date.substr(0, 2),
    date.substr(2, 2),
    date.substr(4, 2),
  ];
  const out = `20${year}-${month}-`;

  if (day !== '00') {
    return out + day;
  }

  switch (month) {
    case '02':
      return out + (parseInt(year, 10) % 4 === 0 ? '29' : '28');

    case ('04', '06', '09', '11'):
      return out + '30';

    default:
      return out + '31';
  }
}

function scanner_fillForm(data) {
  const pc = $('#serialnumberForm\\:productCode');
  const lot = $('#serialnumberForm\\:lot');
  const exp = $('#serialnumberForm\\:expiry');
  const sn = $('#serialnumberForm\\:serialNr');

  pc.val(data.pc);
  lot.val(data.lot);
  exp.val(data.rawExp);
  sn.val(data.sn);
}
