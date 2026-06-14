■ アイコン画像について

QRコード中央とアイコングリッドに表示されるアイコンは、このフォルダ（icons/）内の
SVG画像を使用しています。

────────────────────────────────
【現在のアイコン（12種）】
  instagram.svg … Instagram
  x.svg         … X
  youtube.svg   … YouTube
  tiktok.svg    … TikTok
  facebook.svg  … Facebook
  line.svg      … LINE
  threads.svg   … Threads
  note.svg      … note
  discord.svg   … Discord
  wifi.svg      … Wi-Fi
  map.svg       … 地図
  calendar.svg  … カレンダー

────────────────────────────────
【画像を差し替える】
同じファイル名のまま上書き保存し、ブラウザを再読み込みするだけです。
（例：instagram.svg を別デザインに差し替え）

推奨：正方形／背景透過のSVG・PNG。
※SVGには width / height 属性を付けておくと、PNG書き出し時に
　全ブラウザで安定して描画されます（同梱の12ファイルは付与済み）。

────────────────────────────────
【アイコンの種類を追加・変更する】
1) 画像をこのフォルダに保存（例：pinterest.svg）
2) app.js 上部の ICONS に、キーと label・img を追記
     pinterest: { label: 'Pinterest', img: 'icons/pinterest.svg' },
3) ブラウザを再読み込み

※グリッドは横4列です。12〜16個程度がレイアウト上きれいに収まります。
　数を大きく変えたい場合はレイアウト調整も承ります。
