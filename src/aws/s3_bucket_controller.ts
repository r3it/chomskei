import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { Logger, ILogObj } from "tslog";

import * as utilsLogging from "../utils/logging_config";
import * as utilsPerformance from "../utils/performance";

/**
 * AWS S3バケットを管理するクラス。
 */
export class S3BucketController {
  private readonly bucketName: string;
  private readonly region: string;

  private readonly s3Client: S3Client;
  private readonly logger: Console | Logger<ILogObj>;

  /**
   *
   * @param bucketName AWS S3のバケット名。
   * @param region リージョン名。
   * @param logger ロギング用のロガー。
   */
  constructor(
    bucketName: string,
    region: string,
    logger?: Console | Logger<ILogObj>
  ) {
    this.bucketName = bucketName;
    this.region = region;
    if (logger === undefined) {
      this.logger = new Logger({
        name: "S3BucketController",
        minLevel: utilsLogging.INFO_LEVEL,
      });
    } else {
      this.logger = logger;
    }

    this.logger.debug(
      "Login to AWS using AWS Access Key ID & Secret Access Key"
    );

    this.s3Client = new S3Client({ region: this.region });
    this.logger.debug("Accept to login to AWS.");
  }

  /**
   * S3バケットまたはAWSオブジェクトのURLを指定する。
   * @param prefixParamQuery 検索対象となるAWSオブジェクトの `prefix`。
   * @returns S3バケットまたはAAWSオブジェクトのURL。
   */
  public getURL(prefixParamQuery?: string): URL {
    const url = new URL("https://s3.console.aws.amazon.com");
    url.pathname = `/s3/buckets/${this.bucketName}`;
    url.search =
      `?region=${this.region}` +
      (prefixParamQuery !== undefined ? `&prefix=${prefixParamQuery}` : "");
    return url;
  }

  /**
   * HTML Contentを、S3バケット上のAWSオブジェクト `awsObjectKey` としてアップロードする。
   * @param awsObjectKey AWSオブジェクト名。
   * @param htmlContent HTML Content。
   * @returns S3バケットへのアップロードが成功したならばtrueを、失敗したならばfalseを返す。
   */
  public async upload(
    awsObjectKey: string,
    htmlContent: string
  ): Promise<boolean> {
    this.logger.debug(
      `Uploading "${awsObjectKey}" into "${this.bucketName}" on ${this.region})`
    );
    const start = performance.now();
    const putObjectCommandOutput = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Body: htmlContent,
        Key: awsObjectKey,
      })
    );
    const end = performance.now();
    const duration = utilsPerformance.toSecond(end - start);
    this.logger.debug(`DONE. (${duration} [sec.])`);
    return putObjectCommandOutput !== undefined;
  }

  /**
   * AWSオブジェクト名のリストを文字列型の配列として取得する。
   * @param prefixAWSObjectKey AWSオブジェクト名の接頭辞。
   * @returns AWSオブジェクト名のリスト。
   */
  public async getObjectKeys(
    prefixAWSObjectKey: string
  ): Promise<readonly string[]> {
    const command = new ListObjectsCommand({
      Bucket: this.bucketName,
      Prefix: prefixAWSObjectKey,
    });
    const response = await this.s3Client.send(command);

    const awsObjectKeys: readonly string[] =
      response.Contents?.filter((object) => object.Key !== undefined).map(
        (object) => object.Key as string
      ) || new Array<string>();
    return awsObjectKeys;
  }

  /**
   * 名前が `awsObjectKey` であるAWSオブジェクトから、そのオブジェクトのContentをダウンロードする。
   * @param awsObjectKey AWSオブジェクト名。
   * @returns AWSオブジェクト `awsObjectKey` のContent。
   * @throws {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error | Error}  S3バケット上にAWSオブジェクト `awsObjectKey` が存在しない場合、throwされる。
   */
  public async download(awsObjectKey: string): Promise<string> {
    const result = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: awsObjectKey,
      })
    );
    const resultBody = result.Body;
    if (resultBody) {
      const htmlContent = resultBody.transformToString();
      return htmlContent;
    } else {
      throw new Error(
        `ENOENT: no such file or directory, open 's3://${this.bucketName}/${awsObjectKey}'`
      );
    }
  }
}
