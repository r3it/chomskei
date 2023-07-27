# chomskei

chomskei （ちょむすけ）とは、
kintone がブラウザ上で生成する DOM 構造を新旧 2 つの環境で比較することで、
変化を検出できるツールです。

DOM 構造および各エレメントのプロパティの変化を検出することができます。

chomskei が解析対象とする kintone 画面 22 種類を、以下の表に示します。

| kitone 画面名                                                    | ファイル名（`${screenName}`）         |
| :--------------------------------------------------------------- | :------------------------------------ |
| スペース                                                         | `spaceScreen`                         |
| 複数のスレッドが許可されたスペースのポータル                     | `multiThreadSpaceScreen`              |
| 複数スレッドが許可されたスペースのスレッド                       | `multiThreadSpaceThreadScreen`        |
| 表形式レコード一覧画面                                           | `viewRecordsTableFormScreen`          |
| カレンダー形式レコード一覧画面                                   | `viewRecordsCalenderFormScreen`       |
| レコード詳細画面                                                 | `showRecordScreen`                    |
| レコード追加画面                                                 | `addRecordScreen`                     |
| レコード編集画面                                                 | `editRecordScreen`                    |
| レコード再利用画面                                               | `reuseRecordScreen`                   |
| レコード印刷画面                                                 | `printRecordScreen`                   |
| グラフ                                                           | `reportRecordsScreen`                 |
| ルックアップ付きレコードの一覧画面（表形式）                     | `viewRecordTableFormWithLookupScreen` |
| カテゴリー付きのレコード一覧画面                                 | `viewRecordsWithCategoryScreen`       |
| （作業者が自分）であるレコードの一覧画面                         | `viewRecordsIfAppOwnAssigneeScreen`   |
| レコード詳細画面（ステータスが「未処理」）                       | `showUntreatedRecordWithLookupScreen` |
| レコード詳細画面（ステータスが「次のユーザーから作業者を選択」） | `showTBDRecordWithLookupScreen`       |
| レコード詳細画面（ステータスが「完了」）                         | `showDoneRecordWithLookupScreen`      |
| レコード追加画面（ルックアップ・関連レコード一覧あり）           | `addRecordWithLookupScreen`           |
| レコード編集画面（ルックアップ・関連レコード一覧あり）           | `editRecordWithLookupScreen`          |
| レコード再利用画面（ルックアップ・関連レコード一覧あり）         | `reuseRecordWithLookupScreen`         |
| レコード印刷画面（ルックアップ・関連レコード一覧あり）           | `printRecordWithLookupScreen`         |
| アプリアクションによるレコードの作成                             | `addRecordScreenAppAction`            |

## Requirement

### 使用言語

- bash 5.1.x 以降
- nodejs v18.16.x 以降。
- npm 9.x 以降。
- jq 1.6 以降。

### OS・プラットフォーム

- Linux, WSL1 (Ubuntu)
  - 以後、Linux や WSL1 上で実行される環境をローカル環境と呼ぶことにします。
- AWS Lambda

## Usage

### Preliminaries

#### kintone システム上での準備

##### Notes

- 解析対象となるスペース名や、解析対象のアプリ名は、現行環境と先行環境とで**同一**にしてください。
- 両環境で kintone ユーザーのログイン名・表示名を揃えてください。
- chomskei でログインする kintone ユーザーが、解析対象のスペースやアプリを作成してください。
  - kintone のシステム管理によって、アクセス権のうち「アプリの作成」・「スペースの作成」が付与されたユーザーを使用してください。

###### スペース

- 下記 2 種類のスペースを、現行環境と先行環境との両方で用意してください。
  1. 1 つのスレッドだけを有するスペース。
  2. 「スペースのポータルと複数のスレッドを許可」を選択したスペース。
- スペース名、スペースのカバー画像、参加メンバー数を現行環境および先行環境で統一してください。
- 参加メンバーおよび参加メンバーの登録順も統一してください。
- スペース本文の編集時刻・コメントの投稿時刻・投稿されたコメントの数も統一できると望ましいです。

###### アプリ

- [アプリテンプレート](../data/kintone_apps/sample_app_for_chomskei.zip) を用いてください。
  - `main_app（chomskei解析対象）`
    - 1 つのアプリで完結するフィールド全て。
      - 「文字列（1 行）」、「複数選択」、「添付ファイル」、「ユーザー選択」フィールド etc.
    - 表形式。
    - カレンダー形式。
    - グラフ。
  - `sub_app（chomskei解析対象）`
    - 「ルックアップ」、「関連レコード一覧」フィールド。
      - `main_app（chomskei解析対象）` のレコード・フィールドを参照します。
    - カテゴリー。
    - プロセス管理。
      - 「次のユーザーから作業者を選択」。
    - アプリアクション。
- 上記 `main_app（chomskei解析対象）` と `sub_app（chomskei解析対象）` （以後、解析対象アプリ）とを、[上記で作成したスペースのうち、少なくとも一方のスペース](#スペース)上のアプリとして作成してください。
- 「アプリの設定」において、両環境の解析対象アプリにおいて、それぞれ API トークンを生成してください。
  - 生成した API トークンに対して、以下のアクセス権を付与してください。
    - レコード閲覧
    - レコード追加
    - レコード編集
    - レコード削除
    - アプリ管理
  - chomskei が、解析対象アプリにレコードを登録する時に必須となります。
- それぞれの環境で chomskei でログインする kintone ユーザーにおいて、レコード一覧画面の表示件数を同じ値にしてください。
  - 例えば、現行環境上のユーザーを 20 件、先行環境上のユーザーを 20 件にそれぞれ設定する。
  - 参考：[一覧の表示件数を変更する](https://jp.cybozu.help/k/ja/user/app_settings/view/display_view.html)
- この時点では、解析対象アプリにレコードを登録しないでください。

#### `.env` の作成

- [`.env.tpl`](./.env.tpl) をコピーして、`.env.tpl`と同じディレクトリ直下に移動させてください。
  - コピーしたファイルの名前は `.env` に変更してください。

```bash
cp .env.tpl .env
```

- その後、`.env`にあらかじめ定義されている環境変数に対して、値を設定してください。
  - 各環境変数は以下に示した表に示しています。

| 環境変数名                                     |   必須   | デフォルト値 | 説明                                                                                                                     |
| :--------------------------------------------- | :------: | -----------: | :----------------------------------------------------------------------------------------------------------------------- |
| `LOGGING_LEVEL`                                |   必須   |            3 | ローカル環境上で実行する時のロギングレベル。<br>（0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal）。 |
| `KINTONE_BROWSER_TIMEOUT`                      |   必須   |           30 | kintone へアクセスするヘッドブラウザ上におけるタイムアウト。単位は秒。                                                   |
| `CURRENT_LOGIN_NAME1`                          |   必須   |              | 現行環境上に存在するユーザーのログイン名（1 人目）。                                                                     |
| `CURRENT_LOGIN_NAME2`                          |   必須   |              | 現行環境上に存在するユーザーのログイン名（2 人目）。                                                                     |
| `PREVIEW_LOGIN_NAME1`                          |   必須   |              | 先行環境上に存在するユーザーのログイン名（1 人目）。                                                                     |
| `PREVIEW_LOGIN_NAME2`                          |   必須   |              | 先行環境上に存在するユーザーのログイン名（2 人目）。                                                                     |
| `PHONE_NUMBER`                                 |   必須   |              | 「電話番号」フィールドにセットする電話番号。                                                                             |
| `CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME` | 条件必須 |              | 現行環境における Basic 認証のユーザー名。Basic 認証を設定しているならば必須。                                            |
| `CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD`   | 条件必須 |              | 現行環境における Basic 認証のパスワード。Basic 認証を設定しているならば必須。                                            |
| `CURRENT_KINTONE_SUBDOMAIN_NAME`               |   必須   |              | 現行環境のサブドメイン名。                                                                                               |
| `CURRENT_KINTONE_LOGIN_NAME`                   |   必須   |              | 現行環境下でログインするユーザーのログイン名。                                                                           |
| `CURRENT_KINTONE_PASSWD`                       |   必須   |              | 現行環境下でログインするユーザーのパスワード。                                                                           |
| `CURRENT_KINTONE_SPACE_ID`                     |   必須   |              | 現行環境上に存在するスペースの ID。                                                                                      |
| `CURRENT_KINTONE_MULTI_THREAD_SPACE_ID`        |   必須   |              | 現行環境上に存在する「スペースのポータルと複数のスレッド」を使用するスペースの ID。                                      |
| `CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID` |   必須   |              | 現行環境上に存在する「スペースのポータルと複数のスレッド」を使用するスペースのスレッド ID。                              |
| `CURRENT_KINTONE_MAIN_APP_ID`                  |   必須   |              | 現行環境上に配置された `main_app（chomskei解析対象）`のアプリ ID。                                                       |
| `CURRENT_KINTONE_SUB_APP_ID`                   |   必須   |              | 現行環境上に配置された `sub_app（chomskei解析対象）`のアプリ ID。                                                        |
| `PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME` | 条件必須 |              | 先行環境における Basic 認証のユーザー名。Basic 認証を設定しているならば必須。                                            |
| `PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD`   | 条件必須 |              | 先行環境における Basic 認証のパスワード。Basic 認証を設定しているならば必須。                                            |
| `PREVIEW_KINTONE_SUBDOMAIN_NAME`               |   必須   |              | 先行環境のサブドメイン名。                                                                                               |
| `PREVIEW_KINTONE_LOGIN_NAME`                   |   必須   |              | 先行環境下でログインするユーザーのログイン名。                                                                           |
| `PREVIEW_KINTONE_PASSWD`                       |   必須   |              | 先行環境下でログインするユーザーのパスワード。                                                                           |
| `PREVIEW_KINTONE_SPACE_ID`                     |   必須   |              | 先行環境上に存在するスペースの ID。                                                                                      |
| `PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID`        |   必須   |              | 先行環境上に存在する「スペースのポータルと複数のスレッド」を使用するスペースの ID。                                      |
| `PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID` |   必須   |              | 先行環境上に存在する「スペースのポータルと複数のスレッド」を使用するスペースのスレッド ID。                              |
| `PREVIEW_KINTONE_MAIN_APP_ID`                  |   必須   |              | 先行環境上に配置された `main_app（chomskei解析対象）`のアプリ ID。                                                       |
| `PREVIEW_KINTONE_SUB_APP_ID`                   |   必須   |              | 先行環境上に配置された `sub_app（chomskei解析対象）`のアプリ ID。                                                        |
| `KINTONE_MAIN_APP_TABLE_FORM_ID`               |   必須   |      5735151 | 表形式のレコード一覧画面の ID（`main_app（chomskei解析対象）`）。                                                        |
| `KINTONE_MAIN_APP_CALENDER_FORM_ID`            |   必須   |      5735153 | カレンダー形式のレコード一覧画面の ID（`main_app（chomskei解析対象）`）。                                                |
| `KINTONE_MAIN_APP_CALENDER_FORM_DATE`          |   必須   |      2023-04 | カレンダー形式のレコード一覧で表示するカレンダーの年月（`main_app（chomskei解析対象）`）。                               |
| `KINTONE_MAIN_APP_RECORD_ID`                   |   必須   |            3 | レコード詳細画面・編集画面・再利用画面用で表示するレコードの ID（`main_app（chomskei解析対象）`）。                      |
| `KINTONE_MAIN_APP_REPORT_ID`                   |   必須   |      5735155 | グラフ（`main_app（chomskei解析対象）`）。                                                                               |
| `KINTONE_SUB_APP_DEFAULT_VIEW`                 |   必須   |      5735190 | `sub_app（chomskei解析対象）`における表形式のレコード一覧画面の ID。                                                     |
| `KINTONE_SUB_APP_CATEGORY_ID`                  |   必須   |      5735190 | `sub_app（chomskei解析対象）`において、カテゴリーで絞り込んだ時のレコード一覧画面の ID。                                 |
| `KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW`            |   必須   |      5735189 | `sub_app（chomskei解析対象）`において、「（作業者が自分）」であるレコードの一覧画面の ID。                               |
| `KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID`  |   必須   |            1 | ステータスが「未処理」のレコード ID（`sub_app（chomskei解析対象）`）。                                                   |
| `KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID`        |   必須   |            2 | ステータスが「次のユーザーから作業者を選択」のレコード ID（`sub_app（chomskei解析対象）`）。                             |
| `KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID`       |   必須   |            5 | ステータスが「完了」のレコード ID（`sub_app（chomskei解析対象）`）。                                                     |
| `KINTONE_APP_ACTION_ID`                        |   必須   |      6381676 | アプリアクションの ID。                                                                                                  |
| `AWS_REGION`                                   |   必須   |              | AWS のリージョン名。AWS Lamnbda などといったコンポーネントのデプロイ先リージョン。                                       |
| `AMAZON_SNS_FATAL_TOPIC_ARN`                   |   必須   |              | chomskei が例外を発生させたときのメッセージを受け取る Amazon SNS のトピック ARN。                                        |
| `AMAZON_SNS_FATAL_TOPIC_NAME`                  |   必須   |              | chomskei が例外を発生させたときのメッセージを受け取る Amazon SNS のトピック名。                                          |
| `AMAZON_SNS_TOPIC_ARN`                         |   必須   |              | chomskei によって検出された差分情報を受け取る Amazon SNS のトピック ARN。                                                |
| `AMAZON_SNS_TOPIC_NAME`                        |   必須   |              | chomskei によって検出された差分情報を受け取る Amazon SNS のトピック名。                                                  |
| `AWS_LAMBDA_NAME`                              |   必須   |              | AWS Lambda 名。AWS 上で chomskei を実行させる時のメイン部。                                                              |
| `AWS_NODE_MODULES_LAMBDA_LAYER_NAME`           |   必須   |              | AWS Lambda レイヤ名。                                                                                                    |
| `AWS_S3_BUCKET_NAME`                           |   必須   |              | 実行結果を保存するための AWS S3 バケット名。                                                                             |
| `AWS_EVENT_BRIDGE_NAME`                        |   必須   |              | AWS EventBridge 名。                                                                                                     |

#### 解析対象 kintone アプリへのレコード登録

[kintone システム上での準備](#kintone-システム上での準備) と [`.env` の作成](#env-の作成)
の準備が終了したならば、以下のコマンドを **1 度だけ** 実行してください。
両環境の解析対象アプリ上に、レコードが登録されます。

```bash
npm run init-records
```

### Build

```bash
npm install
```

### Run（ローカル環境）

```bash
npm run chomskei-local
```

- kintone システムからスクレイピングされた HTML ファイルが、 `out/html/YYYYMMDD/${screenName}-(current|preview).html` として出力されます。
- 検出された Diff が、ローカル環境の差分情報ファイルに出力されます。
  - Diff が存在しない場合、差分情報ファイルは出力されません。
  - 以下に挙げる 2 種類のファイルが出力されます。
    - `out/diff/YYYYMMDD/${screenName}.diff`：差分情報を Linux の `diff --unified` コマンドの出力のように整形したファイル。
    - `out/diff/YYYYMMDD/${screenName}.diff.yaml`: `[diff-dom](https://www.npmjs.com/package/diff-dom)` パッケージの差分情報オブジェクトを YAML で表現したファイル。
- ログは、 `var/log/chomskei.YYYY.MM.DD.log`に出力されます。

### Deployment to AWS

#### Notes

- chomskei を AWS へとデプロイする前に、Amazon SNS のトピックを AWS Management Console または AWS CLI で作成してください。
  - chomskei 上では、Amazon SNS のトピックを自動的に作成しません。
  - Amazon SNS のトピック名は、環境変数の `AMAZON_SNS_TOPIC_NAME` 及び `AMAZON_SNS_FATAL_TOPIC_NAME` と同一である必要があります。

#### 実行コマンド

```bash
bash deploy.sh
```

## Author

Tomoaki Tsuru

## Contact

[R3 Institute](https://r3it.com)

## License

MIT
