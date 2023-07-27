export const HASH_TEXT = "#text";
export const HASH_COMMENT = "#comment";

export interface NodeType {
  nodeName: string;
  childNodes?: NodeType[]; // eslint-disable-line no-use-before-define
}

interface Attributes {
  [attributeName: string]: string;
}

export interface ElementNodeType extends NodeType {
  nodeName: string;
  attributes?: Attributes;
  checked?: boolean;
  value?: string | number;
  selected?: boolean;
}

export interface TextNodeType extends NodeType {
  nodeName: typeof HASH_TEXT | typeof HASH_COMMENT;
  data: string;
  childNodes?: never;
}

const DOM_DIFF_MODIFY_ACTIONS = [
  "modifyAttribute",
  "modifyTextElement",
  "replaceElement",
  "modifyValue",
  "modifyChecked",
  "modifySelected",
  "modifyComment",
] as const;

const DOM_DIFF_ACTIONS = [
  "addAttribute",
  "removeAttribute",
  "addTextElement",
  "removeTextElement",
  "addElement",
  "removeElement",
  "relocateGroup",
] as const;

type DomDiffModifyAction = (typeof DOM_DIFF_MODIFY_ACTIONS)[number];
type DomDiffAction = (typeof DOM_DIFF_ACTIONS)[number];

export declare class Diff {
  // constructor(options?: {});
  toString(): string;
  setValue(
    aKey: string | number,
    aValue:
      | string
      | number
      | boolean
      | number[]
      | {
          [key: string]:
            | string
            | {
                [key: string]: string;
              };
        }
      | ElementNodeType
  ): this;
}

interface ModifiedDiff extends Diff {
  action: DomDiffModifyAction | DomDiffAction;
}

interface ModifyDiff extends ModifiedDiff {
  action: "modifyAttribute";
  name?: string;
  oldValue: string;
  newValue: string;
}

interface ModifyElementNodeDiff extends ModifiedDiff {
  action: "replaceElement" | "modifyTextElement";
  oldValue: ElementNodeType;
  newValue: ElementNodeType;
}

interface AddOrRemoveDiff extends ModifiedDiff {
  action: DomDiffAction;
  name?: string;
  value?: string;
  element?: TextNodeType | ElementNodeType;
}

export class IndentConfig {
  private readonly _offset: number;
  private readonly _size: number;
  constructor(offset = 0, size = 0) {
    this._offset = offset;
    this._size = size;
  }

  public get offset(): number {
    return this._offset;
  }

  public get size(): number {
    return this._size;
  }

  public toString(): string {
    return " ".repeat(this._offset);
  }
}

function attributesToHTMLCode(
  attributes: Attributes,
  prefix = "",
  indent: IndentConfig = new IndentConfig(0, 0)
): string {
  return Object.entries(attributes).reduce(
    (htmlCode: string, [attributeNames, value]: readonly [string, string]) =>
      `${htmlCode}\n${prefix}${indent.toString()}${attributeNames}="${value}"`,
    ""
  );
}

function toHTMLCode(
  node: NodeType,
  prefix: string,
  indent: IndentConfig
): string;
function toHTMLCode(
  node: ElementNodeType,
  prefix: string,
  indent: IndentConfig
): string;
function toHTMLCode(
  node: TextNodeType,
  prefix: string,
  indent: IndentConfig
): string;

function toHTMLCode(
  node: NodeType | ElementNodeType | TextNodeType,
  prefix = "",
  indent: IndentConfig = new IndentConfig(0, 0)
): string {
  if (node.nodeName === HASH_COMMENT || node.nodeName === HASH_TEXT) {
    /* text or commentの出力 */
    const textNode = node as TextNodeType;
    /* text内部に改行が含まれている場合、改行文字の直後prefix文字列を挿入 */
    const formattedText = textNode.data.replace(/\r\n|\r|\n/g, `\n${prefix}`);
    return `${prefix}${indent.toString()}${formattedText}\n`;
  } else {
    const elementNode = node as ElementNodeType;
    let htmlCode = `${prefix}${indent.toString()}<${elementNode.nodeName.toLowerCase()}`;

    const deeperIndent = new IndentConfig(
      indent.offset + indent.size,
      indent.size
    );

    /* 属性の出力 */
    const attributes = elementNode.attributes;
    if (attributes !== undefined && Object.entries(attributes).length > 0) {
      const attributesAsString = attributesToHTMLCode(
        attributes,
        prefix,
        deeperIndent
      );
      htmlCode += `${attributesAsString}\n${prefix}${indent.toString()}>\n`;
    } else {
      /* 属性を持たない場合、タグ内部で改行しない */
      htmlCode += ">\n";
    }

    /* 子要素の出力 */
    const children = elementNode.childNodes;
    if (children !== undefined && children.length > 0) {
      const appendChildHTMLCode = (
        childHTMLCode: string,
        childNode: NodeType
      ) => childHTMLCode + toHTMLCode(childNode, prefix, deeperIndent);
      htmlCode += children.reduce(appendChildHTMLCode, "");

      htmlCode += `${prefix}${indent.toString()}</${elementNode.nodeName.toLowerCase()}>\n`;
    }
    return htmlCode;
  }
}

export function toTextDiff(
  diffs: Diff[],
  indent: IndentConfig = new IndentConfig(0, 0)
): string {
  let textDiff = "";
  diffs.forEach((item: Diff) => {
    if (!("action" in item)) {
      return;
    }
    const diff = item as ModifiedDiff;
    const action = diff.action;
    textDiff += `@@ ${action} @@\n`;
    if (action === "modifyAttribute") {
      /* 属性の値が修正された場合 */
      const modifyDiff = diff as ModifyDiff;
      if (
        modifyDiff.name !== undefined &&
        typeof modifyDiff.oldValue === "string" &&
        typeof modifyDiff.newValue === "string"
      ) {
        textDiff += `- ${modifyDiff.name}="${modifyDiff.oldValue}"\n`;
        textDiff += `+ ${modifyDiff.name}="${modifyDiff.newValue}"\n`;
      }
    } else if (action.endsWith("Attribute")) {
      /* 属性が追加・削除された場合 */
      const miscDiff = diff as AddOrRemoveDiff;
      if (miscDiff.name !== undefined && miscDiff.value !== undefined) {
        const prefix = action === "removeAttribute" ? "- " : "+ ";
        textDiff += `${prefix}${miscDiff.name}="${miscDiff.value}"\n`;
      }
    } else if (action === "modifyTextElement") {
      const modifyDiff = diff as ModifyDiff;
      if (
        typeof modifyDiff.oldValue === "string" &&
        typeof modifyDiff.newValue === "string"
      ) {
        textDiff += `- ${modifyDiff.oldValue}\n`;
        textDiff += `+ ${modifyDiff.newValue}\n`;
      }
    } else if (action.endsWith("TextElement")) {
      const miscDiff = diff as AddOrRemoveDiff;
      if (miscDiff.value !== undefined) {
        const prefix = action === "removeTextElement" ? "- " : "+ ";
        textDiff += `${prefix}${miscDiff.value}"\n`;
      }
    } else if (action === "replaceElement") {
      /* 要素が置換された場合 */
      const modifyDiff = diff as ModifyElementNodeDiff;
      textDiff += `${toHTMLCode(modifyDiff.oldValue, "- ", indent)}`;
      textDiff += toHTMLCode(modifyDiff.newValue, "+ ", indent);
    } else if (action.endsWith("Element")) {
      /* 要素が追加・削除された場合 */
      const miscDiff = diff as AddOrRemoveDiff;
      if (miscDiff.element !== undefined) {
        const prefix = action === "removeElement" ? "- " : "+ ";
        textDiff += toHTMLCode(miscDiff.element, prefix, indent);
      }
    }
  });
  return textDiff;
}
