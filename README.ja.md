# dsh-activity-heatmap

DeepSeek Harness の利用量を GitHub 風のヒートマップで表示するプラグインです。

セッションログから、メッセージ数・ツール呼び出し・ターン・トークン・アクティブ時間・セッション数を日ごとに集計し、1日1マスで描きます。四角・角丸・丸・六角形・ひし形・星、そして自分で書いた SVG パスまで形を選べます。配色は5種類のプリセットとレベル別カラー。表示は1年・月別・直近の週から選べます。設定はすべてアプリ内で変更できます。

外部へのネットワーク通信はありません。セッションの中身が外に出ることもありません。Host 側が返すのは集計値だけです。

```
      1月       2月       3月       4月
月   ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪
水   ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪
金   ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪
                                     少 ▪▪▪▪ 多
```

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

- **Settings → アクティビティ** — ヒートマップ本体、サマリー、すべての設定
- **入力欄の下** — 直近の週を並べたコンパクトな帯。設定 → アクティビティ → 表示設定 でオフにできます

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
| 入力欄の帯 | 表示・非表示、7〜52週 | オン、18週 |

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
client.js           Client: 設定ストア、ヒートマップ、設定ページ、入力欄の帯
cordis.patch.yml    バンドルの行
locale/{en,ja,zh}.json   Plugin Manager のタイトルと説明
icon.svg            アイコン
```

チェックアウトを導入する:

```text
plugin_manager { action: "install_bundle", target: "/absolute/path/to/dsh-activity-heatmap" }
```

`client.js` を編集したらページを再読み込みしてください。`index.js` を編集したら行をオフ→オン（または再起動）して Host モジュールを読み直します。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
