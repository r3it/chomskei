import fs from "fs";

import * as tsDotenv from "ts-dotenv";

const AWS_REGIONS = [
  "us-east-2" as const, // 米国東部 (オハイオ)
  "us-east-1" as const, // 米国東部 (バージニア北部)
  "us-west-1" as const, // 米国西部 (北カリフォルニア)
  "us-west-2" as const, // 米国西部 (オレゴン)
  "af-south-1" as const, // アフリカ (ケープタウン)
  "ap-east-1" as const, // アジアパシフィック (香港)
  "ap-south-2" as const, // アジアパシフィック (ハイデラバード)
  "ap-southeast-3" as const, // アジアパシフィック (ジャカルタ)
  "ap-southeast-4" as const, // アジアパシフィック (メルボルン)
  "ap-south-1" as const, // アジアパシフィック (ムンバイ)
  "ap-northeast-3" as const, // アジアパシフィック (大阪)
  "ap-northeast-2" as const, // アジアパシフィック (ソウル)
  "ap-southeast-1" as const, // アジアパシフィック (シンガポール)
  "ap-southeast-2" as const, // アジアパシフィック (シドニー)
  "ap-northeast-1" as const, // アジアパシフィック (東京)
  "ca-central-1" as const, // カナダ (中部)
  "eu-central-1" as const, // 欧州 (フランクフルト)
  "eu-west-1" as const, // 欧州 (アイルランド)
  "eu-west-2" as const, // 欧州 (ロンドン)
  "eu-south-1" as const, // ヨーロッパ (ミラノ)
  "eu-west-3" as const, // 欧州 (パリ)
  "eu-south-2" as const, // 欧州 (スペイン)
  "eu-north-1" as const, // 欧州 (ストックホルム)
  "eu-central-2" as const, // 欧州 (チューリッヒ)
  "me-south-1" as const, // 中東 (バーレーン)
  "me-central-1" as const, // 中東 (アラブ首長国連邦)
  "sa-east-1" as const, // 南米 (サンパウロ)
];

const KINTONE_SUBDOMAIN_REGEXP = /^[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]$/;
const KINTONE_PASSWD_REGEXP =
  /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{1,64}/;

const env = fs.existsSync(".env")
  ? tsDotenv.load({
      /* AWS Lambda上で定義される環境変数 */
      AMAZON_SNS_TOPIC_ARN: String,
      AWS_S3_BUCKET_NAME: String,
      AWS_REGION: AWS_REGIONS,

      LOGGING_LEVEL: Number,
      KINTONE_BROWSER_TIMEOUT: Number,

      // 現行環境
      CURRENT_KINTONE_SUBDOMAIN_NAME: KINTONE_SUBDOMAIN_REGEXP,
      CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME: {
        type: /[A-Za-z0-9\-_]{1,127}/,
        optional: true,
      },
      CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD: {
        type: /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{5,64}/,
        optional: true,
      },
      CURRENT_KINTONE_LOGIN_NAME: String,
      CURRENT_KINTONE_PASSWD: KINTONE_PASSWD_REGEXP,
      CURRENT_KINTONE_SPACE_ID: Number,
      CURRENT_KINTONE_MULTI_THREAD_SPACE_ID: Number,
      CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID: Number,
      CURRENT_KINTONE_MAIN_APP_ID: Number,
      CURRENT_KINTONE_SUB_APP_ID: Number,

      // 先行環境
      /* 現在着目しているkintoneが先行環境かどうかの判定に必要 */
      PREVIEW_KINTONE_SUBDOMAIN_NAME: KINTONE_SUBDOMAIN_REGEXP,
      PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME: {
        type: /[A-Za-z0-9\-_]{1,127}/,
        optional: true,
      },
      PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD: {
        type: /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{5,64}/,
        optional: true,
      },
      PREVIEW_KINTONE_LOGIN_NAME: String,
      PREVIEW_KINTONE_PASSWD: KINTONE_PASSWD_REGEXP,
      PREVIEW_KINTONE_SPACE_ID: Number,
      PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID: Number,
      PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID: Number,
      PREVIEW_KINTONE_MAIN_APP_ID: Number,
      PREVIEW_KINTONE_SUB_APP_ID: Number,

      // 両環境共通
      KINTONE_MAIN_APP_TABLE_FORM_ID: Number,
      KINTONE_MAIN_APP_CALENDER_FORM_ID: Number,
      KINTONE_MAIN_APP_CALENDER_FORM_DATE: /[1-9][0-9]{3}-(0[1-9]|1[12])/,
      KINTONE_MAIN_APP_RECORD_ID: Number,
      KINTONE_MAIN_APP_REPORT_ID: Number,

      KINTONE_SUB_APP_DEFAULT_VIEW: Number,
      // カテゴリー
      KINTONE_SUB_APP_CATEGORY_ID: Number,

      // （作業者が自分）なレコードの一覧
      KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW: Number,
      // プロセス管理のプロセス
      KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID: Number,
      KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID: Number,
      KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID: Number,
      // アプリアクションID
      KINTONE_APP_ACTION_ID: Number,
    })
  : process.env;

export const chomskeiEnv = {
  LOGGING_LEVEL: Number(env.LOGGING_LEVEL),
  KINTONE_BROWSER_TIMEOUT: Number(env.KINTONE_BROWSER_TIMEOUT),

  CURRENT_KINTONE_SUBDOMAIN_NAME: env.CURRENT_KINTONE_SUBDOMAIN_NAME ?? "",
  CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME:
    env.CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME ?? "",
  CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD:
    env.CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD ?? "",
  CURRENT_KINTONE_LOGIN_NAME: env.CURRENT_KINTONE_LOGIN_NAME ?? "",
  CURRENT_KINTONE_PASSWD: env.CURRENT_KINTONE_PASSWD ?? "",
  CURRENT_KINTONE_SPACE_ID: Number(env.CURRENT_KINTONE_SPACE_ID),
  CURRENT_KINTONE_MULTI_THREAD_SPACE_ID: Number(
    env.CURRENT_KINTONE_MULTI_THREAD_SPACE_ID
  ),
  CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID: Number(
    env.CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID
  ),
  CURRENT_KINTONE_MAIN_APP_ID: Number(env.CURRENT_KINTONE_MAIN_APP_ID),
  CURRENT_KINTONE_SUB_APP_ID: Number(env.CURRENT_KINTONE_SUB_APP_ID),

  PREVIEW_KINTONE_SUBDOMAIN_NAME: env.PREVIEW_KINTONE_SUBDOMAIN_NAME ?? "",
  PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME:
    env.PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME ?? "",
  PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD:
    env.PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD ?? "",
  PREVIEW_KINTONE_LOGIN_NAME: env.PREVIEW_KINTONE_LOGIN_NAME ?? "",
  PREVIEW_KINTONE_PASSWD: env.PREVIEW_KINTONE_PASSWD ?? "",
  PREVIEW_KINTONE_SPACE_ID: Number(env.PREVIEW_KINTONE_SPACE_ID),
  PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID: Number(
    env.PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID
  ),
  PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID: Number(
    env.PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID
  ),
  PREVIEW_KINTONE_MAIN_APP_ID: Number(env.PREVIEW_KINTONE_MAIN_APP_ID),
  PREVIEW_KINTONE_SUB_APP_ID: Number(env.PREVIEW_KINTONE_SUB_APP_ID),

  KINTONE_MAIN_APP_TABLE_FORM_ID: Number(env.KINTONE_MAIN_APP_TABLE_FORM_ID),
  KINTONE_MAIN_APP_CALENDER_FORM_ID: Number(
    env.KINTONE_MAIN_APP_CALENDER_FORM_ID
  ),
  KINTONE_MAIN_APP_CALENDER_FORM_DATE:
    env.KINTONE_MAIN_APP_CALENDER_FORM_DATE ?? "",
  KINTONE_MAIN_APP_RECORD_ID: Number(env.KINTONE_MAIN_APP_RECORD_ID),
  KINTONE_MAIN_APP_REPORT_ID: Number(env.KINTONE_MAIN_APP_REPORT_ID),

  KINTONE_SUB_APP_DEFAULT_VIEW: Number(env.KINTONE_SUB_APP_DEFAULT_VIEW),
  KINTONE_SUB_APP_CATEGORY_ID: Number(env.KINTONE_SUB_APP_CATEGORY_ID),

  KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW: Number(
    env.KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW
  ),
  KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID: Number(
    env.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID
  ),
  KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID: Number(
    env.KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID
  ),
  KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID: Number(
    env.KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID
  ),
  KINTONE_APP_ACTION_ID: Number(env.KINTONE_APP_ACTION_ID),

  AMAZON_SNS_TOPIC_ARN: env.AMAZON_SNS_TOPIC_ARN ?? "",
  AWS_S3_BUCKET_NAME: env.AWS_S3_BUCKET_NAME ?? "",
  AWS_REGION: env.AWS_REGION ?? "",
};
