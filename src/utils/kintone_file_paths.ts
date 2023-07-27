import { cdate } from "cdate";
import { TimeoutError } from "puppeteer-core";
import { ILogObj, Logger } from "tslog";

import { chomskeiEnv } from "./environment_variables";
import * as utilsPerformance from "./performance";
import { AWSObjectKey } from "../aws/aws_utils";
import { KintoneBrowser } from "../kintone_browser";

export const KINTONE_SCREEN_NAMES = [
  "spaceScreen", // スペース
  "multiThreadSpaceScreen", // 複数のスレッドが許可されたスペースのポータル
  "multiThreadSpaceThreadScreen", // 複数スレッドが許可されたスペースのスレッド
  "viewRecordsTableFormScreen", // 表形式レコード一覧画面
  "viewRecordsCalenderFormScreen", // カレンダー形式レコード一覧画面
  "showRecordScreen", // レコード詳細画面
  "addRecordScreen", // レコード追加画面
  "editRecordScreen", // レコード編集画面
  "reuseRecordScreen", // レコード再利用画面
  "printRecordScreen", // レコード印刷画面
  "reportRecordsScreen", // グラフ
  "viewRecordTableFormWithLookupScreen", // ルックアップ付きレコードの一覧画面（表形式）
  "viewRecordsWithCategoryScreen", // カテゴリー付きのレコード一覧画面
  "viewRecordsIfAppOwnAssigneeScreen", // （作業者が自分）であるレコードの一覧画面
  "showUntreatedRecordWithLookupScreen", // レコード詳細画面（未処理）
  "showTBDRecordWithLookupScreen", // レコード詳細画面（処理中）
  "showDoneRecordWithLookupScreen", // レコード詳細画面（完了）
  "addRecordWithLookupScreen", // レコード追加画面（ルックアップ・関連レコード一覧あり）
  "editRecordWithLookupScreen", // レコード編集画面（ルックアップ・関連レコード一覧あり）
  "reuseRecordWithLookupScreen", // レコード再利用画面（ルックアップ・関連レコード一覧あり）
  "printRecordWithLookupScreen", // レコード印刷画面（ルックアップ・関連レコード一覧あり）
  "addRecordScreenAppAction", // アプリアクションによるレコードの作成
] as const;

export type KintoneScreenNameType = (typeof KINTONE_SCREEN_NAMES)[number];

interface KintoneScreenFilePathFormat {
  readonly screenName: KintoneScreenNameType;
  readonly filePathTemplate: string;
  readonly kintoneIDs: readonly (number | string)[];
}

interface ChomskeiConfig {
  readonly kintoneScreenFilePathFormats: readonly KintoneScreenFilePathFormat[];
}

function isPreviewKintone(kintoneSubdomain: string): boolean {
  return kintoneSubdomain === chomskeiEnv.PREVIEW_KINTONE_SUBDOMAIN_NAME;
}

function concreteChomskeiConfig(kintoneSubdomain: string): ChomskeiConfig {
  /* スペース */
  const spaceID = isPreviewKintone(kintoneSubdomain)
    ? chomskeiEnv.PREVIEW_KINTONE_SPACE_ID
    : chomskeiEnv.CURRENT_KINTONE_SPACE_ID;
  /* 複数のスレッドを許容したスペース */
  const multiThreadSpaceID = isPreviewKintone(kintoneSubdomain)
    ? chomskeiEnv.PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID
    : chomskeiEnv.CURRENT_KINTONE_MULTI_THREAD_SPACE_ID;
  const multiThreadSpaceThreadID = isPreviewKintone(kintoneSubdomain)
    ? chomskeiEnv.PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID
    : chomskeiEnv.CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID;
  /* 1個のアプリだけで設定可能なフィールドを持つkintoneアプリ */
  const mainAppID = isPreviewKintone(kintoneSubdomain)
    ? chomskeiEnv.PREVIEW_KINTONE_MAIN_APP_ID
    : chomskeiEnv.CURRENT_KINTONE_MAIN_APP_ID;
  /* 2個以上のkintoneアプリが必要なフィールドを持つ、かつプロセス管理・カテゴリー・アプリアクションが有効なkintoneアプリ */
  const subAppID = isPreviewKintone(kintoneSubdomain)
    ? chomskeiEnv.PREVIEW_KINTONE_SUB_APP_ID
    : chomskeiEnv.CURRENT_KINTONE_SUB_APP_ID;
  return {
    kintoneScreenFilePathFormats: [
      {
        screenName: "spaceScreen",
        filePathTemplate: "/k/#/space/{0}",
        kintoneIDs: [spaceID] as const,
      },
      {
        screenName: "multiThreadSpaceScreen",
        filePathTemplate: "/k/#/space/{0}",
        kintoneIDs: [multiThreadSpaceID] as const,
      },
      {
        screenName: "multiThreadSpaceThreadScreen",
        filePathTemplate: "/k/#/space/{0}/thread/{1}",
        kintoneIDs: [multiThreadSpaceID, multiThreadSpaceThreadID] as const,
      },
      {
        screenName: "viewRecordsTableFormScreen",
        filePathTemplate: "/k/{0}/?view={1}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_TABLE_FORM_ID,
        ] as const,
      },
      {
        screenName: "viewRecordsCalenderFormScreen",
        filePathTemplate: "/k/{0}/?view={1}#date={2}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_CALENDER_FORM_ID,
          chomskeiEnv.KINTONE_MAIN_APP_CALENDER_FORM_DATE,
        ] as const,
      },
      {
        screenName: "showRecordScreen",
        filePathTemplate: "/k/{0}/show#record={1}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_RECORD_ID,
        ] as const,
      },
      {
        screenName: "addRecordScreen",
        filePathTemplate: "/k/{0}/edit",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_RECORD_ID,
        ] as const,
      },
      {
        screenName: "editRecordScreen",
        filePathTemplate: "/k/{0}/show#record={1}&mode=edit",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_RECORD_ID,
        ] as const,
      },
      {
        screenName: "reuseRecordScreen",
        filePathTemplate: "/k/{0}/edit?record={1}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_RECORD_ID,
        ] as const,
      },
      {
        screenName: "printRecordScreen",
        filePathTemplate: "/k/{0}/print?record={1}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_RECORD_ID,
        ] as const,
      },
      {
        screenName: "reportRecordsScreen",
        filePathTemplate: "/k/{0}/report?report={1}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_MAIN_APP_REPORT_ID,
        ] as const,
      },
      {
        screenName: "viewRecordTableFormWithLookupScreen",
        filePathTemplate: "/k/{0}/?view={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_DEFAULT_VIEW,
        ] as const,
      },
      {
        screenName: "viewRecordsWithCategoryScreen",
        filePathTemplate: "/k/{0}/?view={1}#category={2}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_DEFAULT_VIEW,
          chomskeiEnv.KINTONE_SUB_APP_CATEGORY_ID,
        ] as const,
      },
      {
        screenName: "viewRecordsIfAppOwnAssigneeScreen",
        filePathTemplate: "/k/{0}/?view={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW,
        ] as const,
      },
      {
        screenName: "showUntreatedRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/show#record={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID,
        ] as const,
      },
      {
        screenName: "showTBDRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/show#record={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID,
        ] as const,
      },
      {
        screenName: "showDoneRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/show#record={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID,
        ] as const,
      },
      {
        screenName: "addRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/edit",
        kintoneIDs: [subAppID] as const,
      },
      {
        screenName: "editRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/show#record={1}&mode=edit",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID,
        ] as const,
      },
      {
        screenName: "reuseRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/edit?record={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID,
        ] as const,
      },
      {
        screenName: "printRecordWithLookupScreen",
        filePathTemplate: "/k/{0}/print?record={1}",
        kintoneIDs: [
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID,
        ] as const,
      },
      {
        screenName: "addRecordScreenAppAction",
        filePathTemplate: "/k/{0}/edit?action={1}&app={2}&record={3}",
        kintoneIDs: [
          mainAppID,
          chomskeiEnv.KINTONE_APP_ACTION_ID,
          subAppID,
          chomskeiEnv.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID,
        ] as const,
      },
    ],
  };
}

function format(formatString: string, ...args: unknown[]): string {
  return args.reduce((tmp: string, arg: unknown, idx: number) => {
    const regExp = new RegExp(`\\{${idx}\\}`, "g");
    return tmp.replace(regExp, arg as string);
  }, formatString);
}

async function scrapeHTMLContent(
  kintoneBrowser: KintoneBrowser,
  filePathFormat: string,
  kintoneSubdomain: string,
  logger: Console | Logger<ILogObj>,
  ...kintoneIDs: (number | string)[]
): Promise<string> {
  const kintoneFilePath = format(filePathFormat, ...kintoneIDs);
  const start = performance.now();
  logger.info(`Scraping HTML files from "${kintoneFilePath}"`);
  const htmlContent = await kintoneBrowser.scrapeKintoneScreenHTML(
    kintoneSubdomain,
    kintoneFilePath
  );
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(
    `DONE: HTML files from "${kintoneFilePath}". (${duration} [sec.])`
  );
  return htmlContent;
}

async function scrapeHTMLContentPerKintoneScreen(
  htmlContents: Map<AWSObjectKey, string>,
  kintoneBrowser: KintoneBrowser,
  kintoneScreenID: KintoneScreenNameType,
  filePathFormat: string,
  kintoneSubdomain: string,
  logger: Console | Logger<ILogObj>,
  ...kintoneIDs: (number | string)[]
): Promise<Map<AWSObjectKey, string>> {
  const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
  const todayDateString = cdateJST().format("YYYYMMDD");
  /* html/YYYYMMdd/${screenName}-${whichKintone}.html
   * Why?: 名前でソートした時に、比較したいHTMLファイルが隣同士になるように並ぶため。
   */
  const awsObjectKeyFormat = `html/${todayDateString}/{0}-{1}.html`;
  const kintoneEnvName = isPreviewKintone(kintoneSubdomain)
    ? "preview"
    : "current";
  try {
    const htmlContent = await scrapeHTMLContent(
      kintoneBrowser,
      filePathFormat,
      kintoneSubdomain,
      logger,
      ...kintoneIDs
    );
    htmlContents.set(
      format(awsObjectKeyFormat, kintoneScreenID, kintoneEnvName),
      htmlContent
    );
  } catch (e) {
    if (e instanceof TimeoutError) {
      const kintoneFilePath = format(filePathFormat, ...kintoneIDs);
      logger.error(
        `Cannot scrape "https://${kintoneSubdomain}.cybozu.com${kintoneFilePath}" because of timeout.`
      );
    } else {
      throw e;
    }
  }
  return htmlContents;
}

export async function scrapeHTMLContentsPerKintoneEnv(
  htmlContents: Map<AWSObjectKey, string>,
  kintoneBrowser: KintoneBrowser,
  kintoneSubdomain: string,
  logger: Console | Logger<ILogObj>
): Promise<Map<AWSObjectKey, string>> {
  const chomskeiConfig = concreteChomskeiConfig(kintoneSubdomain);

  for (const filePathFormats of chomskeiConfig.kintoneScreenFilePathFormats) {
    await scrapeHTMLContentPerKintoneScreen(
      htmlContents,
      kintoneBrowser,
      filePathFormats.screenName,
      filePathFormats.filePathTemplate,
      kintoneSubdomain,
      logger,
      ...filePathFormats.kintoneIDs
    );
  }

  return htmlContents;
}
