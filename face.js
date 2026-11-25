// 얼굴형 찾기: 입력한 숫자는 이 기기 안에서만 계산한다 (서버로 보내지 않음)
(function () {
  // 광대 너비를 1로 보았을 때 각 얼굴형의 대표 비율
  //  r = 얼굴 길이 / 광대, f = 이마 / 광대, j = 턱 / 광대, jaw = 어울리는 턱선 모양
  var PROTO = {
    oval:    { r: 1.42, f: 0.84, j: 0.76, jaw: ['soft'] },
    round:   { r: 1.20, f: 0.88, j: 0.86, jaw: ['soft'] },
    square:  { r: 1.25, f: 0.90, j: 0.90, jaw: ['angular'] },
    long:    { r: 1.58, f: 0.88, j: 0.84, jaw: ['soft', 'angular'] },
    heart:   { r: 1.40, f: 1.00, j: 0.68, jaw: ['pointed'] },
    diamond: { r: 1.45, f: 0.76, j: 0.74, jaw: ['angular', 'pointed'] }
  };
  var CLOSE_GAP = 1.5; // 1·2등 점수 차이가 이보다 작으면 두 얼굴형을 함께 보여 준다

  function sq(x) { return x * x; }

  // len: 길이, cheek: 광대, fore: 이마, jaw: 턱 너비, shape: 'soft' | 'angular' | 'pointed'
  function classify(len, cheek, fore, jaw, shape) {
    var m = { r: len / cheek, f: fore / cheek, j: jaw / cheek };
    var list = Object.keys(PROTO).map(function (id) {
      var p = PROTO[id];
      var d = sq((m.r - p.r) / 0.12) + sq((m.f - p.f) / 0.08) + sq((m.j - p.j) / 0.08);
      if (p.jaw.indexOf(shape) < 0) d += 1.5;
      return { id: id, d: d };
    }).sort(function (a, b) { return a.d - b.d; });
    return {
      ratios: m,
      first: list[0].id,
      second: (list[1].d - list[0].d < CLOSE_GAP) ? list[1].id : null
    };
  }

  window.FaceFinder = { classify: classify };

  var form = document.getElementById('face-form');
  if (!form) return;
  var S = window.SHAPES || {};
  var msg = document.getElementById('face-msg');
  var box = document.getElementById('result');

  function num(id) { return parseFloat(document.getElementById(id).value); }
  function items(arr) { return arr.map(function (t) { return '<li>' + t + '</li>'; }).join(''); }

  function render(res) {
    var a = S[res.first];
    var html = '';
    html += '<h2>내 얼굴형은 <span class="name">' + a.name + '</span>에 가까워요</h2>';
    html += '<div class="res-top">' + a.svg + '<p>' + a.short + '</p></div>';
    if (res.second) {
      var b = S[res.second];
      html += '<p class="note warn">' + a.name + '과(와) <b>' + b.name + '</b>의 특징이 함께 보여요. 두 얼굴형의 설명을 모두 참고하세요. ' +
              '<a href="./' + b.slug + '">' + b.name + ' 얼굴 보기</a></p>';
    }
    html += '<h3>스타일링 목표</h3><p>' + a.goal + '</p>';
    html += '<h3>어울리는 스타일</h3><ul>' + items(a.good) + '</ul>';
    html += '<h3>피하면 좋은 스타일</h3><ul>' + items(a.avoid) + '</ul>';
    html += '<h3>스타일링 팁</h3><ul>' + items(a.tips) + '</ul>';
    html += '<p><a class="btn" href="./' + a.slug + '">' + a.name + ' 얼굴 자세히 보기</a></p>';
    html += '<p class="fine">입력값 비율 (광대=1): 길이 ' + res.ratios.r.toFixed(2) +
            ' · 이마 ' + res.ratios.f.toFixed(2) + ' · 턱 ' + res.ratios.j.toFixed(2) +
            '. 결과는 참고용이며 모질·두상에 따라 어울리는 스타일은 달라질 수 있어요.</p>';
    box.innerHTML = html;
    box.hidden = false;
    // 방문 가치 측정용: 결과 얼굴형 이름만 전달 (입력한 길이·너비 값은 보내지 않음)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'face_result', face_shape: res.first, face_shape_second: res.second || '' });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';
    var len = num('len'), cheek = num('cheek'), fore = num('fore'), jaw = num('jaw');
    if (!(len > 0 && cheek > 0 && fore > 0 && jaw > 0)) {
      msg.textContent = '네 칸에 모두 0보다 큰 숫자를 입력해 주세요.';
      return;
    }
    var r = len / cheek, f = fore / cheek, j = jaw / cheek;
    if (r < 0.9 || r > 2.4 || f < 0.4 || f > 1.4 || j < 0.4 || j > 1.4) {
      msg.textContent = '입력값의 비율이 이상해요. 네 값을 같은 단위로 쟀는지, 위치를 바꿔 입력하지 않았는지 확인해 주세요.';
      return;
    }
    var shape = (form.querySelector('input[name="jawshape"]:checked') || {}).value || 'soft';
    render(classify(len, cheek, fore, jaw, shape));
  });
})();
