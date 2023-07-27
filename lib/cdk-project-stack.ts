import {
  aws_events,
  aws_lambda,
  aws_s3,
  aws_events_targets,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_sns,
  aws_lambda_destinations,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as tsDotenv from "ts-dotenv";
import { NODE_LAMBDA_LAYER_DIR } from "./process/setup";
import path from "path";

const KINTONE_SUBDOMAIN_REGEXP = /^[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]$/;
const KINTONE_PASSWD_REGEXP =
  /[A-Za-z0-9!"#$%&'()*+,\-./:;=<>?@[\]^_`{}|~ ]{1,64}/;
const env = tsDotenv.load({
  AMAZON_SNS_FATAL_TOPIC_ARN: String,
  AMAZON_SNS_FATAL_TOPIC_NAME: String,
  AMAZON_SNS_TOPIC_ARN: String,
  AMAZON_SNS_TOPIC_NAME: String,
  AWS_LAMBDA_NAME: String,
  AWS_NODE_MODULES_LAMBDA_LAYER_NAME: String,
  AWS_S3_BUCKET_NAME: String,
  AWS_EVENT_BRIDGE_NAME: String,

  /* AWS Lambda上で定義される環境変数 */
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
});

const envVariables: { [variableName: string]: string } = {
  AMAZON_SNS_TOPIC_ARN: env.AMAZON_SNS_TOPIC_ARN,
  AWS_S3_BUCKET_NAME: env.AWS_S3_BUCKET_NAME,

  CURRENT_KINTONE_SUBDOMAIN_NAME: env.CURRENT_KINTONE_SUBDOMAIN_NAME,
  CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME:
    env.CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME === undefined
      ? ""
      : env.CURRENT_KINTONE_BASIC_CERTIFICATION_USERNAME,
  CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD:
    env.CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD === undefined
      ? ""
      : env.CURRENT_KINTONE_BASIC_CERTIFICATION_PASSWD,
  CURRENT_KINTONE_LOGIN_NAME: env.CURRENT_KINTONE_LOGIN_NAME,
  CURRENT_KINTONE_PASSWD: env.CURRENT_KINTONE_PASSWD,
  CURRENT_KINTONE_SPACE_ID: env.CURRENT_KINTONE_SPACE_ID.toString(),
  CURRENT_KINTONE_MULTI_THREAD_SPACE_ID:
    env.CURRENT_KINTONE_MULTI_THREAD_SPACE_ID.toString(),
  CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID:
    env.CURRENT_KINTONE_MULTI_THREAD_SPACE_THREAD_ID.toString(),
  CURRENT_KINTONE_MAIN_APP_ID: env.CURRENT_KINTONE_MAIN_APP_ID.toString(),
  CURRENT_KINTONE_SUB_APP_ID: env.CURRENT_KINTONE_SUB_APP_ID.toString(),

  KINTONE_APP_ACTION_ID: env.KINTONE_APP_ACTION_ID.toString(),
  KINTONE_BROWSER_TIMEOUT: env.KINTONE_BROWSER_TIMEOUT.toString(),
  KINTONE_MAIN_APP_CALENDER_FORM_ID:
    env.KINTONE_MAIN_APP_CALENDER_FORM_ID.toString(),
  KINTONE_MAIN_APP_CALENDER_FORM_DATE: env.KINTONE_MAIN_APP_CALENDER_FORM_DATE,
  KINTONE_MAIN_APP_RECORD_ID: env.KINTONE_MAIN_APP_RECORD_ID.toString(),
  KINTONE_MAIN_APP_REPORT_ID: env.KINTONE_MAIN_APP_REPORT_ID.toString(),
  KINTONE_MAIN_APP_TABLE_FORM_ID: env.KINTONE_MAIN_APP_TABLE_FORM_ID.toString(),
  KINTONE_SUB_APP_CATEGORY_ID: env.KINTONE_SUB_APP_CATEGORY_ID.toString(),
  KINTONE_SUB_APP_DEFAULT_VIEW: env.KINTONE_SUB_APP_DEFAULT_VIEW.toString(),
  KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW:
    env.KINTONE_SUB_APP_OWN_ASSIGNEE_VIEW.toString(),
  KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID:
    env.KINTONE_SUB_APP_PROCESS_DONE_RECORD_ID.toString(),
  KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID:
    env.KINTONE_SUB_APP_PROCESS_TBC_RECORD_ID.toString(),
  KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID:
    env.KINTONE_SUB_APP_PROCESS_UNTREATED_RECORD_ID.toString(),

  LOGGING_LEVEL: env.LOGGING_LEVEL.toString(),

  PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD:
    env.PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD === undefined
      ? ""
      : env.PREVIEW_KINTONE_BASIC_CERTIFICATION_PASSWD,
  PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME:
    env.PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME === undefined
      ? ""
      : env.PREVIEW_KINTONE_BASIC_CERTIFICATION_USERNAME,
  PREVIEW_KINTONE_LOGIN_NAME: env.PREVIEW_KINTONE_LOGIN_NAME,
  PREVIEW_KINTONE_MAIN_APP_ID: env.PREVIEW_KINTONE_MAIN_APP_ID.toString(),
  PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID:
    env.PREVIEW_KINTONE_MULTI_THREAD_SPACE_THREAD_ID.toString(),
  PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID:
    env.PREVIEW_KINTONE_MULTI_THREAD_SPACE_ID.toString(),
  PREVIEW_KINTONE_PASSWD: env.PREVIEW_KINTONE_PASSWD,
  PREVIEW_KINTONE_SPACE_ID: env.PREVIEW_KINTONE_SPACE_ID.toString(),
  PREVIEW_KINTONE_SUB_APP_ID: env.PREVIEW_KINTONE_SUB_APP_ID.toString(),
  PREVIEW_KINTONE_SUBDOMAIN_NAME: env.PREVIEW_KINTONE_SUBDOMAIN_NAME,
};

export class ChomskeiAWSStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    /* AWS Lambdaの作成 */
    const runtime = aws_lambda.Runtime.NODEJS_18_X;
    const nodeModulesLayer = new aws_lambda.LayerVersion(
      this,
      env.AWS_NODE_MODULES_LAMBDA_LAYER_NAME,
      {
        code: aws_lambda.AssetCode.fromAsset(NODE_LAMBDA_LAYER_DIR),
        compatibleRuntimes: [runtime],
        layerVersionName: env.AWS_NODE_MODULES_LAMBDA_LAYER_NAME,
      }
    );

    const fatalSNSTopic = aws_sns.Topic.fromTopicArn(
      this,
      env.AMAZON_SNS_FATAL_TOPIC_NAME,
      env.AMAZON_SNS_FATAL_TOPIC_ARN
    );

    const LAMBDA_MEMORY_SIZE = 512; /* [MB] */
    const TIMEOUT_DURATION = 10 * 60; /* [sec.] */
    const lambdaFunction = new aws_lambda.Function(this, env.AWS_LAMBDA_NAME, {
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "../dist/")),
      environment: envVariables,
      functionName: env.AWS_LAMBDA_NAME,
      handler: "index.handler",
      memorySize: LAMBDA_MEMORY_SIZE,
      layers: [nodeModulesLayer],
      onFailure: new aws_lambda_destinations.SnsDestination(fatalSNSTopic),
      timeout: Duration.seconds(TIMEOUT_DURATION),
      runtime: runtime,
    });

    const EXPIRATION_DAYS = 60;
    const bucket = new aws_s3.Bucket(this, env.AWS_S3_BUCKET_NAME, {
      bucketName: env.AWS_S3_BUCKET_NAME,
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(EXPIRATION_DAYS),
          id: "DeleteHTML",
          prefix: "html",
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
    });
    envVariables.BUCKET_NAME = bucket.bucketName;
    bucket.grantReadWrite(lambdaFunction);

    const snsTopic = aws_sns.Topic.fromTopicArn(
      this,
      env.AMAZON_SNS_TOPIC_NAME,
      env.AMAZON_SNS_TOPIC_ARN
    );
    snsTopic.grantPublish(lambdaFunction);

    /* EventBridge の作成 */
    const NOON = 12; // 12:00 (0:00 PM)
    const DIFFERENCE_OF_UTC_AND_JST = 9;
    const RETRY_ATTEMPTS = 3;
    new aws_events.Rule(this, env.AWS_EVENT_BRIDGE_NAME, {
      ruleName: env.AWS_EVENT_BRIDGE_NAME,
      schedule: aws_events.Schedule.cron({
        /* JST で毎日 12:00 に定期実行 */
        minute: "0",
        hour: (NOON - DIFFERENCE_OF_UTC_AND_JST).toString(),
      }),
      targets: [
        new aws_events_targets.LambdaFunction(lambdaFunction, {
          retryAttempts: RETRY_ATTEMPTS,
        }),
      ],
    });

    /* Remarks: Amazon SNS は、すでにAWS上にデプロイされているTopic ARNを使用 */
  }
}
