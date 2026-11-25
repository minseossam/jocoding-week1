// 페이지를 새로고침하지 않고 Formspree로 보내고, 결과를 화면에 알려 준다
var form = document.getElementById('partner-form');
var btn = document.getElementById('submit-btn');
var statusBox = document.getElementById('status');

function show(msg, cls) {
  statusBox.textContent = msg;
  statusBox.className = cls || '';
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  // 아직 Formspree 주소를 안 넣었으면 안내만 한다
  if (form.action.indexOf('YOUR_FORM_ID') !== -1) {
    show('아직 Formspree 주소가 설정되지 않았어요. partner.html 의 YOUR_FORM_ID 를 바꿔 주세요.', 'err');
    return;
  }

  btn.disabled = true;
  show('보내는 중...');

  fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { 'Accept': 'application/json' }
  })
    .then(function (res) {
      if (res.ok) {
        form.reset();
        show('문의가 접수되었습니다. 감사합니다!', 'ok');
      } else {
        show('전송에 실패했어요. 잠시 뒤 다시 시도해 주세요.', 'err');
      }
    })
    .catch(function () {
      show('네트워크 오류가 났어요. 인터넷 연결을 확인해 주세요.', 'err');
    })
    .then(function () {
      btn.disabled = false;
    });
});
