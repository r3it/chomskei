import {
  ElementNodeType,
  NodeType,
  TextNodeType,
  HASH_COMMENT,
  HASH_TEXT,
} from "./utils/diff_dom_for_chomskei";
import { chomskeiEnv } from "./utils/environment_variables";

const ANCHOR_ELEMENT = "A";
const BUTTON_ELEMENT = "BUTTON";
const CONTENT_DIVISION_ELEMENT = "DIV";
const CONTENT_SPAN_ELEMENT = "SPAN";
const EXTERNAL_RESOURCE_LINK_ELEMENT = "LINK";
const FORM_INPUT_ELEMENT = "INPUT";
const IMAGE_EMBED_ELEMENT = "IMG";
const LABEL_ELEMENT = "LABEL";
const LIST_ITEM_ELEMENT = "LI";
const SCRIPT_ELEMENT = "SCRIPT";
const TABLE_DATA_CELL_ELEMENT = "TD";
const TEXTAREA_ELEMENT = "TEXTAREA";

const HEADER_HEADER_USER_PHOTO = "sc-bOhtcR fJzNiK__photo";
const HEADER_HEADER_RIGHT = "sc-camqpD icpmLS__right"; // kintoneヘッダーの右側に配置されているコンポーネント
const HEADER_HEADER_SERVICE = "sc-kbdlSk jWGHLY"; // cybozu他サービスへのリンク
const HEADER_TOOLBAR_BEGINNER = "sc-satoz RHzku";

abstract class DOMVisitor {
  private readonly _dom: NodeType;

  constructor(dom: NodeType) {
    this._dom = dom;
  }

  public get dom(): NodeType {
    return this._dom;
  }

  protected abstract postVisit(node: NodeType): void;

  protected visit(node: NodeType): boolean {
    if (node.childNodes) {
      const visitChild = (retVal: boolean, node: NodeType) =>
        retVal && this.visit(node);
      const retVal: boolean = node.childNodes.reduce(visitChild, true);
      this.postVisit(node);
      return retVal;
    } else {
      this.postVisit(node);
      return true;
    }
  }
}

export class KintoneValuesNormalizer extends DOMVisitor {
  private static readonly KINTONE_VERSION_REGEX =
    /[1-9][0-9]*\.[0-9]*\.[0-9]*_[0-9]+/;

  private readonly mainAppID: number;
  private readonly subAppID: number;

  private readonly ignoresScriptElementContents: boolean;

  constructor(
    dom: NodeType,
    isPreviewKintone: boolean,
    ignoresScriptElementContents = false
  ) {
    super(dom);
    if (isPreviewKintone) {
      this.mainAppID = chomskeiEnv.PREVIEW_KINTONE_MAIN_APP_ID;
      this.subAppID = chomskeiEnv.PREVIEW_KINTONE_SUB_APP_ID;
    } else {
      this.mainAppID = chomskeiEnv.CURRENT_KINTONE_MAIN_APP_ID;
      this.subAppID = chomskeiEnv.CURRENT_KINTONE_SUB_APP_ID;
    }
    this.ignoresScriptElementContents = ignoresScriptElementContents;
  }

  public normalizeValues() {
    return this.visit(this.dom);
  }

  protected postVisit(node: NodeType): void {
    return;
  }

  protected visit(node: NodeType): boolean {
    /* コメント・空白文字列の削除 */
    if (node.childNodes !== undefined && node.childNodes.length > 0) {
      node.childNodes = node.childNodes.filter((item) => {
        if (item.nodeName === HASH_COMMENT) {
          /* コメントの除去 */
          return false;
        } else if (item.nodeName === HASH_TEXT) {
          /* 空白文字列の削除 */
          const tmpItem = item as TextNodeType;
          return !tmpItem.data.match(/^[\s\n]+$/);
        } else {
          return true;
        }
      });
    }

    if (node.nodeName === HASH_TEXT || node.nodeName === HASH_COMMENT) {
      const canVisit = this.visitTextNode(node as TextNodeType);
      return canVisit && super.visit(node);
    }
    switch (node.nodeName) {
      case EXTERNAL_RESOURCE_LINK_ELEMENT /* <link> */:
        this.visitExternalResourceLink(node);
        break;
      case ANCHOR_ELEMENT /* <a> */:
        this.visitAnchor(node);
        break;
      case LIST_ITEM_ELEMENT /* <li> */:
        this.visitListItem(node);
        break;
      case TABLE_DATA_CELL_ELEMENT /** <td> */:
        this.visitTableDataCell(node);
        break;
      case IMAGE_EMBED_ELEMENT /* <img> */:
        this.visitImageEmbed(node);
        break;
      case CONTENT_SPAN_ELEMENT /* <span> */:
        this.visitContentSpan(node);
        break;
      case CONTENT_DIVISION_ELEMENT /* <div> */:
        this.visitContentDivision(node);
        break;
      case FORM_INPUT_ELEMENT /* <input> */:
        this.visitFormInput(node);
        break;
      case LABEL_ELEMENT /* <label> */:
        this.visitLabel(node);
        break;
      case TEXTAREA_ELEMENT /* <textarea> */:
        this.visitTextarea(node);
        break;
      case SCRIPT_ELEMENT /* <script> */:
        this.visitScript(node);
        break;
    }
    return super.visit(node);
  }

  private visitTextNode(node: TextNodeType): boolean {
    /* コメントが投稿された日時（M/d mm:ss）の正規化 */
    node.data = node.data.replace(
      /^([1-9]|1[12])\/([1-9]|[1-2][0-9]|3[01])\s+(0?[1-9]|1[0-9]|2[1-3]):[[0-5][0-9]$/,
      "$${DATE_AND_TIME}"
    );
    return true;
  }

  private visitExternalResourceLink(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }
    switch (node.attributes.rel) {
      case "apple-touch-icon":
        /* アイコンのhrefを正規化 */
        node.attributes.href = node.attributes.href.replace(
          KintoneValuesNormalizer.KINTONE_VERSION_REGEX,
          "$${KINTONE_VERSION}"
        );
        break;
      case "stylesheet":
        /* スタイルシートのhrefを正規化 */
        node.attributes.href = node.attributes.href.replace(
          KintoneValuesNormalizer.KINTONE_VERSION_REGEX,
          "$${KINTONE_VERSION}"
        );
        break;
    }
    return true;
  }

  private visitAnchor(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }
    const className = node.attributes.class;
    switch (className) {
      /* TODO: クラス名に依存しない正規化の実装 */
      case undefined:
        break;
      case "gaia-header-img gaia-header-img-logo":
        /* ポータルURLの正規化 */
        node.attributes.href = "$${PORTAL_URL}";
        break;
      case "gaia-argoui-space-spacelayout-title":
        /* スペース番号の正規化 */
        node.attributes.href = "$${SPACE_ID_URL}";
        break;
      case "gaia-argoui-appscrollinglist-item":
        /* アプリ番号の正規化 */
        node.attributes.href = "$${APP_ID_URL}";
        break;
      case "gaia-argoui-panelscrollinglist-item":
        /* 表示名の正規化 */
        node.attributes.href = "$${USER_ID_URL}";
        break;
      case "ocean-space-thread-update":
        /* 表示名の正規化 */
        node.attributes.href = "$${USER_ID_URL}";
        break;
      case "ocean-space-thread-edit":
        /* スレッド内コメントIDの正規化 */
        node.attributes.href = "$${COMMENT_ID_URL}";
        break;
      case "gaia-argoui-app-titlebar-content":
        /* スペース番号の正規化 */
        node.attributes.href = "$${SPACE_ID_URL}";
        break;
      case "gaia-argoui-app-breadcrumb-item gaia-argoui-app-breadcrumb-link":
        /* スペース番号の正規化 */
        node.attributes.href = "$${SPACE_ID_URL}";
        break;
      case "gaia-argoui-app-menu-add gaia-argoui-app-menu":
        /* アプリ追加画面の正規化 */
        node.attributes.href = "$${ADD_RECORD_URL}";
        break;
      case "gaia-argoui-app-menu-settings gaia-argoui-app-menu":
        /* アプリ設定画面の正規化 */
        node.attributes.href = "$${APP_SETTING_URL}";
        break;
      case "recordlist-show-gaia":
        /* レコード詳細画面の正規化 */
        node.attributes.href = "$${SHOW_RECORD_DETAILS_URL}";
        break;
      case "plupload-button-cybozu":
        /* 「添付ファイル」フィールドに存在するボタンに付与されたIDの正規化 */
        node.attributes.id = node.attributes.id.replace(
          /^[1-9][0-9]*_[0-9]*/,
          "$${ATTACHMENT_UPLOADING_BUTTON_ID}"
        );
        break;
      default:
        if (className.startsWith("goog-tab sidebar-tab-comments-gaia")) {
          /* レコード詳細画面のコメントを表示させるボタンに付与されたID */
          node.attributes.id = "$${SIDEBAR_TAB_COMMENTS_ID}";
        } else if (className.startsWith("goog-tab sidebar-tab-history-gaia")) {
          /* レコード詳細画面の変更履歴を表示させるボタンに付与された ID */
          node.attributes.id = "$${SIDEBAR_TAB_HISTORY_ID}";
        }
        break;
    }

    const href = node.attributes.href;
    if (href !== undefined) {
      if (href.match(/\/k\/?$/)) {
        /* ポータルへのリンクを正規化 */
        node.attributes.href = "/k";
      } else if (
        href.match(/^\/k\/#\/space\/[1-9][0-9]*\/thread\/[1-9][0-9]*/)
      ) {
        /* スペースへのリンクを正規化（スレッドID含む） */
        node.attributes.href = href.replace(
          /^\/k\/#\/space\/[1-9][0-9]*\/thread\/[1-9][0-9]*/,
          "/k/#/space/$${SPACE_ID}/thread/$${MULTI_THREAD_ID}"
        );
      } else if (href.match(/^\/k\/#\/space\/[1-9][0-9]*/)) {
        /* スペースへのリンクを正規化 */
        node.attributes.href = href.replace(
          /^\/k\/#\/space\/[1-9][0-9]*/,
          "/k/#/space/$${SPACE_ID}"
        );
      } else if (href.match(/^\/k\/[1-9][0-9]*/)) {
        /* アプリへのリンクを正規化 */
        node.attributes.href = href
          .replace(/^\/k\/[1-9][0-9]*/, "/k/$${APP_ID}")
          .replace(/record=[0-9]+/, "record=${{RECORD_ID}}");
      } else if (href.match(/^\/k\/#\/people\/user\/.+$/)) {
        /* ピープルへのリンクを正規化 */
        node.attributes.href = href.replace(
          /^\/k\/#\/people\/user\/.+$/,
          "/k/#/people/$${LOGIN_NAME}"
        );
      }
    }

    const title = node.attributes.title;
    const isCommentAnchor =
      href !== undefined &&
      href.match(
        /https:\/\/[A-Za-z0-9][A-Za-z0-9-]{1,30}[A-Za-z0-9]\.cybozu\.com\/k\/#\/space\/[0-9]+\/thread\/[0-9]+\/[0-9]+/
      ) &&
      title !== undefined &&
      title.match(
        /* YYYY/M/d h:m */
        /[1-9][0-9]{3}\/(0?[1-9]|1[12])\/(0?[1-9]|[12][0-9]|31)\s+(0?[1-9]|1[0-9]|2[0-4]):((0?|[1-5])[0-9])/
      );
    if (isCommentAnchor) {
      /* コメント内に存在する日付に付与されたアンカーを正規化 */
      node.attributes.href = "$${THREAD_COMMENT_ID}";
      node.attributes.title = "$${DATE}";
    }
    return true;
  }

  private visitListItem(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }
    const className = node.attributes.class;
    if (className === undefined) {
      /* do nothing */
    } else if (
      className.startsWith("gaia-argoui-appscrollinglist-item-outer")
    ) {
      /* スペース内アプリの正規化 */
      node.attributes.class = "gaia-argoui-appscrollinglist-item-outer-$APP_ID";
      node.attributes.id = "$${APP_ID}";
    } else if (
      className.startsWith("gaia-argoui-panelscrollinglist-item-outer-USER")
    ) {
      /* スペースに参加しているユーザの正規化 */
      node.attributes.class =
        "gaia-argoui-panelscrollinglist-item-outer-USER-$USER_ID";
      node.attributes.id = "$${USER_ID}";
    }

    /* 「kintoneをはじめる」ボタンの正規化（除去） */
    node.childNodes = node.childNodes?.filter(
      (node: ElementNodeType) =>
        node.attributes !== undefined && "class" in node.attributes // class attributeが存在するならば、
          ? node.attributes.class !== HEADER_TOOLBAR_BEGINNER //  class attributeが "sc-fGwHKD fuoiiV" でない他のhtml elementを配列に格納
          : true // class attributeが存在しない場合、元の node.childNode を格納
    );

    return true;
  }

  private visitTableDataCell(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }

    const className = node.attributes.class;
    if (className !== undefined) {
      if (className.startsWith("goog-date-picker-date")) {
        /* 「日付」・「日時」フィールド入力時にポップアップされるカレンダー上の div element におけるIDの正規化 */
        node.attributes.id = "$${GOOG_DATE_PICKER_DATE}";
      }
    }

    return true;
  }

  private visitImageEmbed(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }
    if (
      node.attributes.src !== undefined &&
      node.attributes.src.includes("logo")
    ) {
      /* kintoneのヘッダ上に存在するロゴの正規化 */
      node.attributes.src = "$${LOGO_IMG_URL}";
    } else if (
      node.attributes.class !== undefined &&
      node.attributes.class === HEADER_HEADER_USER_PHOTO
    ) {
      node.attributes.src = "$${USER_ICON_URL}";
    } else if (
      node.attributes.width !== undefined &&
      node.attributes.width === "16" &&
      node.attributes.height !== undefined &&
      node.attributes.height === "16"
    ) {
      /* ユーザーアイコンの正規化 */
      node.attributes.src = "$${USER_ICON_URL}";
    }
    return true;
  }

  private visitContentSpan(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }
    const className = node.attributes.class;
    switch (className) {
      case undefined:
        /* class attributeがundefinedならば何もしない */
        break;
      case "gaia-header-header-user-photo":
        /* ヘッダーにおけるユーザーアイコンの正規化 */
        node.attributes.style = node.attributes.style.replace(
          /background-image:\s*url\(.+\)/,
          "background-image: url($${USER_ICON_URL})"
        );
        break;
      case "gaia-argoui-panelscrollinglist-icon":
        /* スペース画面に表示されるユーザーアイコンの正規化 */
        node.attributes.style = node.attributes.style.replace(
          /background-image:\s*url\(.+\)/,
          "background-image: url($${USER_ICON_URL})"
        );
        break;
      case "ocean-space-thread-photo":
        /* スペース内スレッドにおけるユーザーアイコンの正規化 */
        node.attributes.style = node.attributes.style.replace(
          /background-image:\s*url\(.+\)/,
          "background-image: url($${USER_ICON_URL})"
        );
        break;
      case "entity-list-item-USER-cybozu entity-user-cybozu":
        /* フィールドにおけるユーザーアイコンの正規化 */
        node.attributes.style = node.attributes.style.replace(
          /background-image:\s*url\(.+\)/,
          "background-image: url($${USER_ICON_URL})"
        );
        break;
      case "gaia-argoui-select-label":
        /* スペースのポータルにおけるアプリ表示方法コンポーネントが持つIDの正規化 */
        node.attributes.id = "$${APP_SELECT_LABEL}";
        break;
      case "gaia-argoui-forms-datepicker-select-label":
        /* 「日付」・「日時」フィールド入力時にポップアップされるカレンダー上の div elementにおけるIDの正規化 */
        node.attributes.id = "$${DATEPICKER_SELECT_LABEL_ID}";
        break;
      case "ocean-ui-dialog-title-text":
        /* タイトル「絞り込む」に付与されたIDの正規化 */
        node.attributes.id = "$${DIALOG_TITLE_TEXT}";
        break;
      default:
        if (className.match(/^[Ii]nputReadOnly/)) {
          /* 自動入力されるフィールド「レコード番号」「作成者」「作成日時」「更新者」「更新日時」に付与されるIDの正規化 */
          node.attributes.id = "${INPUT_READ_ONLY_CYBOZU_ID}";
        }
        break;
    }
    return true;
  }

  private visitContentDivision(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }

    const className = node.attributes.class;
    if (className === undefined) {
      /* do nothing */
    } else if (className === "gaia-header-header-service") {
      /*  cybozuが提供する他サービスへのリンクを正規化（削除） */
      node.childNodes = undefined;
    } else if (className === HEADER_HEADER_RIGHT) {
      /* cybozuが提供する他サービスへのリンクを正規化（削除） */
      node.childNodes = node.childNodes?.filter(
        (node: ElementNodeType) =>
          node.attributes !== undefined && "class" in node.attributes // class attributeが存在するならば、
            ? node.attributes.class !== HEADER_HEADER_SERVICE // class attributeが "sc-iIdsgP kdjZTQ" でない他のhtml elementを配列に格納
            : true // class attribute が存在しないならば、元の node childNodes を格納
      );
    } else if (
      className === "gaia-header-toolbar-links" &&
      node.childNodes !== undefined
    ) {
      /* 「kintoneをはじめる」ボタンの正規化（除去） */
      node.childNodes = node.childNodes.filter((item) => {
        return item.nodeName !== BUTTON_ELEMENT;
      });
    } else if (
      className.startsWith(
        "ocean-ui-comments-commentbase ocean-ui-comments-post ocean-ui-comments-post-id-"
      )
    ) {
      node.attributes.class =
        "ocean-ui-comments-commentbase ocean-ui-comments-post ocean-ui-comments-post-id-$${CONTENTS_ID}";
    } else if (className === "ocean-ui-comments-commentbase-usericon") {
      /* ユーザーアイコンの正規化 */
      node.attributes.style = node.attributes.style.replace(
        /background-image:\s*url\(.+\)/,
        "background-image: url($${USER_ICON_URL})"
      );
    } else if (className.startsWith("input-file-")) {
      node.attributes.id = node.attributes.id.replace(
        /^[1-9][0-9]*_[0-9]+/,
        "$${ATTACHMENT_ID}"
      );
    } else if (className === "plupload html5") {
      /* 「添付ファイル」フィールドにおけるIDの正規化 */
      if (node.attributes.id !== undefined) {
        node.attributes.id = node.attributes.id.replace(
          /^.+-html5-container$/,
          "$${ATTACHMENT_CONTAINER_ID}-html5-container"
        );
      }
    } else if (className === "editor-toolbar-cybozu") {
      /* レコード編集・追加画面において「リッチエディター」フィールドに付与されたIDの正規化 */
      node.attributes.id = "$${EDITOR_TOOLBAR_CYBOZU}";
    } else if (className === "editor-cybozu cybozu-editor-seamless editable") {
      /* レコード編集・追加画面において「リッチエディター」フィールドに付与されたIDの正規化 */
      node.attributes.id = "$${EDITOR_CYBOZU}";
    } else if (
      className === "goog-inline-block goog-toolbar-menu-button-caption"
    ) {
      /* レコード編集・追加画面において「リッチエディター」フィールドにおけるフォントサイズ設定に付与されたIDの正規化 */
      if (node.attributes.id !== undefined) {
        node.attributes.id = "$${GOOG_INLINE_BLOCK_ID}";
      }
    } else if (className.startsWith("goog-menuitem goog-option")) {
      /* レコード編集・追加画面において「複数選択」フィールドの値に付与されたIDの正規化 */
      node.attributes.id = "$${GOOG_OPTION_SELECTED}";
    } else if (className === "ocean-ui-dialog-content") {
      /* 「絞り込む」で使用するdiv elementに付与されたIDの正規化 */
      node.attributes.id = "$${DIALOG_CONTENT_ID}";
    } else if (className === "gaia-argoui-app-pager") {
      /* レコード詳細画面において、「前のレコードに移動する」「次のレコードに移動する」のstyleを正規化（position: relative 削除） */
      if (node.attributes.style === "position: relative;") {
        delete node.attributes.style;
      }
    }

    if ("aria-activedescendant" in node.attributes) {
      /* 「絞り込む」ボタンに付与された aria-activedescendant attribute の正規化 */
      node.attributes["aria-activedescendant"] = "$${ARIA_ACTIVEDESCENDANT}";
    }
    if ("aria-labelledby" in node.attributes) {
      /* 「絞り込む」ボタンに付与された aria-labelledby attribute の正規化 */
      node.attributes["aria-labelledby"] = "$${ARIA_LABELLEDBY}";
    }
    return true;
  }

  private visitFormInput(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }

    const id = node.attributes.id;
    if (id !== undefined && id.endsWith("_html5")) {
      /* 添付ファイルにおけるIDの正規化 */
      node.attributes.id = id.replace(/^.+_html5$/, "$${ATTACHMENT_ID}_html5");
    }

    const className = node.attributes.class;
    switch (className) {
      case "input-text-cybozu":
        /* レコード編集・追加画面で文字列入力系フィールドに付与されたIDの正規化 */
        node.attributes.id = "$${INPUT_TEXT_CYBOZU_ID}";
        break;
      case "input-text-cybozu input-number-cybozu":
        /* レコード編集・追加画面で数値系入力フィールドに付与されたIDの正規化 */
        node.attributes.id = "$${INPUT_NUMBER_CYBOZU_ID}";
        break;
      case "input-time-text-cybozu":
        /* レコード編集・追加画面で「日付」・「時刻」・「日時」フィールドに付与されたIDの正規化 */
        node.attributes.id = "$${INPUT_TIME_TEXT_CYBOZU_ID}";
        break;
      case "input-text-cybozu input-link-cybozu":
        /* レコード編集・追加画面で「リンク」フィールドに付与されたIDの正規化 */
        node.attributes.id = "$${INPUT_LINK_CYBOZU}";
    }

    const type = node.attributes.type;
    if (type === "hidden") {
      if (
        node.attributes.name === "app" &&
        node.attributes.value !== undefined &&
        (Number(node.attributes.value) === this.mainAppID ||
          Number(node.attributes.value) === this.subAppID)
      ) {
        node.attributes.value = "$${APP_ID}";
      }
    } else if (type === "radio" || type === "checkbox") {
      /* 「ラジオボタン」、「チェックボックス」フィールドのname, idを正規化  */
      if (node.attributes.name !== undefined) {
        node.attributes.name = "$${RADIO_CHECKBOX_NAME}";
      }
      if (node.attributes.id !== undefined) {
        node.attributes.id = "{RADIO_CHECKBOX_ID}";
      }
    }
    return true;
  }

  private visitLabel(node: ElementNodeType): boolean {
    /* 「ラジオボタン」、「チェックボックス」フィールドに付与されたlabel elementのforを正規化  */
    if (node.attributes !== undefined && "for" in node.attributes) {
      node.attributes.for = "$${LABEL_FOR_ID}";
    }
    return true;
  }

  private visitTextarea(node: ElementNodeType): boolean {
    if (node.attributes === undefined) {
      return true;
    }

    /* 文字列（複数行）フィールドに付与されたid, nameを正規化。 */
    const id = node.attributes.id;
    if (id !== undefined && id.match(/^[1-9][0-9]*_[0-9]+-textarea/)) {
      node.attributes.id = id.replace(/^[1-9][0-9]*/, "$${TEXTAREA_ID}");
    }
    const name = node.attributes.name;
    if (name !== undefined && name.match(/^[1-9][0-9]*_[0-9]+/)) {
      node.attributes.name = name.replace(/^[1-9][0-9]*/, "$${TEXTAREA_NAME}");
    }
    return true;
  }

  private visitScript(node: ElementNodeType): boolean {
    if (this.ignoresScriptElementContents) {
      /* <script>の中身を見ない場合、childNodesをundefinedで正規化 */
      node.childNodes = undefined;
    }

    if (node.attributes === undefined) {
      return true;
    }
    const srcFilePath = node.attributes.src;
    if (srcFilePath === undefined) {
      /* do nothing */
    } else if (srcFilePath.startsWith("https://static.cybozu.com/k/kintone_")) {
      node.attributes.src = srcFilePath.replace(
        KintoneValuesNormalizer.KINTONE_VERSION_REGEX,
        "$${KINTONE_VERSION}"
      );
    }
    return true;
  }
}
