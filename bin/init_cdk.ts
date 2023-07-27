#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "source-map-support/register";
import * as tsDotenv from "ts-dotenv";

import { ChomskeiAWSStack } from "../lib/cdk-project-stack";
import { bundleNpm } from "../lib/process/setup";

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

try {
  /* プリプロセス（nodejs/node_modules/）の作成 */
  bundleNpm();

  const env = tsDotenv.load({
    AWS_ACCOUNT_ID: String,
    AWS_REGION: AWS_REGIONS,
  });

  const app = new App();
  new ChomskeiAWSStack(app, "ChomskeiAWSStack", {
    description: "chomskeiのAWS CouldFormation。",
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT ?? env.AWS_ACCOUNT_ID,
      region: process.env.CDK_DEFAULT_REGION ?? env.AWS_REGION,
    },
    stackName: "ChomskeiAWSStack",
  });
} catch (e) {
  if (e instanceof Error) {
    console.error(e.stack);
  }
}
