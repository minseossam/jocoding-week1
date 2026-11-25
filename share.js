// 공유 버튼: 링크 복사, 휴대폰 공유창, X(트위터), 페이스북, 네이버, 밴드
// 결과 카드 이미지: 사진은 넣지 않고 얼굴형 이름과 어울리는 스타일만 그린다.
(function () {
  function track(method) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'share', method: method });
  }
  function enc(s) { return encodeURIComponent(s); }

  // 공유 링크에는 출처 표시(utm)를 붙여 어디서 들어왔는지 분석할 수 있게 한다
  function withUtm(url, medium) {
    var u = new URL(url, location.href);
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', medium);
    return u.toString();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (e) { reject(e); }
    });
  }

  function mount(el, opt) {
    var title = opt.title, text = opt.text, url = opt.url;
    el.innerHTML = '';
    el.classList.add('share-bar');
    var label = document.createElement('span');
    label.className = 'share-label';
    label.textContent = opt.label || '친구에게 공유하기';
    el.appendChild(label);
    var row = document.createElement('div');
    row.className = 'share-row';
    el.appendChild(row);
    var toast = document.createElement('p');
    toast.className = 'share-toast';
    toast.setAttribute('role', 'status');

    function btn(text, onClick) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'share-btn'; b.textContent = text;
      b.addEventListener('click', onClick);
      row.appendChild(b);
      return b;
    }
    function link(text, href, method) {
      var a = document.createElement('a');
      a.className = 'share-btn'; a.textContent = text; a.href = href;
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.addEventListener('click', function () { track(method); });
      row.appendChild(a);
    }
    function note(t) { toast.textContent = t; }

    if (navigator.share) {
      btn('공유하기', function () {
        navigator.share({ title: title, text: text, url: withUtm(url, 'webshare') })
          .then(function () { track('webshare'); })
          .catch(function () {});
      }).classList.add('primary');
    }
    btn('링크 복사', function () {
      copyText(withUtm(url, 'copy')).then(function () { note('링크를 복사했어요. 카카오톡이나 인스타그램에 붙여 넣어 보세요.'); track('copy'); },
        function () { note('복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.'); });
    });
    link('X(트위터)', 'https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(withUtm(url, 'twitter')), 'twitter');
    link('페이스북', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(withUtm(url, 'facebook')), 'facebook');
    link('네이버', 'https://share.naver.com/web/shareView?url=' + enc(withUtm(url, 'naver')) + '&title=' + enc(title), 'naver');
    link('밴드', 'https://band.us/plugin/share?body=' + enc(text + '\n' + withUtm(url, 'band')) + '&route=' + enc(location.host), 'band');
    el.appendChild(toast);
    return { note: note };
  }

  /* ---------- 결과 카드 이미지 ---------- */
  function svgToImage(svg) {
    return new Promise(function (resolve, reject) {
      var s = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }

  function wrap(ctx, text, x, y, maxW, lineH) {
    var line = '', lines = 0;
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lineH; line = text[i]; lines++; }
      else line = t;
    }
    ctx.fillText(line, x, y);
    return y + lineH;
  }

  function makeCard(shape, second) {
    var W = 1080, H = 1350;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eef2ff'); g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5d6385'; ctx.font = '600 40px ' + FONT;
    ctx.fillText('사진으로 찾은 내 얼굴형', W / 2, 130);
    ctx.fillStyle = '#3956d6'; ctx.font = '800 150px ' + FONT;
    ctx.fillText(shape.name, W / 2, 300);
    if (second) { ctx.fillStyle = '#5d6385'; ctx.font = '500 38px ' + FONT; ctx.fillText('+ ' + second.name + '의 특징도 있어요', W / 2, 360); }
    return svgToImage(shape.svg).then(function (img) {
      var iw = 300, ih = 360;
      ctx.drawImage(img, (W - iw) / 2, 400, iw, ih);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1c2033'; ctx.font = '800 46px ' + FONT;
      ctx.fillText('어울리는 머리스타일', 110, 850);
      ctx.fillStyle = '#2b2f44'; ctx.font = '500 42px ' + FONT;
      var y = 920;
      shape.good.slice(0, 3).forEach(function (t) {
        ctx.fillStyle = '#4a6cf7'; ctx.fillText('•', 110, y);
        ctx.fillStyle = '#2b2f44';
        y = wrap(ctx, t, 150, y, W - 260, 58) + 14;
      });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#5d6385'; ctx.font = '600 36px ' + FONT;
      ctx.fillText('얼굴형 헤어 노트 · ' + location.host, W / 2, H - 70);
      return c;
    });
  }

  function canvasToBlob(c) {
    return new Promise(function (resolve) { c.toBlob(resolve, 'image/png'); });
  }

  function mountCard(el, shape, second, shareText, url) {
    var wrapEl = document.createElement('div');
    wrapEl.className = 'card-actions';
    var save = document.createElement('button');
    save.type = 'button'; save.className = 'share-btn'; save.textContent = '결과 카드 저장';
    var shareImg = document.createElement('button');
    shareImg.type = 'button'; shareImg.className = 'share-btn'; shareImg.textContent = '카드 이미지로 공유';
    var note = document.createElement('p');
    note.className = 'share-toast'; note.setAttribute('role', 'status');
    wrapEl.appendChild(save);
    if (navigator.canShare) wrapEl.appendChild(shareImg);
    wrapEl.appendChild(note);
    el.appendChild(wrapEl);

    save.addEventListener('click', function () {
      makeCard(shape, second).then(canvasToBlob).then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'my-face-shape-' + shape.slug + '.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        note.textContent = '카드를 저장했어요. 사진은 들어 있지 않고 얼굴형과 추천 스타일만 담겨 있어요.';
        track('card_save');
      });
    });
    shareImg.addEventListener('click', function () {
      makeCard(shape, second).then(canvasToBlob).then(function (blob) {
        var file = new File([blob], 'my-face-shape.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], text: shareText, url: withUtm(url, 'card') }).then(function () { track('card_share'); });
        }
        note.textContent = '이 기기에서는 이미지 공유를 지원하지 않아요. "결과 카드 저장" 후 직접 올려 주세요.';
      }).catch(function () {});
    });
  }

  window.ShareBar = { mount: mount, mountCard: mountCard };

  // 페이지에 미리 만들어 둔 공유 자리(<div class="share" data-...>)를 채운다
  var nodes = document.querySelectorAll('.share[data-share-url]');
  Array.prototype.forEach.call(nodes, function (el) {
    mount(el, {
      title: el.getAttribute('data-share-title') || document.title,
      text: el.getAttribute('data-share-text') || document.title,
      url: el.getAttribute('data-share-url'),
      label: el.getAttribute('data-share-label')
    });
  });
})();
