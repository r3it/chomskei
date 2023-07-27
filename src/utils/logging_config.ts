import { cdate } from "cdate";
import * as rfs from "rotating-file-stream";
import { ILogObj, Logger } from "tslog";
import { ILogObjMeta } from "tslog/dist/types/interfaces";

export const SILLY_LEVEL = 0;
const TRACE_LEVEL = 1;
export const DEBUG_LEVEL = 2;
export const INFO_LEVEL = 3;
export const WARN_LEVEL = 4;
const ERROR_LEVEL = 5;
export const FATAL_LEVEL = 6;

export type LoggingLevel =
  | typeof SILLY_LEVEL
  | typeof TRACE_LEVEL
  | typeof DEBUG_LEVEL
  | typeof INFO_LEVEL
  | typeof WARN_LEVEL
  | typeof ERROR_LEVEL
  | typeof FATAL_LEVEL;

function setLogFormat(
  stream: rfs.RotatingFileStream,
  iLogObj: ILogObj & ILogObjMeta
): void {
  const filePathWithLine =
    iLogObj._meta.path?.filePathWithLine !== undefined
      ? iLogObj._meta.path?.filePathWithLine
      : "";
  const methodName =
    iLogObj._meta.path?.method !== undefined ? iLogObj._meta.path?.method : "";
  const message = iLogObj["0"] !== undefined ? iLogObj[0] : "";
  if (typeof message !== "string") {
    throw new TypeError('Type of log message is not "string."');
  }
  const log = `${iLogObj._meta.date.toLocaleString("ja")}\t${
    iLogObj._meta.logLevelName
  }\t${filePathWithLine}\t${methodName}\t${message}\n`;
  stream.write(log);
}

export function generateLogger(
  loggerName: string,
  logFilenamePrefix?: string,
  minLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6
): Logger<ILogObj> {
  const logger: Logger<ILogObj> =
    minLevel === undefined
      ? new Logger({ name: loggerName })
      : new Logger({ name: loggerName, minLevel: minLevel });

  if (logFilenamePrefix !== undefined) {
    const cdateJST = cdate().tz("Asia/Tokyo").cdateFn(); // JSTに固定
    const todayDateString = cdateJST().format("YYYY.MM.DD");
    const stream = rfs.createStream(
      `var/log/${logFilenamePrefix}.${todayDateString}.log`,
      {
        size: "10M", // rotate every 10 MegaBytes written
        interval: "1d", // rotate daily
        compress: "gzip", // compress rotated files
      }
    );
    logger.attachTransport((iLogObj: ILogObj & ILogObjMeta): void => {
      setLogFormat(stream, iLogObj);
    });
  }
  return logger;
}
