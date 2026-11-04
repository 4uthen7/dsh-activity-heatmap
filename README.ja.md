# dsh-activity-heatmap

[English](README.md) | 日本語 | [中文](README.zh.md)

DeepSeek Harness の利用量を GitHub 風のヒートマップで表示するプラグインです。

セッションログから、メッセージ数・ツール呼び出し・ターン・トークン・アクティブ時間・セッション数を日ごとに集計し、1日1マスで描きます。四角・角丸・丸・六角形・ひし形・星、そして自分で書いた SVG パスまで形を選べます。配色は5種類のプリセットとレベル別カラー。表示は1年・月別・直近の週から選べます。設定はすべてアプリ内で変更できます。

外部へのネットワーク通信はありません。セッションの中身が外に出ることもありません。Host 側が返すのは集計値だけです。

[![英語ナレーション・日本語字幕の66秒イントロ](docs/intro.gif)](docs/dsh-activity-heatmap-intro.mp4)

[66秒のイントロを見る](docs/dsh-activity-heatmap-intro.mp4)（MP4・1080p・英語ナレーション・日本語字幕）· [日本語字幕](docs/dsh-activity-heatmap-intro.ja.srt) · 架空のデモデータ

## 導入

エージェント向けの近道: `plugin_manager` ツールで `action: "install_bundle"`、
`target: "https://github.com/4uthen7/dsh-activity-heatmap"` を実行し、`activity`
セクションが有効になったことを確認します。詳しくは [AGENTS.md](AGENTS.md)。

### AI に頼む（いちばん簡単）

DeepSeek Harness のセッションに以下を貼り付けて送るだけです。

```text
https://github.com/4uthen7/dsh-activity-heatmap を DeepSeek Harness に導入して。
インストール後に Settings → アクティビティ が開くことまで確認して。
```

エージェント向けの手順は [AGENTS.md](AGENTS.md)、人向けの詳しい手順は [INSTALL.md](INSTALL.md) にあります。エージェントは `plugin_manager` ツールでバンドルを導入します。

### Plugins ページから

1. サイドバーの **Plugins** を開く
2. **Add plugin**（または矢印 → **Install a third-party plugin**）を選ぶ
3. `https://github.com/4uthen7/dsh-activity-heatmap` を貼り付けて実行
4. オフのまま入った場合はバンドルを有効化する

### 動作条件

- Web UI のある DeepSeek Harness（Desktop、または `web` プロファイル）
- `sessionPersistence` / `sessionQuery` / `webServer` サービスを含むバージョン。永続化サービスがない場合でも、セッション作成日だけを数えて動作します。

## 表示場所

**設定 → アクティビティ → 表示設定** で、好きな組み合わせを選べます。

- **サイドバーウィジェット** — サイドバー下部、Settings の上に横長の帯。クリックすると全画面ヒートマップが開きます。表示週数は 7〜52週
- **サイドバーパネル** — Workspaces の上、ナビゲーション一覧に **Activity** 行。クリックするとメインエリアに全画面ヒートマップが開きます
- **入力欄の帯** — 入力欄の下のコンパクトな帯。既定はオフ
- **設定 → アクティビティ** — すべての設定がある完全なページ

Workspaces の見出しは同梱のセッションブラウザが所有しており、その直上に追加できるフル幅スロットは DSH にありません。そのスロットを置き換えるとセッション一覧が消えるため、フル幅の帯は追加可能なサイドバー下部（Settings の上）に置き、Workspaces の上にはパネル行を追加しています。[サイドバーの拡大](docs/demo-sidebar.png) · [全画面](docs/demo-main.png)。

ページ名は UI の言語に追従します（`Activity` / `アクティビティ` / `活动`）。

## 集計の内容

ブラウザのタイムゾーン（IANA）におけるローカル日ごとに1マスです。

| 指標 | 元データ |
| --- | --- |
| メッセージ | `user/message` と `assistant/message` イベント |
| ツール呼び出し | `tool/call` イベント |
| ターン | `turn/start` イベント |
| トークン | assistant メッセージの input + output |
| アクティブ時間 | 何らかのイベントがあった分の数（重複なし） |
| セッション | その日に作成されたセッション（header の `createdAt`） |

セッションログはリビジョンごとに1回だけ読み、Host のメモリにキャッシュします。変化のないセッションは再読み込みしません。フォークやシードされたセッションは履歴を引き継ぐため、過去の日が二重に数えられることがあります。利用量の目安であり、課金の正確な値ではありません。

## 設定

設定はブラウザごと（`localStorage`、キー `dsh-activity-heatmap/settings/v1`）に保存され、すぐ反映されます。

| 設定 | 値 | 既定 |
| --- | --- | --- |
| 指標 | メッセージ / アクティブ時間 / ツール呼び出し / ターン / セッション / トークン | メッセージ |
| カレンダー | 1年（53週）/ 月別（12ヶ月）/ 直近（13・26・52週） | 1年 |
| マスの形 | 四角 / 角丸 / 丸 / 六角形 / ひし形 / 星 / カスタム SVG パス | 四角 |
| マスの大きさ | 5〜20 px | 8 px |
| 間隔 | 1〜8 px | 2 px |
| パレット | GitHub / オーシャン / バイオレット / サンセット / モノ / カスタム | GitHub |
| 色 | 濃さ4段階 + 空の日はテーマ色 | GitHub の緑 |
| 週の始まり | 日曜 / 月曜 | 月曜 |
| 濃さ | 線形 / 対数 / 順位（分位） | 線形 |
| ラベル | 月ラベル / 曜日ラベル / 凡例 | オン |
| サイドバーウィジェット | 表示・非表示、7〜52週 | オン、22週 |
| 入力欄の帯 | 表示・非表示 | オフ |

カスタム形状は `0 0 100 100` の viewBox 用 SVG パスで指定します（例: `M50 4 L96 92 L4 92 Z`）。不正なパスは無視され、四角で描画されます。

## プライバシー

- Host 側はループバックの完全一致ルート `/plugin-api/activity-heatmap/stats` を1つだけ登録し、日付・セッション数・ターン数・メッセージ数・ツール呼び出し数・トークン数・イベント数・アクティブ分だけを返します
- プロンプト、応答、ファイルパス、タイトル、ツール引数は返しません
- 外部への通信はありません
- 集計は読み取り専用の `sessionPersistence` / `sessionQuery` サービスを通してローカルのセッションログから行います

## 削除

**Plugins** → バンドルのページ → **Remove** で削除できます。ブラウザの設定はサイトデータを消すまで残ります。

## 開発

ビルド不要です。Host は ESM、Client はプレーン JavaScript のモジュールとして同梱しています。

```
index.js            Host: セッション走査、日別集計、stats ルート
client.js           Client: 設定ストア、ヒートマップ、サイドバー、パネル、設定ページ
cordis.patch.yml    バンドルの行
locale/{en,ja,zh}.json   Plugin Manager のタイトルと説明
icon.svg            アイコン
video/              モーショングラフィックのソース、オリジナル楽曲、レンダースクリプト
docs/               架空デモのHTMLとスクリーンショット
```

チェックアウトを導入する:

```text
plugin_manager { action: "install_bundle", target: "/absolute/path/to/dsh-activity-heatmap" }
```

`client.js` を編集したらページを再読み込みしてください。`index.js` を編集したら行をオフ→オン（または再起動）して Host モジュールを読み直します。

## 作者

<img src="docs/author.jpg" width="56" height="56" alt="高本">

**高本** · [@4uthen7](https://github.com/4uthen7) · [SphinxGG.com](https://sphinxgg.com)

高本が設計・開発しました。MIT ライセンス。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
