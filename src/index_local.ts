import fs from "fs";

import { cdate } from "cdate";
import { ILogObj, Logger } from "tslog";

import { detectKintoneDomDiffs } from "./diff_doms";
import { scrapeHTMLFiles } from "./html_file_uploader";
import { chomskeiEnv } from "./utils/environment_variables";
import * as utilsLogging from "./utils/logging_config";
import { isMainSourceCode } from "./utils/only_one_main";
import * as utilsPerformance from "./utils/performance";

async function main(): Promise<number> {
  const logger = utilsLogging.generateLogger(
    "chomskei",
    fs.existsSync("var/log") ? "chomskei" : undefined,
    chomskeiEnv.LOGGING_LEVEL as utilsLogging.LoggingLevel
  );

  logger.info("chomskei is started.");
  const start = performance.now();
  const htmlContents = await scrapeHTMLFiles(logger);

  const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
  const todayDateString = cdateJST().format("YYYYMMDD");
  const outDirectoryPath = `out/html/${todayDateString}`;
  if (!fs.existsSync(outDirectoryPath)) {
    fs.mkdirSync(outDirectoryPath, { recursive: true });
  }
  htmlContents.forEach((htmlContent, awsObjectKey, _) => {
    const filepath = `out/${awsObjectKey}`;
    fs.writeFileSync(filepath, htmlContent);
  });
  const canDetect = await detectKintoneDomDiffs(fs, logger);
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  logger.info(`End of chomskei (${duration} [sec.])`);
  return htmlContents && canDetect ? 0 : 1;
}

if (isMainSourceCode(process.argv, "src/index_local.ts")) {
  main()
    .then((exitCode) => (process.exitCode = exitCode))
    .catch((error) => {
      const logger: Logger<ILogObj> = utilsLogging.generateLogger(
        "FatalErrorCatcher",
        "fatal-error"
      );

      if (error instanceof Error) {
        logger.fatal(error.message);
        logger.fatal(error.stack);
      } else {
        logger.fatal(error);
      }
      process.exitCode = 1;
    });
}
