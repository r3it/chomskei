abstract class KintoneBrowserError extends Error {}

/**
 * kintone のURLが誤ったフォーマルで指定された時にthrowされるエラー
 * @see {@link KintoneSubdomainError}
 * @see {@link KintoneFilePathError}
 */
export abstract class KintoneURLError extends KintoneBrowserError {}

/**
 * サブドメイン名が不正な時にthrowされるエラー。
 *
 * サブドメイン名に使用できる文字列は
 * [「cybozu.com ヘルプ cybozu.com共通管理 サブドメインの管理と契約状況の見かた サブドメインを変更する」 の 「サブドメインに使用できる文字列」](https://jp.cybozu.help/general/ja/admin/list_service/domain.html#list_service_domain_30)
 * 参照。
 */
export class KintoneSubdomainError extends KintoneURLError {
  private static readonly DEFAULT_ERROR_MESSAGE =
    'The length of subdomain names must be between 3 and 32 characters. You can use alphanumeric characters and "-" (hyphens). You cannot use a hyphen at the beginning or end of the subdomain.';

  /**
   *
   * @param subdomainName kintoneのサブドメイン名。
   */
  constructor(subdomainName: string) {
    const errorMessage = `${subdomainName}: ${KintoneSubdomainError.DEFAULT_ERROR_MESSAGE}`;
    super(errorMessage);
    this.name = new.target.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // https://future-architect.github.io/typescript-guide/exception.html
    // 下記の行はTypeScriptの出力ターゲットがES2015より古い場合(ES3, ES5)のみ必要
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * kintoneシステム上のファイルパスが不正な時にthrowされるエラー。
 *
 * kintoneシステム上のファイルパスとして、"`/`"を接頭辞として付与する必要がある。
 */
export class KintoneFilePathError extends KintoneURLError {
  /**
   *
   * @param kintoneFilePath kintoneシステム上のファイルパス。
   * @param errorReason エラーが throw された理由。
   */
  constructor(kintoneFilePath: string, errorReason: string) {
    const errorMessage = `${kintoneFilePath}: ${errorReason}.`;
    super(errorMessage);
    this.name = new.target.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // https://future-architect.github.io/typescript-guide/exception.html
    // 下記の行はTypeScriptの出力ターゲットがES2015より古い場合(ES3, ES5)のみ必要
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Kintoneへのログインが失敗した時にthrowされるエラー。
 */
export class KintoneLoginError extends KintoneBrowserError {
  private static readonly DEFAULT_ERROR_MESSAGE =
    "Kintone Browser cannot login because of wrong login name or password .";

  /**
   *
   * @param subdomainName kintoneのサブドメイン名
   */
  constructor(subdomainName: string) {
    const errorMessage = `${subdomainName}: ${KintoneLoginError.DEFAULT_ERROR_MESSAGE}`;
    super(errorMessage);
    this.name = new.target.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // https://future-architect.github.io/typescript-guide/exception.html
    // 下記の行はTypeScriptの出力ターゲットがES2015より古い場合(ES3, ES5)のみ必要
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
