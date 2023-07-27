import * as tsDotenv from "ts-dotenv";

import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { AppID } from "@kintone/rest-api-client/lib/src/client/types";

interface RecordForParameter {
  [fieldCode: string]: {
    value: unknown;
  };
}

interface TableRow {
  value: RecordForParameter;
}

interface KintoneUser {
  code: string;
}

const POST_RECORD_MAX = 100;

const KINTONE_SUBDOMAIN_REGEXP = /^[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]$/;
const env = tsDotenv.load({
  CURRENT_KINTONE_SUBDOMAIN_NAME: KINTONE_SUBDOMAIN_REGEXP,
  CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME: {
    type: /[A-Za-z0-9\-_]{1,127}/,
    optional: true,
  },
  CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD: {
    type: /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{5,64}/,
    optional: true,
  },
  CURRENT_KINTONE_MAIN_APP_ID: Number,
  CURRENT_KINTONE_MAIN_APP_API_TOKEN: String,
  CURRENT_KINTONE_SUB_APP_ID: Number,
  CURRENT_KINTONE_SUB_APP_API_TOKEN: String,

  PREVIEW_KINTONE_SUBDOMAIN_NAME: KINTONE_SUBDOMAIN_REGEXP,
  PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME: {
    type: /[A-Za-z0-9\-_]{1,127}/,
    optional: true,
  },
  PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD: {
    type: /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{5,64}/,
    optional: true,
  },
  PREVIEW_KINTONE_MAIN_APP_ID: Number,
  PREVIEW_KINTONE_MAIN_APP_API_TOKEN: String,
  PREVIEW_KINTONE_SUB_APP_ID: Number,
  PREVIEW_KINTONE_SUB_APP_API_TOKEN: String,

  // レコードに登録する情報
  CURRENT_LOGIN_NAME1: String,
  CURRENT_LOGIN_NAME2: String,
  PREVIEW_LOGIN_NAME1: String,
  PREVIEW_LOGIN_NAME2: String,
  PHONE_NUMBER: String,
});

interface PostRecordsResponce {
  ids: string[];
  revisions: string[];
  records: {
    id: string;
    revision: string;
  }[];
}

interface PostRecordsStatusResponse {
  records: {
    id: string;
    revision: string;
  }[];
}

function generateBasicAuth(
  username?: string,
  password?: string
):
  | {
      username: string;
      password: string;
    }
  | undefined {
  return username !== undefined &&
    username.length > 0 &&
    password !== undefined &&
    password.length > 0
    ? {
        username: username,
        password: password,
      }
    : undefined;
}

function* range(begin: number, end: number) {
  for (let i = begin; i < end; i++) {
    yield i;
  }
}

function createTableFieldValue(
  phoneNumber: string,
  tableSize: number
): TableRow[] {
  return [...range(0, tableSize)].map((idx: number) => {
    return {
      value: {
        ドロップダウン_0: { value: `sample${(idx % 2) + 1}` },
        電話番号: { value: phoneNumber },
        メールアドレス: { value: `foo${idx}@example.com` },
      },
    };
  });
}

function postRecordsIntoMainApp(
  client: KintoneRestAPIClient,
  appId: AppID,
  users: KintoneUser[],
  phoneNumber: string
): Promise<PostRecordsResponce> {
  const records = [...range(0, POST_RECORD_MAX)].map((idx: number) => {
    return {
      数値: { value: idx.toString() },
      ユーザー選択: { value: [users[0]] },
      ユーザー選択_複数: { value: users },
      テーブル_0: {
        value: createTableFieldValue(phoneNumber, idx),
      },
    };
  });

  return client.record.addRecords({
    app: appId,
    records: records,
  });
}

function postRecordsIntoSubApp(
  client: KintoneRestAPIClient,
  appId: AppID
): Promise<PostRecordsResponce> {
  const records = [...range(0, POST_RECORD_MAX)].map((idx: number) => {
    return {
      ルックアップ: { value: idx.toString() },
    };
  });

  return client.record.addRecords({
    app: appId,
    records: records,
  });
}

async function putStatus(
  client: KintoneRestAPIClient,
  appId: AppID
): Promise<PostRecordsStatusResponse[]> {
  const putRecordsStatus = (
    action: string,
    conditionRecordsId: (_: number) => boolean
  ) => {
    const records = [...range(0, POST_RECORD_MAX)]
      .filter(conditionRecordsId)
      .map((idx: number) => {
        return {
          id: idx + 1,
          action: action,
        };
      });
    return client.record.updateRecordsStatus({
      app: appId,
      records: records,
    });
  };

  // 先に「処理開始に遷移」
  const STATUS_NUM = 5;
  await putRecordsStatus("処理開始", (idx: number) => idx % STATUS_NUM !== 0);
  return Promise.all([
    putRecordsStatus(
      "次のユーザーのうち1人",
      (idx: number) => idx % STATUS_NUM === 2
    ),
    putRecordsStatus(
      "次のユーザー全員",
      (idx: number) => idx % STATUS_NUM === 3
    ),
    putRecordsStatus("完了する", (idx: number) => idx % STATUS_NUM === 4),
  ]);
}

async function main(): Promise<number> {
  const currentClient = new KintoneRestAPIClient({
    baseUrl: `https://${env.CURRENT_KINTONE_SUBDOMAIN_NAME}.cybozu.com`,
    auth: {
      apiToken: [
        env.CURRENT_KINTONE_MAIN_APP_API_TOKEN,
        env.CURRENT_KINTONE_SUB_APP_API_TOKEN,
      ],
    },
    basicAuth: generateBasicAuth(
      env.CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME,
      env.CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD
    ),
  });
  const previewClient = new KintoneRestAPIClient({
    baseUrl: `https://${env.PREVIEW_KINTONE_SUBDOMAIN_NAME}.cybozu.com`,
    auth: {
      apiToken: [
        env.PREVIEW_KINTONE_MAIN_APP_API_TOKEN,
        env.PREVIEW_KINTONE_SUB_APP_API_TOKEN,
      ],
    },
    basicAuth: generateBasicAuth(
      env.PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME,
      env.PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD
    ),
  });
  const currentUsers = [
    { code: env.CURRENT_LOGIN_NAME1 },
    { code: env.CURRENT_LOGIN_NAME2 },
  ];
  const previewUsers = [
    { code: env.PREVIEW_LOGIN_NAME1 },
    { code: env.PREVIEW_LOGIN_NAME2 },
  ];

  // レコード追加 (main_app)
  const [responseMainAppFromCurrent, responseMainAppFromPreview] =
    await Promise.all([
      postRecordsIntoMainApp(
        currentClient,
        env.CURRENT_KINTONE_MAIN_APP_ID,
        currentUsers,
        env.PHONE_NUMBER
      ),
      postRecordsIntoMainApp(
        previewClient,
        env.PREVIEW_KINTONE_MAIN_APP_ID,
        previewUsers,
        env.PHONE_NUMBER
      ),
    ]);
  console.log(JSON.stringify(responseMainAppFromCurrent));
  console.log(JSON.stringify(responseMainAppFromPreview));

  // レコード追加（sub_app）
  const [responseSubAppFromCurrent, responseSubAppFromPreview] =
    await Promise.all([
      postRecordsIntoSubApp(currentClient, env.CURRENT_KINTONE_SUB_APP_ID),
      postRecordsIntoSubApp(previewClient, env.PREVIEW_KINTONE_SUB_APP_ID),
    ]);
  console.log(JSON.stringify(responseSubAppFromCurrent));
  console.log(JSON.stringify(responseSubAppFromPreview));

  // ステータス変更
  const [responseSubAppStatusFromCurrent, responseSubAppStatusFromPreview] =
    await Promise.all([
      putStatus(currentClient, env.CURRENT_KINTONE_SUB_APP_ID),
      putStatus(previewClient, env.PREVIEW_KINTONE_SUB_APP_ID),
    ]);
  console.log(JSON.stringify(responseSubAppStatusFromCurrent));
  console.log(JSON.stringify(responseSubAppStatusFromPreview));
  return 0;
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    if (error instanceof Error) {
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
