import fs from "fs";

import { cdate } from "cdate";
import diffDOM, { DiffDOM } from "diff-dom";
import { ILogObj, Logger } from "tslog";
import YAML from "yaml";

import { S3BucketController } from "./aws/s3_bucket_controller";
import { KintoneValuesNormalizer } from "./dom_visitor";
import { IndentConfig, toTextDiff } from "./utils/diff_dom_for_chomskei";
import { chomskeiEnv } from "./utils/environment_variables";
import * as utilsKintoneFilePaths from "./utils/kintone_file_paths";
import * as utilsLogging from "./utils/logging_config";
import * as utilsPerformance from "./utils/performance";

function removeComments(htmlString: string): string {
  return htmlString
    .replace(/<!--.+-->/, "") /* コメントの削除 */
    .replace(/<!--\[if gt IE [0-9]+\]><!-->/, "")
    .replace(/<!--<!\[endif\]-->/, "") /* IE用条件付きコメントの削除 */;
}

async function detectDomDiffs(
  fileStream: typeof fs | S3BucketController,
  logger: Console | Logger<ILogObj>
): Promise<boolean> {
  let canDetectDomDiffs = true;
  const length = utilsKintoneFilePaths.KINTONE_SCREEN_NAMES.length;

  if (!(fileStream instanceof S3BucketController)) {
    /* diffを検出した日のディレクトリを作成 */
    const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
    const todayDateString = cdateJST().format("YYYYMMDD");
    const outDirectoryPath = `out/diff/${todayDateString}`;
    if (!fileStream.existsSync(outDirectoryPath)) {
      fileStream.mkdirSync(outDirectoryPath, { recursive: true });
    }
  }

  for (const [
    index,
    screenName,
  ] of utilsKintoneFilePaths.KINTONE_SCREEN_NAMES.entries()) {
    logger.info(
      `Detecting DOM diffs on ${screenName}... (${index + 1}/${length})`
    );
    const startDetectDomDiff = performance.now();

    const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
    const todayDateString = cdateJST().format("YYYYMMDD");
    const currentKintoneHTMLPath = `html/${todayDateString}/${screenName}-current.html`;
    const currentKintoneHTML = removeComments(
      fileStream instanceof S3BucketController
        ? await fileStream.download(currentKintoneHTMLPath) // AWS S3 バケットからダウンロード
        : fs.readFileSync(`out/${currentKintoneHTMLPath}`, {
            encoding: "utf-8",
          })
    );
    const previewKintoneHTMLPath = `html/${todayDateString}/${screenName}-preview.html`;
    const previewKintoneHTML = removeComments(
      fileStream instanceof S3BucketController
        ? await fileStream.download(previewKintoneHTMLPath) // AWS S3 バケットからダウンロード
        : fileStream.readFileSync(`out/${previewKintoneHTMLPath}`, {
            encoding: "utf-8",
          })
    );

    const currentDOM = diffDOM.stringToObj(currentKintoneHTML);
    const currentKintoneNormalizer: KintoneValuesNormalizer =
      new KintoneValuesNormalizer(currentDOM, false, true);
    currentKintoneNormalizer.normalizeValues();

    const previewDOM = diffDOM.stringToObj(previewKintoneHTML);
    const previewKintoneNormalizer: KintoneValuesNormalizer =
      new KintoneValuesNormalizer(previewDOM, true, true);
    previewKintoneNormalizer.normalizeValues();

    const dd = new DiffDOM();
    const diffs = dd.diff(currentDOM, previewDOM);
    const end = performance.now();
    const duration = utilsPerformance.toSecond(end - startDetectDomDiff);
    logger.info(`DONE (${duration} [sec.])`);

    /* 可視化したdiff情報 */
    const diffAsText = `--- current: ${currentKintoneHTMLPath}\n+++ preview: ${previewKintoneHTMLPath}\n${toTextDiff(
      diffs,
      new IndentConfig(0, 2)
    )}`;
    if (diffs.length > 0) {
      /* diff情報が存在するならば、 */
      if (fileStream instanceof S3BucketController) {
        canDetectDomDiffs &&= await fileStream.upload(
          `diff/${todayDateString}/${screenName}.diff.yaml`,
          YAML.stringify(diffs)
        );
        canDetectDomDiffs &&= await fileStream.upload(
          `diff/${todayDateString}/${screenName}.diff`,
          diffAsText
        );
      } else {
        fileStream.writeFileSync(
          `out/diff/${todayDateString}/${screenName}.diff.yaml`,
          YAML.stringify(diffs)
        );
        fileStream.writeFileSync(
          `out/diff/${todayDateString}/${screenName}.diff`,
          diffAsText
        );
        canDetectDomDiffs &&= true;
      }
    } else {
      /* 差分が存在しないならば、差分情報をファイルとして保存しない */
    }
  }
  return canDetectDomDiffs;
}

export async function detectKintoneDomDiffs(
  fileStream: typeof fs | S3BucketController,
  logger?: Console | Logger<ILogObj>
): Promise<boolean> {
  if (logger === undefined) {
    logger = utilsLogging.generateLogger(
      "DetectKintoneDomDiff",
      "kintone-dom-diff",
      chomskeiEnv.LOGGING_LEVEL as utilsLogging.LoggingLevel
    );
  }

  logger.info("Start detecting DOM diffs.");
  const start = performance.now();
  const canDetectDomDiffs = await detectDomDiffs(fileStream, logger);
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(`End detecting dom diffs. (${duration} [sec.])`);
  return canDetectDomDiffs;
}
