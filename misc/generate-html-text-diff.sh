#!/bin/bash

function initPwd() {
  cd $(dirname $0)/..
}

initPwd

PREFIX_FILE_PATH=out/html/$(date +"%Y%m%d")/
CURRENT_FILE_SUFFIX=-current.html
PREVIEW_FILE_SUFFIX=-preview.html

npm run format-output-html -date=$(date +"%Y%m%d") # スクレイピングしたHTMLを整形

for htmlFilePath in $(ls ${PREFIX_FILE_PATH}*${CURRENT_FILE_SUFFIX}); do
  htmlFilename=${htmlFilePath##*/}
  screenName=${htmlFilename%${CURRENT_FILE_SUFFIX}}
  currentFilePath=${PREFIX_FILE_PATH}${screenName}${CURRENT_FILE_SUFFIX}
  previewFilePath=${PREFIX_FILE_PATH}${screenName}${PREVIEW_FILE_SUFFIX}
  diff -Bw ${currentFilePath} ${previewFilePath} > out/text-diff/${screenName}.diff
done
