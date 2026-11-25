// 로또 6/45 번호 추천: 1~45 중 겹치지 않는 6개를 작은 수부터 보여 준다
(function () {
  var btn = document.getElementById('btn');
  if (!btn) return;
  var countSel = document.getElementById('count');
  var setsBox = document.getElementById('sets');
  var copyBtn = document.getElementById('copy');
  var copyMsg = document.getElementById('copy-msg');
  var lastSets = [];

  // 0 이상 max 미만의 정수. 브라우저 보안 난수를 쓰고, 없으면 Math.random 사용
  function randInt(max) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      var limit = Math.floor(4294967296 / max) * max; // 치우침 방지
      do { crypto.getRandomValues(a); } while (a[0] >= limit);
      return a[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function pickSet() {
    var pool = [];
    for (var i = 1; i <= 45; i++) pool.push(i);
    var picked = [];
    while (picked.length < 6) {
      picked.push(pool.splice(randInt(pool.length), 1)[0]);
    }
    return picked.sort(function (a, b) { return a - b; });
  }

  function colorClass(n) {
    return 'r' + (n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : n <= 40 ? 4 : 5);
  }

  function render() {
    var count = parseInt(countSel.value, 10) || 1;
    lastSets = [];
    setsBox.innerHTML = '';
    for (var s = 0; s < count; s++) {
      var nums = pickSet();
      lastSets.push(nums);
      var row = document.createElement('div');
      row.className = 'set';
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = String.fromCharCode(65 + s);
      row.appendChild(tag);
      nums.forEach(function (n) {
        var d = document.createElement('div');
        d.className = 'ball ' + colorClass(n);
        d.textContent = n;
        row.appendChild(d);
      });
      setsBox.appendChild(row);
    }
    copyBtn.hidden = false;
    copyMsg.textContent = '';
  }

  btn.addEventListener('click', render);

  copyBtn.addEventListener('click', function () {
    var text = lastSets.map(function (nums, i) {
      return String.fromCharCode(65 + i) + ': ' + nums.join(', ');
    }).join('\n');
    var done = function () { copyMsg.textContent = '복사했어요.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { copyMsg.textContent = '복사에 실패했어요.'; });
    } else {
      copyMsg.textContent = '이 브라우저에서는 복사를 지원하지 않아요.';
    }
  });
})();
