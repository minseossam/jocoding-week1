// 버튼을 누르면 로또 번호 6개를 뽑아 공으로 보여 준다
document.getElementById('btn').addEventListener('click', function () {
  // 1~45 중 겹치지 않는 6개를 뽑아 작은 수부터 정렬
  var pool = [];
  for (var i = 1; i <= 45; i++) pool.push(i);

  var picked = [];
  while (picked.length < 6) {
    var idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  picked.sort(function (a, b) { return a - b; });

  var box = document.getElementById('balls');
  box.innerHTML = '';
  picked.forEach(function (n) {
    var d = document.createElement('div');
    d.className = 'ball r' + (n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : n <= 40 ? 4 : 5);
    d.textContent = n;
    box.appendChild(d);
  });
});
