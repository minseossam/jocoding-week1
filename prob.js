// 로또 6/45 확률 계산기: n장을 샀을 때 당첨 확률
(function () {
  var input = document.getElementById('tickets');
  if (!input) return;
  var out = document.getElementById('calc-out');

  var TOTAL = 8145060;       // C(45,6)
  var ANY_PRIZE = 194130;    // 1~5등에 해당하는 조합 수 (1 + 6 + 228 + 11,115 + 182,780)

  function pct(p) {
    var v = p * 100;
    if (v >= 99.99) return '99.99% 이상';   // 100%로 반올림되어 ‘확실’처럼 보이는 것을 막는다
    return v.toLocaleString('ko-KR', { maximumSignificantDigits: 3 }) + '%';
  }
  // n장 중 한 장이라도 맞을 확률 = 1 - (1 - 한 장의 확률)^n
  function atLeastOne(perTicket, n) {
    return 1 - Math.pow(1 - perTicket, n);
  }

  function update() {
    var n = parseInt(input.value, 10);
    if (!n || n < 1) { out.textContent = '1 이상의 숫자를 입력해 주세요.'; return; }
    if (n > 1000000) n = 1000000;
    out.innerHTML =
      '<p><b>' + n.toLocaleString('ko-KR') + '장</b>을 샀을 때</p>' +
      '<p>1등에 한 번이라도 당첨될 확률: <b>' + pct(atLeastOne(1 / TOTAL, n)) + '</b></p>' +
      '<p>5등 이상(3개 이상 일치)에 한 번이라도 당첨될 확률: <b>' + pct(atLeastOne(ANY_PRIZE / TOTAL, n)) + '</b></p>';
  }

  document.getElementById('calc-btn').addEventListener('click', update);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') update(); });
  update();
})();
