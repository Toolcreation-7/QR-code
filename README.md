# QRコードメーカー

URLを入力するだけで、中央に**画像・アイコン・番号**を入れたオリジナルQRコードを、
**ログイン不要・1画面**でかんたんに作成し、PNGでダウンロードできる静的Webアプリです。

## ✨ 特長
- ログイン・会員登録なし、画面遷移なしの1画面完結
- 中央に「画像 / アイコン / テキスト」を合成（位置・ズーム調整つき）
- 角丸スタイルのQR（誤り訂正レベル H で中央ロゴを入れても読み取りやすい）
- PNGダウンロード対応
- 完全静的（サーバー不要・オフライン動作。QR生成ライブラリを同梱）

## 🚀 ローカルで開く
`start-server.bat` をダブルクリック（または下記）して、ブラウザで http://localhost:4321 を開きます。

```bash
python -m http.server 4321
```

## 🌐 公開（GitHub Pages）
リポジトリの **Settings → Pages → Build and deployment → Source: `Deploy from a branch`** を選び、
ブランチ `main` ／ フォルダ `/ (root)` を指定して保存すると公開されます。
公開URLは `https://<ユーザー名>.github.io/<リポジトリ名>/` です。

## 📁 構成
| ファイル | 役割 |
|---|---|
| `index.html` | 画面構成 |
| `styles.css` | デザイン |
| `app.js` | QR生成・中央合成・プレビュー・DL |
| `qrcode.js` | QR生成ライブラリ（qrcode-generator・MIT・同梱） |
| `icons/` | アイコン画像（SVG） |

## 📝 ライセンス
同梱の `qrcode.js` は MIT License（Copyright (c) Kazuhiko Arase）です。
