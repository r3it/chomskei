import { KintoneRecordField } from "@kintone/rest-api-client";
interface MainAppFields {
  リッチエディター: KintoneRecordField.RichText;
  文字列__1行_: KintoneRecordField.SingleLineText;
  フィールド名を表示しない文字列_1行: KintoneRecordField.SingleLineText;
  自動計算文字列: KintoneRecordField.SingleLineText;
  ラジオボタン_縦: KintoneRecordField.RadioButton;
  文字列__複数行_: KintoneRecordField.MultiLineText;
  日付: KintoneRecordField.Date;
  ラジオボタン: KintoneRecordField.RadioButton;
  ドロップダウン: KintoneRecordField.Dropdown;
  日時: KintoneRecordField.DateTime;
  時刻: KintoneRecordField.Time;
  数値: KintoneRecordField.Number;
  リンク: KintoneRecordField.Link;
  計算: KintoneRecordField.Calc;
  日付計算: KintoneRecordField.Calc;
  チェックボックス_0: KintoneRecordField.CheckBox;
  チェックボックス: KintoneRecordField.CheckBox;
  複数選択: KintoneRecordField.MultiSelect;
  ユーザー選択: KintoneRecordField.UserSelect;
  グループ選択_複数: KintoneRecordField.GroupSelect;
  ユーザー選択_複数: KintoneRecordField.UserSelect;
  グループ選択: KintoneRecordField.GroupSelect;
  組織選択: KintoneRecordField.OrganizationSelect;
  添付ファイル: KintoneRecordField.File;
  テーブル_0: {
    type: "SUBTABLE";
    value: Array<{
      id: string;
      value: {
        ドロップダウン_0: KintoneRecordField.Dropdown;
        電話番号: KintoneRecordField.Link;
        メールアドレス: KintoneRecordField.Link;
        複数選択_0: KintoneRecordField.MultiSelect;
        チェックボックス_1: KintoneRecordField.CheckBox;
      };
    }>;
  };
}
interface MainAppSavedFields extends MainAppFields {
  $id: KintoneRecordField.ID;
  $revision: KintoneRecordField.Revision;
  更新者: KintoneRecordField.Modifier;
  作成者: KintoneRecordField.Creator;
  レコード番号: KintoneRecordField.RecordNumber;
  更新日時: KintoneRecordField.UpdatedTime;
  作成日時: KintoneRecordField.CreatedTime;
}

interface SubAppFields {
  ルックアップで習得した値: KintoneRecordField.Number;
  ルックアップ: KintoneRecordField.SingleLineText;
}
interface SubAppSavedFields extends SubAppFields {
  $id: KintoneRecordField.ID;
  $revision: KintoneRecordField.Revision;
  更新者: KintoneRecordField.Modifier;
  作成者: KintoneRecordField.Creator;
  レコード番号: KintoneRecordField.RecordNumber;
  更新日時: KintoneRecordField.UpdatedTime;
  作成日時: KintoneRecordField.CreatedTime;
}
