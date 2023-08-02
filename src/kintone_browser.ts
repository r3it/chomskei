import { performance } from "perf_hooks";

import chromium from "@sparticuz/chromium";
import puppeteer, { Browser, Page, WaitForOptions } from "puppeteer-core";
import { ILogObj, Logger } from "tslog";

import { chomskeiEnv } from "./utils/environment_variables";
import {
  KintoneFilePathError,
  KintoneLoginError,
  KintoneSubdomainError,
} from "./utils/errors";
import * as utilsLogging from "./utils/logging_config";
import * as utilPerformance from "./utils/performance";

/**
 * kintoneへのアクセスに特化した headless ブラウザ。
 *
 * headlessブラウザとして、`@sparticuz/chromium` パッケージのchromiumを使用。
 *
 * kintoneへのアクセス以外（例えば、任意のURLへ移動などの動作）はできないようにメソッドを制限。
 *
 * このクラスはSingletonパターンで実装されている。
 */
export class KintoneBrowser {
  private static readonly KINTONE_LOGIN = "/login";
  private static readonly KINTONE_LOGOUT = "/logout";
  private static readonly CYBOZU_DOT_COM_ROOT = "/";
  private static readonly LOGIN_NAME_INPUT_ELEMENT =
    'input[id="username-:0-text"]';
  private static readonly PASSWORD_INPUT_ELEMENT =
    'input[id="password-:1-text"]';
  private static readonly LOGIN_BUTTON_INPUT_ELEMENT = "input.login-button";

  /**
   * Browser#waitFor* や Browser#goto のオプション。
   */
  private static readonly WAIT_FOR_POTIONS: WaitForOptions = {
    timeout: utilPerformance.toMilliSecond(chomskeiEnv.KINTONE_BROWSER_TIMEOUT),
    waitUntil: ["load", "domcontentloaded", "networkidle2"], // コネクション数が2個以下である状態が500 [ms] 続くまで wait 。
  };

  /**
   * Singleton パターンで実装したKintoneBrowser。
   * 1つのブラウザで複数のページ（タブ）を開けるように設計。
   */
  private static kintoneBrowser?: KintoneBrowser;
  /**
   * 実際にスクレイピングするブラウザ。
   * KintoneBrowserでは、 Browser (imported from "puppeteer") から必要な操作のみを抽出している。
   */
  private browser?: Browser;

  /**
   * ロギング用のロガー。
   */
  private readonly logger: Console | Logger<ILogObj>;
  /**
   * ページ（タブ）の連想配列（Map）。
   * 1サブドメインにつき1つのブラウザページ。
   */
  private readonly pages = new Map<string, Page>();

  private constructor(logger?: Console | Logger<ILogObj>) {
    if (logger === undefined) {
      this.logger = new Logger({
        name: "KintoneBrowser",
        minLevel: utilsLogging.INFO_LEVEL,
      });
    } else {
      this.logger = logger;
    }
  }

  /**
   * headlessなkintone専用ブラウザを作成する。
   *
   * 既に存在するkintone専用ブラウザがクローズされている場合、
   * そのkintone専用ブラウザそのものを再起動させる。
   *
   * このクラスはSingletonパターンで実装されている。
   * 一度このメソッドが呼び出された場合、kintone専用ブラウザは新規に作成されない。
   * @returns `KintoneBrowser` 型のheadless kintone専用ブラウザ。
   */
  public static async getInstance(
    logger?: Console | Logger<ILogObj>
  ): Promise<KintoneBrowser> {
    /* Singletonパターンで実装 */
    if (this.kintoneBrowser === undefined) {
      KintoneBrowser.init_chromium();
      this.kintoneBrowser = new KintoneBrowser(logger);
      await this.kintoneBrowser.launchChromium();
    } else if (this.kintoneBrowser.browser === undefined) {
      /* KintoneBrowserがインスタンスとして存在しているにもかかわらず、内部のChromiumブラウザがクローズされている場合 */
      await this.kintoneBrowser.launchChromium();
    }
    return this.kintoneBrowser;
  }

  private static init_chromium(): void;
  private static async init_chromium(fontFilePath: string): Promise<void>;

  private static async init_chromium(fontFilePath?: string): Promise<void> {
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;
    if (fontFilePath !== undefined) {
      // screenshot用フォントの設定 (async必要)
      await chromium.font(fontFilePath);
    }
  }

  private async launchChromium(): Promise<Browser> {
    this.logger.debug("Start launching headless Chromium browser...");
    const start /* [ms] */ = performance.now();
    this.browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const end /* [ms] */ = performance.now();
    const duration /* [sec.] */ = utilPerformance.toSecond(end - start);
    this.logger.debug(
      `End launching headless Chromium browser. (${duration} [sec.])`
    );
    return this.browser;
  }

  /**
   * サブドメインが `subdomainName` である kintone システムへ、
   * ログイン名が `loginName` であるユーザーとしてログインする。
   *
   * Basic認証を設定している kintone システムにログインするためには、
   * 引数 `basicCertificationUsername`、 `basicCertificationPassword` の双方を指定する必要がある。
   * @param subdomainName kintoneのサブドメイン名。
   * @param loginName kintoneのログイン名。
   * @param password kintoneのパスワード。
   * @param basicCertificationUsername Basic認証のユーザー名。
   * @param basicCertificationPassword Basic認証のパスワード。
   * @returns kintone へのログインが成功したならば true を、ログインが失敗した場合は false を返す。
   * @throws {@link utils/errors.KintoneSubdomainError}, {@link utils/errors.KintoneLoginError}
   */
  public async loginToKintone(
    subdomainName: string,
    loginName: string,
    password: string,
    basicCertificationUsername?: string,
    basicCertificationPassword?: string
  ): Promise<boolean> {
    const page = await this.openPage(subdomainName);
    if (page === undefined) {
      throw new TypeError("Browser has not built yet.");
    }

    const start /* [ms] */ = performance.now();
    if (
      basicCertificationUsername === undefined ||
      basicCertificationPassword === undefined ||
      basicCertificationUsername.length < 1 ||
      basicCertificationPassword.length < 1
    ) {
      this.logger.debug(`Login to kintone named "${subdomainName}"...`);
    } else {
      this.logger.debug(
        `Login to kintone named "${subdomainName}" via basic certification...`
      );
      await page.authenticate({
        username: basicCertificationUsername,
        password: basicCertificationPassword,
      });
      this.logger.debug("Accept basic certification.");
    }

    /* ログインページへのアクセス */
    const loginURL = KintoneBrowser.generateKintoneURL(
      subdomainName,
      KintoneBrowser.KINTONE_LOGIN
    );
    await page.goto(loginURL.toString(), KintoneBrowser.WAIT_FOR_POTIONS);

    const canLogin = await KintoneBrowser.loginKintoneByInputHTMLElement(
      subdomainName,
      loginName,
      password,
      page
    );
    if (canLogin) {
      const end /* [ms] */ = performance.now();
      const duration /* [sec.] */ = utilPerformance.toSecond(end - start);
      this.logger.debug(
        `Can login to kintone named "${subdomainName}". (${duration} [sec.])`
      );
      return canLogin;
    }
    throw new KintoneLoginError(subdomainName);
  }

  private async openPage(subdomainName: string): Promise<Page> {
    if (this.pages.has(subdomainName)) {
      const page = this.pages.get(subdomainName);
      if (page === undefined) {
        throw new RangeError(
          `"${subdomainName}" is not opened on this browser.`
        );
      }
      return page;
    } else {
      if (this.browser === undefined) {
        throw new TypeError("Browser has not built yet.");
      }
      const page = await this.browser.newPage();
      /* alert ダイアログがポップアップされたときに accept するための設定。 */
      page.on("dialog", (dialog) => {
        this.logger.warn(`Alert dialog is popped up.`);
        dialog.accept().then(() => {
            this.logger.warn(`Alert is accepted.`);
        }).catch((error) => {
            this.logger.warn(`Failed to Alert accepted.`)
        });
    });
      this.pages.set(subdomainName, page);
      return page;
    }
  }

  /**
   * kintoneのURLを Web APIのURLインスタンスとして生成する。
   * @param subdomainName kintoneのサブドメイン名。
   * @param kintoneFilePath kintoneシステム上のファイルパス。"/"を接頭辞として付与する必要がある。
   * @returns kintoneのURLを示すWeb APIのURLインスタンス
   * @throws {@link utils/errors.KintoneSubdomainError}, {@link utils/errors.KintoneFilePathError}
   */
  private static generateKintoneURL(
    subdomainName: string,
    kintoneFilePath: string
  ): URL {
    /* サブドメインが cybozu.com が示す条件に合致しているかどうか。
     * 合致していない場合はエラーを出す。
     * > サブドメインは3文字以上32文字以下で設定します。
     * > 英数字と「-」（ハイフン）を使用できます。ただし、サブドメインの先頭または末尾にハイフンを使用することはできません。
     * 参考： https://jp.cybozu.help/general/ja/admin/list_service/domain.html#list_service_domain_30
     */
    if (subdomainName.match(/^[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]$/)) {
      const kintoneDomain = `${subdomainName}.cybozu.com`;
      if (kintoneFilePath.match(/^\//)) {
        return new URL(kintoneFilePath, `https://${kintoneDomain}/`);
      } else {
        throw new KintoneFilePathError(
          kintoneFilePath,
          'The prefix of kintone file path must be "/"'
        );
      }
    } else {
      throw new KintoneSubdomainError(subdomainName);
    }
  }

  private static async loginKintoneByInputHTMLElement(
    subdomainName: string,
    loginName: string,
    password: string,
    page: Page
  ) {
    /* kintoneユーザのログイン名・パスワードを入力 */
    await page.waitForSelector(KintoneBrowser.LOGIN_NAME_INPUT_ELEMENT);
    await page.type(KintoneBrowser.LOGIN_NAME_INPUT_ELEMENT, loginName);
    await page.waitForSelector(KintoneBrowser.PASSWORD_INPUT_ELEMENT);
    await page.type(KintoneBrowser.PASSWORD_INPUT_ELEMENT, password);

    /* ログインボタンでログイン */
    await page.waitForSelector(KintoneBrowser.LOGIN_BUTTON_INPUT_ELEMENT);
    await page.click(KintoneBrowser.LOGIN_BUTTON_INPUT_ELEMENT);
    /* ログインが完了するまで待機 */
    await page.waitForNavigation(KintoneBrowser.WAIT_FOR_POTIONS);

    /* cybozu.com のルートURLにアクセスされているならばtrue（ログイン成功）とみなす */
    const cybozuDotComRootURL = KintoneBrowser.generateKintoneURL(
      subdomainName,
      KintoneBrowser.CYBOZU_DOT_COM_ROOT
    );

    return page.url() === cybozuDotComRootURL.toString();
  }

  /**
   * `kintoneFilePath` で指定した kintone の画面をHTMLソースコードとして取得する。
   * @param subdomainName kintone のサブドメイン名。
   * @param kintoneFilePath kintoneシステム上のファイルパス。"/"を接頭辞として付与する必要がある。
   * @returns `kintoneFilePath` で指定した kintone の画面に相当するHTMLソースコード。
   * @throws {@link utils/errors.KintoneSubdomainError}, {@link utils/errors.KintoneFilePathError}
   */
  public async scrapeKintoneScreenHTML(
    subdomainName: string,
    kintoneFilePath: string
  ): Promise<string> {
    const page = await this.openPage(subdomainName);
    if (page === undefined) {
      throw new TypeError("Browser has not built yet.");
    } else if (
      kintoneFilePath === KintoneBrowser.KINTONE_LOGIN ||
      kintoneFilePath === KintoneBrowser.KINTONE_LOGOUT
    ) {
      throw new KintoneFilePathError(
        kintoneFilePath,
        `"${KintoneBrowser.KINTONE_LOGIN}" and "${KintoneBrowser.KINTONE_LOGOUT}" are invalid kintone file path.`
      );
    }
    await page.bringToFront(); // アクティブタブに変更

    this.logger.debug(`Start scraping kintone screen html.`);
    const start /* [ms] */ = performance.now();
    const kintoneScreenURL = KintoneBrowser.generateKintoneURL(
      subdomainName,
      kintoneFilePath
    );
    await page.goto(
      kintoneScreenURL.toString(),
      KintoneBrowser.WAIT_FOR_POTIONS
    );
    const TIMEOUT_SEC = 3; /* [sec.] */
    await page.waitForTimeout(utilPerformance.toMilliSecond(TIMEOUT_SEC));

    const htmlContent = await page.content();
    const end /* [ms] */ = performance.now();
    const duration /* [sec.] */ = utilPerformance.toSecond(end - start);
    this.logger.debug(`End scraping kintone screen html. (${duration} [sec.])`);
    return htmlContent;
  }

  /**
   * サブドメインが `subdomainName` である kintone システムからログアウトする。
   * @param subdomainName kintoneのサブドメイン名。
   * @returns kintone からのログアウトが成功したならば true を、ログアウトが失敗した場合は false を返す。
   * @throws {@link utils/errors.KintoneSubdomainError}
   */
  public async logoutFromKintone(subdomainName: string): Promise<boolean> {
    const page = await this.openPage(subdomainName);
    if (page === undefined) {
      throw TypeError("Browser has not built yet.");
    }
    await page.bringToFront(); // アクティブタブに変更

    this.logger.debug("Logout from kintone...");
    const start /* [ms] */ = performance.now();
    const logoutURL = KintoneBrowser.generateKintoneURL(
      subdomainName,
      KintoneBrowser.KINTONE_LOGOUT
    );
    await page.goto(logoutURL.toString(), KintoneBrowser.WAIT_FOR_POTIONS);

    /* cybozu.com/login にアクセスされているならばtrue（ログイン成功）とみなす */
    const loginURL = KintoneBrowser.generateKintoneURL(
      subdomainName,
      KintoneBrowser.KINTONE_LOGIN
    );
    const canLogout = page.url() === loginURL.toString();
    const end /* [ms] */ = performance.now();
    const duration /* [sec.] */ = utilPerformance.toSecond(end - start);
    if (canLogout) {
      this.logger.debug(
        `Can logout from kintone named "${subdomainName}". (${duration} [sec.])`
      );
      return await this.closePage(subdomainName);
    } else {
      this.logger.error(
        `Cannot logout from kintone named "${subdomainName}". (${duration} [sec.]`
      );
      return false;
    }
  }

  /**
   * サブドメイン が `subdomainName` であるkintoneのページ（ブラウザのタブ）をクローズする。
   * @param subdomainName kintoneのサブドメイン名。
   * @returns サブドメイン が `subdomainName` であるkintoneのページ（ブラウザのタブ）がクローズされたならばtrue、
   * クローズされない、もしくはサブドメイン が `subdomainName` であるkintoneのページが存在しないならばfalseを返す。
   * @throws {@link utils/errors.KintoneSubdomainError}
   */
  private async closePage(subdomainName: string): Promise<boolean> {
    if (this.pages.has(subdomainName)) {
      const page = this.pages.get(subdomainName);
      if (page !== undefined) {
        await page.close();
      }
      return this.pages.delete(subdomainName);
    } else {
      return false;
    }
  }

  /**
   * headless kintone専用ブラウザをクローズする。
   */
  public async close(): Promise<void> {
    if (this.browser === undefined) {
      throw TypeError("Browser has not built yet.");
    }
    await this.browser.close();
    this.browser = undefined; // クローズ後は undefined に設定（ブラウザが開かれていないと明示）
  }

  /**
   * headlessなkintone専用ブラウザー内部で動作する headless Chromium ブラウザを再び起動させる。
   *
   * すでに headless Chromium ブラウザが起動されている場合は、
   * 新規に headless Chromium ブラウザを起動させないで、
   * 既存の起動済み headless Chromium ブラウザを使用する。
   * @returns `KintoneBrowser` 型のheadless kintone専用ブラウザー。
   */
  public async relaunch(): Promise<KintoneBrowser> {
    if (this.browser === undefined) {
      await this.launchChromium();
    } else {
      this.logger.warn("KintoneBrowser has already launched.");
    }
    return this;
  }
}
