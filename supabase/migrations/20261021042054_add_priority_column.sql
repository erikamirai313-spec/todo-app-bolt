/*
# Add priority column to todos

1. 変更内容
- `todos` テーブルに `priority` カラムを追加。
  - 型: text, デフォルト 'medium'
  - 許容値: 'high', 'medium', 'low'
  - CHECK 制約で値を制限

2. セキュリティ
- RLS ポリシーの変更なし（既存の CRUD ポリシーがそのまま適用される）。

3. 注意
- 既存レコードはデフォルト値 'medium' が適用される。
- 破壊的変更なし（カラム追加のみ）。
*/

ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'todos_priority_check'
  ) THEN
    ALTER TABLE todos ADD CONSTRAINT todos_priority_check
      CHECK (priority IN ('high', 'medium', 'low'));
  END IF;
END $$;
