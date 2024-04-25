(function (win, doc, undef) {
  const backdropId = 'nmvs-scanner_backdrop';
  const scanInputId = 'nmvs-scanner_input';
  const scanButtonId = 'nmvs-scanner_button';

  // Let's hope these don't change
  const formId = 'serialnumberForm';
  const pcId = 'serialnumberForm:productCode';
  const lotId = 'serialnumberForm:lot';
  const expId = 'serialnumberForm:expiry';
  const snId = 'serialnumberForm:serialNr';

  function setUp() {
    if (doc.getElementById(backdropId) !== null) {
      return;
    }

    const backdrop = createElement(
      'div',
      { id: backdropId, class: backdropId },
      { click: backdropClickHandler }
    );

    const input = createElement(
      'input',
      {
        id: scanInputId,
        type: 'text',
        class: [
          'ui-inputfield',
          'ui-inputtext',
          'ui-widget',
          'ui-state-default',
          'ui-corner-all',
          scanInputId,
        ].join(' '),
      },
      { keyup: inputKeyupHandler }
    );

    const button = createElement(
      'button',
      {
        id: scanButtonId,
        type: 'button',
        class: [
          'ui-button',
          'ui-widget',
          'ui-state-default',
          'ui-corner-all',
          'ui-button-text-only',
          'securpharm-button',
          'pull-right',
        ].join(' '),
      },
      { click: showBackdrop }
    );
    const buttonText = createElement('span', {
      class: ['ui-button-text', 'ui-c'].join(' '),
    });
    buttonText.innerText = 'Skenēt kodu';
    button.appendChild(buttonText);

    backdrop.appendChild(input);
    doc.body.appendChild(backdrop);
    const form = doc.getElementById(formId);
    if (form !== null) {
      form.appendChild(button);
    } else {
      console.error('No form found. Has form ID changed?');
    }
  }

  function backdropClickHandler(e) {
    if (e.target === this) {
      hideBackdrop();
    }
  }

  function inputKeyupHandler(e) {
    if (e.key.toLowerCase() === 'enter') {
      fillForm(parseGTIN(this.value));
      hideBackdrop();
    }

    if (/^[a-zA-Z0-9\]]$/.test(e.key) === false) {
      return;
    }

    if (e.ctrlKey && e.key === ']') {
      this.value = this.value + '\x1d';
    }

    e.preventDefault();
    e.stopPropagation();

    return false;
  }

  function createElement(tag, attributes, events) {
    const element = doc.createElement(tag);
    for (let a in attributes) {
      element.setAttribute(a, attributes[a]);
    }
    for (let e in events) {
      element.addEventListener(e, events[e]);
    }
    return element;
  }

  function showBackdrop() {
    const backdrop = doc.getElementById(backdropId);
    if (backdrop === null) {
      setUp();
      return;
    }

    backdrop.style.left = '0px';
    const input = doc.getElementById(scanInputId);
    if (input !== null) {
      input.focus();
    }
  }

  function hideBackdrop() {
    const backdrop = doc.getElementById(backdropId);
    const input = doc.getElementById(scanInputId);

    if (input !== null) {
      input.value = '';
      input.blur();
    }
    if (backdrop !== null) {
      backdrop.style.left = '-200%';
    }
  }

  function fillForm(data) {
    const pc = doc.getElementById(pcId);
    if (pc !== null) {
      pc.value = data.pc;
    }
    const lot = doc.getElementById(lotId);
    if (lot !== null) {
      lot.value = data.lot;
    }
    const exp = doc.getElementById(expId);
    if (exp !== null) {
      exp.value = data.rawExp;
    }
    const sn = doc.getElementById(snId);
    if (sn !== null) {
      sn.value = data.sn;
    }
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
    const pack = {
      scheme: 'GTIN',
      pc: '',
      lot: '',
      exp: '',
      rawExp: '',
      sn: '',
    };

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
})(this, this.document);
