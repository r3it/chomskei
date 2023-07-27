import { performance } from "perf_hooks";

import { S3BucketController } from "./aws/s3_bucket_controller";
import { sendMessageToAmazonSNS } from "./aws/sns";
import { detectKintoneDomDiffs } from "./diff_doms";
import { uploadKintoneHTMLsToS3Bucket } from "./html_file_uploader";
import { chomskeiEnv } from "./utils/environment_variables";
import * as utilsPerformance from "./utils/performance";

async function main(): Promise<number> {
  const chomskeiBucket = new S3BucketController(
    chomskeiEnv.AWS_S3_BUCKET_NAME,
    chomskeiEnv.AWS_REGION,
    console
  );

  console.info("chomskei is started.");
  const start = performance.now();
  const canUpload = await uploadKintoneHTMLsToS3Bucket(chomskeiBucket, console);
  const canDetect = await detectKintoneDomDiffs(chomskeiBucket, console);

  console.info(
    "Send messages where kintone screen diffs of DOM are detected to Amazon SNS."
  );
  const snsPublicCommandOutput = await sendMessageToAmazonSNS(
    chomskeiEnv.AMAZON_SNS_TOPIC_ARN,
    chomskeiBucket,
    chomskeiEnv.AWS_REGION
  );
  console.info(
    "DONE: Send messages where kintone screen diffs of DOM are detected to Amazon SNS."
  );
  const end = performance.now();
  const duration = utilsPerformance.toSecond(end - start);
  console.info(`End of chomskei (${duration} [sec.])`);
  return canUpload && canDetect && snsPublicCommandOutput ? 0 : 1;
}

const handler = main;
module.exports = { handler };
