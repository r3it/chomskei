import { ILogObj, Logger } from "tslog";

import { AWSObjectKey } from "./aws/aws_utils";
import { S3BucketController } from "./aws/s3_bucket_controller";
import { KintoneBrowser } from "./kintone_browser";
import { chomskeiEnv } from "./utils/environment_variables";
import { KintoneFilePathError } from "./utils/errors";
import { scrapeHTMLContentsPerKintoneEnv } from "./utils/kintone_file_paths";
import * as utilsLogging from "./utils/logging_config";
import * as utilsPerformance from "./utils/performance";

async function scrapeHTMLContents(
  htmlContents: Map<AWSObjectKey, string>,
  kintoneBrowser: KintoneBrowser,
  currentKintone: string,
  previewKintone: string,
  logger: Console | Logger<ILogObj>
): Promise<Map<AWSObjectKey, string>> {
  logger.info(`Scraping HTML files from "${currentKintone}"`);
  /* 現行環境からHTMLをスクレイピング */
  await scrapeHTMLContentsPerKintoneEnv(
    htmlContents,
    kintoneBrowser,
    currentKintone,
    logger
  );
  logger.info(`DONE: Scraping HTML files from "${currentKintone}"`);

  logger.info(`Scraping HTML files from "${previewKintone}"`);
  /* 先行環境からHTMLをスクレイピング */
  await scrapeHTMLContentsPerKintoneEnv(
    htmlContents,
    kintoneBrowser,
    previewKintone,
    logger
  );
  logger.info(`DONE: Scraping HTML files from "${previewKintone}"`);
  return htmlContents;
}

export async function scrapeHTMLFiles(
  logger: Console | Logger<ILogObj>
): Promise<Map<AWSObjectKey, string>> {
  const htmlContents: Map<AWSObjectKey, string> = new Map<
    AWSObjectKey,
    string
  >();
  let thrownError: Error | undefined = undefined;
  const start = performance.now();
  logger.info("Start scraping HTML files from kintone.");
  const kintoneBrowser = await KintoneBrowser.getInstance(logger);
  try {
    /* 現行環境へのログイン */
    await kintoneBrowser.loginToKintone(
      chomskeiEnv.CURRENT_KINTONE_SUBDOMAIN_NAME,
      chomskeiEnv.CURRENT_KINTONE_LOGIN_NAME,
      chomskeiEnv.CURRENT_KINTONE_PASSWD,
      chomskeiEnv.CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME,
      chomskeiEnv.CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD
    );

    /* 先行環境へのログイン */
    await kintoneBrowser.loginToKintone(
      chomskeiEnv.PREVIEW_KINTONE_SUBDOMAIN_NAME,
      chomskeiEnv.PREVIEW_KINTONE_LOGIN_NAME,
      chomskeiEnv.PREVIEW_KINTONE_PASSWD,
      chomskeiEnv.PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME,
      chomskeiEnv.PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD
    );
    try {
      await scrapeHTMLContents(
        htmlContents,
        kintoneBrowser,
        chomskeiEnv.CURRENT_KINTONE_SUBDOMAIN_NAME,
        chomskeiEnv.PREVIEW_KINTONE_SUBDOMAIN_NAME,
        logger
      );
    } catch (e) {
      if (e instanceof KintoneFilePathError) {
        logger.error(e.stack);
      } else if (e instanceof TypeError) {
        logger.error(e.stack);
      } else if (e instanceof Error) {
        logger.error(e.stack);
        thrownError = e;
      } else {
        throw e;
      }
    } finally {
      try {
        /* 現行環境からのログアウト */
        await kintoneBrowser.logoutFromKintone(
          chomskeiEnv.CURRENT_KINTONE_SUBDOMAIN_NAME
        );
      } catch (e) {
        if (e instanceof Error) {
          logger.error(e.stack);
          thrownError = e;
        } else {
          logger.error(e);
        }
      }
      try {
        /* 先行環境からのログアウト */
        await kintoneBrowser.logoutFromKintone(
          chomskeiEnv.PREVIEW_KINTONE_SUBDOMAIN_NAME
        );
      } catch (e) {
        if (e instanceof Error) {
          logger.error(e.stack);
          thrownError = e;
        } else {
          logger.error(e);
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e);
      thrownError = e;
    } else {
      logger.error(e);
    }
  } finally {
    try {
      await kintoneBrowser.close();
    } catch (e) {
      if (e instanceof Error) {
        thrownError = e;
      } else {
        logger.error(e);
      }
    }
    if (thrownError !== undefined) {
      throw thrownError;
    }
  }
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(`End scraping HTML files (${duration} [sec.])`);
  return htmlContents;
}

async function uploadToS3Bucket(
  chomskeiBucket: S3BucketController,
  htmlContents: ReadonlyMap<AWSObjectKey, string>,
  logger: Console | Logger<ILogObj>
) {
  logger.info("Start uploading HTML files to AWS S3.");
  const start = performance.now();
  let uploadingObjectCnt = 1;
  for (const [awsObjectKey, htmlContent] of htmlContents) {
    logger.info(
      `Uploading "${awsObjectKey}" (${uploadingObjectCnt}/${htmlContents.size})`
    );
    await chomskeiBucket.upload(awsObjectKey, htmlContent);
    uploadingObjectCnt++;
  }
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(`End uploading HTML files to AWS S3. (${duration} [sec.])`);
  return true;
}

export async function uploadKintoneHTMLsToS3Bucket(
  chomskeiBucket?: S3BucketController,
  logger?: Console | Logger<ILogObj>
): Promise<boolean> {
  if (logger === undefined) {
    logger = utilsLogging.generateLogger(
      "HTMLFileUploader",
      "scrape-kintone-html",
      chomskeiEnv.LOGGING_LEVEL as utilsLogging.LoggingLevel
    );
  }

  const start = performance.now();
  logger.info(
    "Start scraping HTML files from kintone & uploading them to AWS S3."
  );

  const htmlContents = await scrapeHTMLFiles(logger);

  if (chomskeiBucket === undefined) {
    chomskeiBucket = new S3BucketController(
      chomskeiEnv.AWS_S3_BUCKET_NAME,
      chomskeiEnv.AWS_REGION,
      logger
    );
  }
  const canUpload = await uploadToS3Bucket(
    chomskeiBucket,
    htmlContents,
    logger
  );

  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(
    `End scraping HTML files from kintone & uploading them to AWS S3. (${duration} [sec.])`
  );
  return canUpload;
}
