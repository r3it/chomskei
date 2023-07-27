import {
  PublishCommand,
  PublishCommandOutput,
  SNSClient,
} from "@aws-sdk/client-sns";
import { cdate } from "cdate";

import { S3BucketController } from "./s3_bucket_controller";
import {
  KINTONE_SCREEN_NAMES,
  KintoneScreenNameType,
} from "../utils/kintone_file_paths";

const DIFF_TEXT_LEN_MAX = 200;
const WHOLE_DIFF_TEXTS_LEN_MAX = 1_000;

export async function sendMessageToAmazonSNS(
  topicARN: string,
  chomskeiBucket: S3BucketController,
  regionName?: string
): Promise<PublishCommandOutput> {
  const client = new SNSClient({ region: regionName });

  const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
  const todayDateString = cdateJST().format("YYYYMMDD");
  const prefix = `diff/${todayDateString}/`;
  const toAWSObjectKey = (screenName: KintoneScreenNameType): string =>
    `${prefix}${screenName}.diff`;

  const awsObjectKeys = await chomskeiBucket.getObjectKeys(prefix);

  if (awsObjectKeys.length < 1) {
    const command = new PublishCommand({
      Message: "There is no diff on kintone screens.",
      Subject: "chomskei notification: no diffs on kintone screens",
      TopicArn: topicARN,
    });
    return await client.send(command);
  }

  const screenNamesDetectedDiff = KINTONE_SCREEN_NAMES.filter((screenName) =>
    awsObjectKeys.includes(toAWSObjectKey(screenName))
  );

  let headerMessage = screenNamesDetectedDiff.reduce(
    (message: string, screenName, idx) => {
      const digitMax = screenNamesDetectedDiff.length.toString().length;
      const paddedIndex = (idx + 1).toString().padStart(digitMax, " ");
      return `${message}  ${paddedIndex}. ${screenName}\n`;
    },
    `Diff of DOM are detected in ${screenNamesDetectedDiff.length} kintone screens:\n`
  );

  headerMessage += "\nDetails:\n";

  let bodyMessage = "";
  for (const [idx, screenName] of screenNamesDetectedDiff.entries()) {
    const awsObjectKey = toAWSObjectKey(screenName);
    const diffText = (await chomskeiBucket.download(awsObjectKey)).replace(
      /^---[a-zA-Z0-9\-_/.: \t]+\n\+\+\+[a-zA-Z0-9\-_/.: \t]+\n/ /* diffファイル上におけるheaderの /(---|+++) ${filename}/ を除去 */,
      ""
    );
    if (diffText.length > DIFF_TEXT_LEN_MAX) {
      const slicedDiffText = diffText.slice(0, DIFF_TEXT_LEN_MAX);
      bodyMessage += `@ ${idx + 1}. ${screenName}\n${slicedDiffText} ...\n\n`;
    } else {
      bodyMessage += `@ ${idx + 1}. ${screenName}\n${diffText}\n\n`;
    }

    if (bodyMessage.length > WHOLE_DIFF_TEXTS_LEN_MAX) {
      const url = chomskeiBucket.getURL(prefix).toString();
      bodyMessage += `and more...\n\nPlease see ${url} if you would like more information on diffs of kintone screens.\n`;
      break;
    }
  }

  const command = new PublishCommand({
    Message: headerMessage + bodyMessage,
    Subject: `chomskei notification: some diffs on ${screenNamesDetectedDiff.length} kintone screens`,
    TopicArn: topicARN,
  });
  return await client.send(command);
}
