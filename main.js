(function (win, $, undef) {
  const backdropId = 'nmvs-scanner_backdrop';
  const scanInputId = 'nmvs-scanner_input';
  const scanButtonId = 'nmvs-scanner_button';

  // Let's hope these don't change
  const formId = '#serialnumberForm';
  const pcId = '#serialnumberForm\\:productCode';
  const lotId = '#serialnumberForm\\:lot';
  const expId = '#serialnumberForm\\:expiry';
  const snId = '#serialnumberForm\\:serialNr';

  function setUp() {
    if (!!$(`#${backdropId}`).length) {
      return;
    }

    const backdrop = $('<div>', {
      id: backdropId,
      class: backdropId,
    });
    const input = $('<input>', {
      id: scanInputId,
      type: 'text',
    }).addClass([
      'ui-inputfield',
      'ui-inputtext',
      'ui-widget',
      'ui-state-default',
      'ui-corner-all',
      scanInputId,
    ]);
    const button = $('<button>', {
      id: scanButtonId,
      type: 'button',
    })
      .addClass([
        'ui-button',
        'ui-widget',
        'ui-state-default',
        'ui-corner-all',
        'ui-button-text-only',
        'securpharm-button',
        'pull-right',
      ])
      .append(
        $('<span>').addClass(['ui-button-text', 'ui-c']).text('Skenēt kodu')
      );

    backdrop.append(input);
    $('body').append(backdrop);
    $(formId).prepend(button);

    backdrop.on('click', function (e) {
      if (e.target === this) {
        hideBackdrop();
      }
    });

    input.on('keyup', function ({ originalEvent: event }) {
      if (event.keyCode === 13) {
        fillForm(parseGTIN(input.val()));
        hideBackdrop();
      }

      if (/^[a-zA-Z0-9\]]$/.test(event.key) === false) {
        return;
      }

      if (event.ctrlKey) {
        if (event.key === ']') {
          input.val(input.val() + '\x1d');
        }
      }

      event.stopPropagation();
      event.preventDefault();

      return false;
    });

    button.on('click', showBackdrop);
  }

  function showBackdrop() {
    if (!$(`#${backdropId}`).length) {
      setUp();
    }

    $(`#${backdropId}`).css('left', '0px');
    $(`#${scanInputId}`).focus();
  }
  function hideBackdrop() {
    $(`#${backdropId}`).css('left', '-200%');
    $(`#${scanInputId}`).val('').blur();
  }

  function fillForm(data) {
    $(pcId).val(data.pc);
    $(lotId).val(data.lot);
    $(expId).val(data.rawExp);
    $(snId).val(data.sn);
  }

  // Utilities
  function parseGTIN(data) {
    const minLen = 3;
    const lenGTIN = 14;
    const GS = '\x1d';

    const gs1_gtin = '01';
    const gs1_lot = '10';
    const gs1_exp = '17';
    const gs1_sn = '21';

    let start = 0;
    const pack = { scheme: 'GTIN' };

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
          pack.pc = s.substr(2, lenGTIN);
          start = start + appId.length + lenGTIN;

          break;
        case gs1_lot:
          i = s.indexOf(GS);
          if (i === -1) {
            i = s.length;
          }

          pack.lot = s.substring(2, i);
          start = start + appId.length + pack.lot.length + GS.length;

          break;
        case gs1_exp:
          pack.rawExp = s.substr(2, 6);
          pack.exp = parseDate(pack.rawExp);
          start = start + appId.length + pack.rawExp.length;

          break;
        case gs1_sn:
          i = s.indexOf(GS);
          if (i === -1) {
            i = s.length;
          }

          pack.sn = s.substring(2, i);
          start = start + appId.length + pack.sn.length + GS.length;

          break;
      }
    }

    return pack;
  }

  function parseDate(date) {
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

  setUp();
})(this, this.jQuery);
