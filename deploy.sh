#!/bin/bash

function initPwd() {
  cd $(dirname $0)
}

function main() {
  initPwd

  # 変数の読み込み
  source .env

  set -eux

  # AWS-CDK によるデプロイ
  npm rum deploy

  # chromium レイヤの作成（1回目のビルド時のみ実行）
  if [ ! -f tmp/chromium/chromium.zip ]; then
    cd tmp
    git clone --depth=1 https://github.com/sparticuz/chromium.git
    cd chromium
    make chromium.zip
    cd ../../
    aws s3 cp tmp/chromium/chromium.zip "s3://${AWS_S3_BUCKET_NAME}/chromiumLayers/chromium114.zip"
    aws lambda publish-layer-version \
      --layer-name chromium \
      --description "Chromium v114" \
      --content "S3Bucket=${AWS_S3_BUCKET_NAME},S3Key=chromiumLayers/chromium114.zip" \
      --compatible-runtimes nodejs \
      --compatible-architectures x86_64 \
      | tee tmp/lambda-layer.json
  fi

  # レイヤをLambdaに設定
  CHOMSKEI_LAYER_VERSION_ARN=$( \
    aws lambda list-layer-versions --layer-name ${AWS_NODE_MODULES_LAMBDA_LAYER_NAME} --query "LayerVersions[*].LayerVersionArn" \
      | jq .[0] | sed -e "s/\"//g" \
  )
  CHROMIUM_LAYER_VERSION_ARN=$( \
    aws lambda list-layer-versions --layer-name chromium --query "LayerVersions[*].LayerVersionArn" \
      | jq .[0] | sed -e "s/\"//g" \
  )
  aws lambda update-function-configuration --function-name ${AWS_LAMBDA_NAME} \
    --layers ${CHOMSKEI_LAYER_VERSION_ARN} ${CHROMIUM_LAYER_VERSION_ARN} \
  | tee tmp/lambda.json
}

main
