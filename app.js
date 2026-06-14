/* ============================================================
   QRコードメーカー  app.js
   - URL入力 → QR生成（角丸スタイル）
   - 中央に「画像 / アイコン / テキスト」を合成
   - ライブプレビュー & PNGダウンロード
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 定数 ---------- */
  var DEFAULT_URL = 'https://example.com';
  var INDIGO = '#4f46e5';
  var DARK = '#0f1729';
  var LIGHT = '#ffffff';
  var FONT = '"Hiragino Kaku Gothic ProN","Noto Sans JP","Meiryo",sans-serif';

  /* ---------- アイコン定義（icons/ フォルダの画像を使用） ----------
     各アイコンは icons/ 内のSVG画像で表示します。
     画像を差し替えるときは同名ファイルを上書きするか、新しいファイルを
     置いて下記の img パスを変更してください。詳細は icons/README.txt 参照。
  --------------------------------------------------------------- */
  var ICONS = {
    instagram: { label: 'Instagram', img: 'icons/instagram.svg' },
    x:         { label: 'X',          img: 'icons/x.svg' },
    youtube:   { label: 'YouTube',    img: 'icons/youtube.svg' },
    tiktok:    { label: 'TikTok',     img: 'icons/tiktok.svg' },
    facebook:  { label: 'Facebook',   img: 'icons/facebook.svg' },
    line:      { label: 'LINE',       img: 'icons/line.svg' },
    threads:   { label: 'Threads',    img: 'icons/threads.svg' },
    note:      { label: 'note',       img: 'icons/note.svg' },
    discord:   { label: 'Discord',    img: 'icons/discord.svg' },
    wifi:      { label: 'Wi-Fi',      img: 'icons/wifi.svg' },
    map:       { label: '地図',        img: 'icons/map.svg' },
    calendar:  { label: 'カレンダー',  img: 'icons/calendar.svg' }
  };
  var ICON_KEYS = Object.keys(ICONS);
  var DEFAULT_ICON = 'instagram';

  // アイコン画像（SVG）の読み込み（キャッシュ付き）
  var _imgFileCache = {};
  function loadIconImageFile(key) {
    var entry = ICONS[key];
    var path = entry && entry.img;
    if (!path) return Promise.resolve(null);
    if (key in _imgFileCache) return Promise.resolve(_imgFileCache[key]);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { _imgFileCache[key] = img; resolve(img); };
      img.onerror = function () { _imgFileCache[key] = null; resolve(null); };
      img.src = path;
    });
  }

  /* ---------- テンプレート定義 ---------- */
  var TEMPLATES = [
    { theme: 't-violet', title: 'SNSリンク',            desc: 'Instagram・X・YouTube など', url: 'https://instagram.com',           opts: { mode: 'icon', icon: 'instagram' } },
    { theme: 't-green',  title: 'LINE公式アカウント',    desc: '友だち追加・予約・問い合わせに', url: 'https://line.me/',                opts: { mode: 'icon', icon: 'line' } },
    { theme: 't-orange', title: 'ナンバリング・整理番号', desc: '整理券・席番号・商品番号に',  url: 'https://example.com',             opts: { mode: 'text', text: 'A-12' } },
    { theme: 't-blue',   title: 'Wi-Fi接続',            desc: 'Wi-Fiの接続を簡単に',        url: 'WIFI:T:WPA;S:MyWiFi;P:password;;', opts: { mode: 'icon', icon: 'wifi' } },
    { theme: 't-amber',  title: 'ポートフォリオ・名刺',  desc: 'プロフィール・実績の発信に',   url: 'https://note.com/',               opts: { mode: 'icon', icon: 'note' } }
  ];

  /* ---------- 状態 ---------- */
  var state = {
    mode: 'icon',          // 'image' | 'icon' | 'text'
    url: '',
    icon: DEFAULT_ICON,    // 初期：Instagram
    text: '',
    image: null,           // Image オブジェクト
    imgFocusX: 0.5,        // アップロード画像の表示位置（横 0=左 1=右）
    imgFocusY: 0.5,        // 〃（縦 0=上 1=下）
    imgZoom: 1             // 〃 ズーム倍率
  };

  var els = {};

  /* ============================================================
     Canvas 描画ヘルパー
     ============================================================ */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ファインダー（3隅の四角）を角丸でスタイリッシュに描画
  function drawFinder(ctx, x, y, cell) {
    var s = 7 * cell;
    ctx.fillStyle = DARK;  roundRect(ctx, x, y, s, s, cell * 2.2); ctx.fill();
    ctx.fillStyle = LIGHT; roundRect(ctx, x + cell, y + cell, 5 * cell, 5 * cell, cell * 1.6); ctx.fill();
    ctx.fillStyle = DARK;  roundRect(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 1.0); ctx.fill();
  }

  function inFinder(r, c, count) {
    return (r < 7 && c < 7) ||
           (r < 7 && c >= count - 7) ||
           (r >= count - 7 && c < 7);
  }

  /* ============================================================
     QR 本体の描画
     ============================================================ */
  function paintQR(canvas, opts, target) {
    try {
      if (typeof qrcode === 'undefined') {
        return Promise.reject(new Error('qr-lib-missing'));
      }
      var text = (opts.url && opts.url.trim()) || DEFAULT_URL;
      var qr = qrcode(0, 'H');          // typeNumber=0（自動）, 誤り訂正レベルH
      qr.addData(text, 'Byte');
      qr.make();
      var count = qr.getModuleCount();

      var qz = 4;                                       // クワイエットゾーン（モジュール数）
      var cell = Math.max(1, Math.floor(target / (count + qz * 2)));
      var size = cell * (count + qz * 2);
      var off = qz * cell;

      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');

      // 背景
      ctx.fillStyle = LIGHT;
      ctx.fillRect(0, 0, size, size);

      // データモジュール（角丸ドット）
      ctx.fillStyle = DARK;
      var pad = cell * 0.07;
      var dotR = cell * 0.34;
      for (var r = 0; r < count; r++) {
        for (var c = 0; c < count; c++) {
          if (!qr.isDark(r, c)) continue;
          if (inFinder(r, c, count)) continue;
          var x = off + c * cell + pad;
          var y = off + r * cell + pad;
          roundRect(ctx, x, y, cell - pad * 2, cell - pad * 2, dotR);
          ctx.fill();
        }
      }

      // ファインダー（3隅）
      drawFinder(ctx, off, off, cell);
      drawFinder(ctx, off + (count - 7) * cell, off, cell);
      drawFinder(ctx, off, off + (count - 7) * cell, cell);

      // 中央コンテンツ
      return drawCenter(ctx, size, opts);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /* ---------- 中央：画像 / アイコン / テキスト ---------- */
  function drawCenter(ctx, size, opts) {
    var cx = size / 2, cy = size / 2;

    // --- 画像モード（円形・位置/ズーム調整対応 #1 #2） ---
    if (opts.mode === 'image') {
      if (!opts.image) return Promise.resolve(); // 画像未選択：中央は加工せずQRそのまま
      var irad = size * 0.165;                  // 画像円の半径
      var iring = size * 0.014;
      ctx.fillStyle = LIGHT;                     // 外周の白い余白リング
      circle(ctx, cx, cy, irad + iring); ctx.fill();

      ctx.save();
      circle(ctx, cx, cy, irad); ctx.clip();     // 円形クリップ
      var img = opts.image;
      var bbox = irad * 2;
      var zoom = opts.imgZoom || 1;
      var fx = (opts.imgFocusX == null) ? 0.5 : opts.imgFocusX;
      var fy = (opts.imgFocusY == null) ? 0.5 : opts.imgFocusY;
      var baseScale = Math.max(bbox / img.width, bbox / img.height); // cover
      var scale = baseScale * zoom;
      var dw = img.width * scale, dh = img.height * scale;
      var dx = cx - fx * dw;                     // フォーカス点を中心へ
      var dy = cy - fy * dh;
      var l = cx - irad, rt = cx + irad, tp = cy - irad, bt = cy + irad;
      if (dx > l) dx = l;                         // 隙間が出ないようクランプ
      if (dx + dw < rt) dx = rt - dw;
      if (dy > tp) dy = tp;
      if (dy + dh < bt) dy = bt - dh;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      ctx.lineWidth = size * 0.009;              // 円の細い枠線
      ctx.strokeStyle = '#e3e6f4';
      circle(ctx, cx, cy, irad); ctx.stroke();
      return Promise.resolve();
    }

    // --- アイコン / テキスト共通：白い円 ---
    var rad = size * 0.155;
    ctx.fillStyle = LIGHT;
    circle(ctx, cx, cy, rad + size * 0.014); ctx.fill();   // 外側の余白リング
    circle(ctx, cx, cy, rad); ctx.fill();
    ctx.lineWidth = size * 0.009;
    ctx.strokeStyle = '#e3e6f4';
    circle(ctx, cx, cy, rad); ctx.stroke();

    // --- テキスト ---
    if (opts.mode === 'text') {
      var t = (opts.text || '01').slice(0, 4);
      ctx.fillStyle = INDIGO;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var scale = t.length <= 2 ? 1.0 : (t.length === 3 ? 0.78 : 0.62);
      var fs = rad * scale;
      ctx.font = '700 ' + fs + 'px ' + FONT;
      ctx.fillText(t, cx, cy + fs * 0.04);
      return Promise.resolve();
    }

    // --- アイコン：icons/ の画像（ブランドロゴ等）を白い円の中に contain 配置 ---
    var iconKey = opts.icon || DEFAULT_ICON;
    return loadIconImageFile(iconKey).then(function (fileImg) {
      if (!fileImg) return;
      var nw = fileImg.naturalWidth, nh = fileImg.naturalHeight;
      var ar = (nw && nh) ? nw / nh : 1;            // 寸法不明時は正方形扱い
      var s = rad * 1.36;
      var iw = s, ih = s;
      if (ar > 1) ih = s / ar; else iw = s * ar;
      ctx.drawImage(fileImg, cx - iw / 2, cy - ih / 2, iw, ih);
    });
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); }

  /* ============================================================
     メインプレビューの再描画
     ============================================================ */
  function render() {
    paintQR(els.canvas, state, 1024).then(function () {
      els.canvas.hidden = false;
      els.qrError.hidden = true;
    }).catch(function () {
      els.canvas.hidden = true;
      els.qrError.hidden = false;
    });
  }

  var renderTimer = null;
  function renderDebounced() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 150);
  }

  /* ============================================================
     UI 構築
     ============================================================ */
  function buildIconGrid() {
    var frag = document.createDocumentFragment();
    ICON_KEYS.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-item' + (key === state.icon ? ' is-active' : '');
      btn.dataset.icon = key;
      btn.setAttribute('aria-label', ICONS[key].label);
      btn.innerHTML = '<span class="icon-glyph"><img class="icon-img" src="' + ICONS[key].img + '" alt=""></span>' +
                      '<span class="icon-label">' + ICONS[key].label + '</span>';
      btn.addEventListener('click', function () {
        state.icon = key;
        updateIconSelection();
        render();
      });
      frag.appendChild(btn);
    });
    els.iconGrid.appendChild(frag);
  }

  function updateIconSelection() {
    var items = els.iconGrid.querySelectorAll('.icon-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', items[i].dataset.icon === state.icon);
    }
  }

  function buildTemplates() {
    var frag = document.createDocumentFragment();
    TEMPLATES.forEach(function (tpl) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'template-card ' + tpl.theme;
      var cv = document.createElement('canvas');
      cv.className = 'tpl-qr';
      var txt = document.createElement('div');
      txt.className = 'tpl-text';
      txt.innerHTML = '<p class="tpl-title">' + tpl.title + '</p><p class="tpl-desc">' + tpl.desc + '</p>';
      card.appendChild(cv);
      card.appendChild(txt);
      card.addEventListener('click', function () { applyTemplate(tpl); });
      frag.appendChild(card);

      // サムネイルQRを生成（#4：高解像度で大きく表示）
      paintQR(cv, { url: tpl.url, mode: tpl.opts.mode, icon: tpl.opts.icon, text: tpl.opts.text }, 320);
    });
    els.templateRow.appendChild(frag);
  }

  function applyTemplate(tpl) {
    state.url = tpl.url;
    els.urlInput.value = tpl.url;
    state.mode = tpl.opts.mode;
    if (tpl.opts.icon) { state.icon = tpl.opts.icon; updateIconSelection(); }
    if (tpl.opts.text) { state.text = tpl.opts.text; els.textInput.value = tpl.opts.text; }
    setMode(tpl.opts.mode);
    render();
    // 入力欄へスムーズにスクロール（小さい画面用）
    els.urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- モード切り替え ---------- */
  function setMode(mode) {
    state.mode = mode;
    for (var i = 0; i < els.modeCards.length; i++) {
      var active = els.modeCards[i].dataset.mode === mode;
      els.modeCards[i].classList.toggle('is-active', active);
      els.modeCards[i].setAttribute('aria-selected', active ? 'true' : 'false');
    }
    els.panelImage.hidden = mode !== 'image';
    els.panelIcon.hidden = mode !== 'icon';
    els.panelText.hidden = mode !== 'text';
  }

  /* ---------- 画像アップロード ---------- */
  function resetImgAdjust() {
    state.imgFocusX = 0.5; state.imgFocusY = 0.5; state.imgZoom = 1;
    if (els.focusX) { els.focusX.value = 0.5; els.focusY.value = 0.5; els.zoom.value = 1; }
  }

  function handleFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        state.image = img;
        resetImgAdjust();
        els.dzThumb.src = e.target.result;
        els.dzDefault.hidden = true;
        els.dzPreview.hidden = false;
        els.dropzone.classList.add('has-image');
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    state.image = null;
    els.fileInput.value = '';
    resetImgAdjust();
    els.dzDefault.hidden = false;
    els.dzPreview.hidden = true;
    els.dropzone.classList.remove('has-image');
    render();
  }

  /* ---------- PNGダウンロード ---------- */
  function download() {
    if (els.canvas.hidden) return;
    try {
      var link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = els.canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('ダウンロードに失敗しました。\n\nファイル（index.html）をブラウザで直接開いている場合、ブラウザのセキュリティ制限でアイコン入りQRの保存ができないことがあります。\n同梱の「start-server.bat」をダブルクリックして起動し直すと保存できます。');
    }
  }

  /* ============================================================
     初期化
     ============================================================ */
  function init() {
    // 日本語など非ASCIIのURL/文字列も正しくエンコードできるようUTF-8に設定
    if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }

    els.urlInput = document.getElementById('urlInput');
    els.modeCards = document.querySelectorAll('.mode-card');
    els.panelImage = document.getElementById('panel-image');
    els.panelIcon = document.getElementById('panel-icon');
    els.panelText = document.getElementById('panel-text');
    els.iconGrid = document.getElementById('iconGrid');
    els.textInput = document.getElementById('textInput');
    els.dropzone = document.getElementById('dropzone');
    els.fileInput = document.getElementById('fileInput');
    els.dzDefault = els.dropzone.querySelector('.dz-default');
    els.dzPreview = els.dropzone.querySelector('.dz-preview');
    els.dzThumb = document.getElementById('dzThumb');
    els.dzChange = document.getElementById('dzChange');
    els.dzDelete = document.getElementById('dzDelete');
    els.focusX = document.getElementById('focusX');
    els.focusY = document.getElementById('focusY');
    els.zoom = document.getElementById('zoom');
    els.generateBtn = document.getElementById('generateBtn');
    els.downloadBtn = document.getElementById('downloadBtn');
    els.canvas = document.getElementById('qrCanvas');
    els.qrError = document.getElementById('qrError');
    els.templateRow = document.getElementById('templateRow');

    buildIconGrid();
    buildTemplates();
    setMode(state.mode);

    // URL入力
    els.urlInput.addEventListener('input', function () {
      state.url = els.urlInput.value;
      renderDebounced();
    });

    // テキスト入力
    els.textInput.addEventListener('input', function () {
      state.text = els.textInput.value;
      renderDebounced();
    });

    // モードカード
    for (var i = 0; i < els.modeCards.length; i++) {
      els.modeCards[i].addEventListener('click', function () {
        setMode(this.dataset.mode);
        render();
      });
    }

    // ファイル選択は「空エリア(dz-default)のクリック/キー操作」と「画像を追加ボタン」のみ。
    // dropzone 全体には付けないので、スライダー操作では絶対に開かない。
    els.dzDefault.addEventListener('click', function () { els.fileInput.click(); });
    els.dzDefault.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    els.fileInput.addEventListener('change', function () {
      if (els.fileInput.files && els.fileInput.files[0]) handleFile(els.fileInput.files[0]);
    });
    els.dzChange.addEventListener('click', function () { els.fileInput.click(); }); // 「画像を追加」
    els.dzDelete.addEventListener('click', function () { clearImage(); });

    // 画像の位置・ズーム調整（#2）
    els.focusX.addEventListener('input', function () { state.imgFocusX = parseFloat(this.value); renderDebounced(); });
    els.focusY.addEventListener('input', function () { state.imgFocusY = parseFloat(this.value); renderDebounced(); });
    els.zoom.addEventListener('input', function () { state.imgZoom = parseFloat(this.value); renderDebounced(); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      els.dropzone.addEventListener(ev, function (e) { e.preventDefault(); els.dropzone.classList.add('is-drag'); });
    });
    ['dragleave', 'dragend', 'drop'].forEach(function (ev) {
      els.dropzone.addEventListener(ev, function (e) { e.preventDefault(); els.dropzone.classList.remove('is-drag'); });
    });
    els.dropzone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    // 生成 / ダウンロード
    els.generateBtn.addEventListener('click', render);
    els.downloadBtn.addEventListener('click', download);

    // 初期描画
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
