// 사진·카메라로 얼굴형 분석: 사진은 서버로 보내지 않고 이 기기(브라우저) 안에서만 처리한다.
// 얼굴 윤곽점 찾기에는 Google MediaPipe Face Landmarker를 쓰며,
// 분석 도구(약 4MB)는 사진을 고른 뒤에 처음 한 번만 불러온다.
(function () {
  var root = document.getElementById('photo-tool');
  if (!root) return;

  var VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
  var WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
  var MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  var MAX_SIDE = 960;

  var fileInput = document.getElementById('photo-file');
  var btnUpload = document.getElementById('btn-upload');
  var btnCamera = document.getElementById('btn-camera');
  var btnSnap = document.getElementById('btn-snap');
  var btnStop = document.getElementById('btn-stop');
  var btnClear = document.getElementById('btn-clear');
  var video = document.getElementById('cam');
  var stage = document.getElementById('photo-stage');
  var canvas = document.getElementById('photo-canvas');
  var msg = document.getElementById('photo-msg');
  var stream = null;
  var landmarkerPromise = null;

  function say(text, kind) {
    msg.textContent = text || '';
    msg.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function track(name, params) {
    window.dataLayer = window.dataLayer || [];
    var e = { event: name };
    for (var k in params) e[k] = params[k];
    window.dataLayer.push(e);
  }

  /* ---------- 분석 도구 불러오기 (처음 한 번) ---------- */
  function loadLandmarker() {
    if (!landmarkerPromise) {
      say('분석 도구를 불러오는 중이에요. 처음 한 번만 약 4MB를 받아요…');
      landmarkerPromise = import(VISION_URL).then(function (vision) {
        return vision.FilesetResolver.forVisionTasks(WASM_URL).then(function (fileset) {
          return vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
            runningMode: 'IMAGE',
            numFaces: 2
          });
        });
      }).catch(function (err) {
        landmarkerPromise = null;
        throw err;
      });
    }
    return landmarkerPromise;
  }

  /* ---------- 사진 → 캔버스 ---------- */
  function drawToCanvas(source, w, h) {
    var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  function fileToCanvas(file) {
    // createImageBitmap은 사진에 저장된 방향 정보(EXIF)를 반영해 준다
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        drawToCanvas(bmp, bmp.width, bmp.height);
        if (bmp.close) bmp.close();
      });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { drawToCanvas(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); resolve(); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  /* ---------- 얼굴 윤곽점 → 측정값 ---------- */
  // 468점 얼굴 메시 번호: 10 이마 위, 152 턱 끝, 234·454 광대/얼굴 가장 넓은 곳,
  // 54·284 이마 양쪽, 172·397 턱각(아래턱 모서리), 149·378 턱 끝 근처, 33·263 눈 바깥쪽(수평 맞추기), 1 코끝
  function measure(lm, w, h) {
    function P(i) { return { x: lm[i].x * w, y: lm[i].y * h }; }
    var a = P(33), b = P(263);
    var ang = Math.atan2(b.y - a.y, b.x - a.x);   // 머리가 기울어진 만큼 되돌려 수평으로 맞춘다
    var cos = Math.cos(-ang), sin = Math.sin(-ang);
    function R(i) { var p = P(i); return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }; }
    var top = R(10), chin = R(152);
    var m = {
      length: Math.abs(chin.y - top.y),
      cheek: Math.abs(R(454).x - R(234).x),
      fore: Math.abs(R(284).x - R(54).x),
      jaw: Math.abs(R(397).x - R(172).x),
      chinW: Math.abs(R(378).x - R(149).x)
    };
    var nose = R(1);
    var left = Math.abs(nose.x - R(234).x), right = Math.abs(R(454).x - nose.x);
    m.yaw = Math.min(left, right) / Math.max(left, right);   // 1에 가까울수록 정면
    m.tilt = Math.abs(ang) * 180 / Math.PI;
    // 턱선 모양 추정: 턱 끝이 좁으면 갸름한 편, 턱 폭이 광대와 비슷하고 턱 끝도 넓으면 각진 편
    var chinRatio = m.chinW / m.jaw, jawRatio = m.jaw / m.cheek;
    m.jawShape = chinRatio < 0.5 ? 'pointed' : (jawRatio > 0.9 && chinRatio > 0.7 ? 'angular' : 'soft');
    m.points = { top: P(10), chin: P(152), cL: P(234), cR: P(454), fL: P(54), fR: P(284), jL: P(172), jR: P(397) };
    return m;
  }

  // 사진 위에 측정한 위치를 그려 보여 준다 (무엇을 쟀는지 눈으로 확인할 수 있게)
  function drawOverlay(m) {
    var ctx = canvas.getContext('2d');
    var p = m.points;
    var lw = Math.max(2, canvas.width / 240);
    ctx.lineWidth = lw;
    function line(a, b, color) {
      ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      [a, b].forEach(function (q) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(q.x, q.y, lw * 1.6, 0, 6.283); ctx.fill(); });
    }
    line(p.top, p.chin, '#ffd400');
    line(p.cL, p.cR, '#ff5a4a');
    line(p.fL, p.fR, '#31c48d');
    line(p.jL, p.jR, '#4a8dff');
  }

  /* ---------- 분석 ---------- */
  function analyze() {
    return loadLandmarker().then(function (landmarker) {
      say('얼굴을 분석하는 중이에요…');
      var res = landmarker.detect(canvas);
      var faces = res.faceLandmarks || [];
      if (!faces.length) {
        say('얼굴을 찾지 못했어요. 정면을 보고, 밝은 곳에서, 얼굴이 크게 나오도록 다시 찍어 주세요.', 'err');
        track('photo_fail', { reason: 'no_face' });
        return;
      }
      var lm = faces[0];
      if (faces.length > 1) {
        // 가장 큰 얼굴을 쓴다
        var best = 0, bestW = 0;
        faces.forEach(function (f, i) {
          var xs = f.map(function (q) { return q.x; });
          var wd = Math.max.apply(null, xs) - Math.min.apply(null, xs);
          if (wd > bestW) { bestW = wd; best = i; }
        });
        lm = faces[best];
      }
      var m = measure(lm, canvas.width, canvas.height);
      drawOverlay(m);
      var warn = [];
      if (faces.length > 1) warn.push('사진에 얼굴이 여러 개라 가장 큰 얼굴로 분석했어요.');
      if (m.yaw < 0.75) warn.push('얼굴이 한쪽으로 돌아가 있어 결과가 부정확할 수 있어요. 정면으로 다시 찍어 보세요.');
      if (m.tilt > 20) warn.push('고개가 많이 기울어 있어요. 똑바로 찍으면 더 정확해요.');
      say(warn.length ? warn.join(' ') : '분석이 끝났어요. 아래 결과를 확인하세요.', warn.length ? 'warn' : 'ok');

      // 직접 입력 칸에도 같은 값을 채워 둔다 (고쳐서 다시 볼 수 있게)
      function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v.toFixed(1); }
      setVal('len', m.length); setVal('cheek', m.cheek); setVal('fore', m.fore); setVal('jaw', m.jaw);
      var radio = document.querySelector('input[name="jawshape"][value="' + m.jawShape + '"]');
      if (radio) radio.checked = true;

      if (window.FaceFinder && window.FaceFinder.show) {
        window.FaceFinder.show(m.length, m.cheek, m.fore, m.jaw, m.jawShape, { source: 'photo' });
      }
      btnClear.hidden = false;
    }).catch(function (err) {
      say('분석 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나, 아래에서 숫자를 직접 입력해 주세요.', 'err');
      track('photo_fail', { reason: 'load_error' });
      if (window.console) console.warn(err);
    });
  }

  function showStage(isVideo) {
    stage.hidden = false;
    video.hidden = !isVideo;
    canvas.hidden = isVideo;
    btnSnap.hidden = !isVideo;
    btnStop.hidden = !isVideo;
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
  }

  /* ---------- 사진 올리기 ---------- */
  btnUpload.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { say('이미지 파일만 올릴 수 있어요.', 'err'); return; }
    stopCamera();
    showStage(false);
    say('사진을 불러오는 중이에요…');
    fileToCanvas(file).then(analyze).catch(function () {
      say('이 사진을 열 수 없어요. JPG나 PNG 사진으로 다시 시도해 주세요.', 'err');
    });
    fileInput.value = '';   // 같은 사진을 다시 골라도 동작하게
    track('photo_start', { method: 'upload' });
  });

  /* ---------- 카메라로 찍기 ---------- */
  btnCamera.addEventListener('click', function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      say('이 브라우저에서는 카메라를 쓸 수 없어요. 대신 "사진 올리기"를 눌러 주세요.', 'err');
      return;
    }
    say('카메라 권한을 허용해 주세요. 영상은 저장되거나 전송되지 않아요.');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        showStage(true);
        video.play();
        say('정면을 보고 얼굴이 화면 가운데 오도록 맞춘 뒤 "찰칵"을 눌러 주세요.');
        track('photo_start', { method: 'camera' });
      })
      .catch(function () {
        say('카메라를 켤 수 없어요. 권한을 허용했는지 확인하거나 "사진 올리기"를 이용해 주세요.', 'err');
      });
  });

  btnSnap.addEventListener('click', function () {
    if (!video.videoWidth) { say('카메라가 아직 준비되지 않았어요. 잠시 후 다시 눌러 주세요.', 'err'); return; }
    drawToCanvas(video, video.videoWidth, video.videoHeight);
    stopCamera();
    showStage(false);
    analyze();
  });

  btnStop.addEventListener('click', function () {
    stopCamera();
    stage.hidden = true;
    say('');
  });

  /* ---------- 사진 지우기 ---------- */
  btnClear.addEventListener('click', function () {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 1; canvas.height = 1;
    stage.hidden = true;
    btnClear.hidden = true;
    var box = document.getElementById('result');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    say('사진을 지웠어요. 기기에도 남아 있지 않아요.');
  });

  window.addEventListener('pagehide', stopCamera);
})();
