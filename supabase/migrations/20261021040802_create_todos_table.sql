/*
# Create todos table (single-tenant, no auth)

1. 新規テーブル
- `todos`
  - `id` (uuid, 主キー)
  - `title` (text, 必須) — Todoのタイトル
  - `description` (text, 任意) — Todoの詳細内容
  - `due_date` (date, 任意) — 期日
  - `completed` (boolean, デフォルトfalse) — 完了フラグ
  - `created_at` (timestamptz, デフォルトnow()) — 作成日時

2. セキュリティ
- `todos` テーブルで RLS を有効化。
- ログイン画面なしのシングルテナントアプリのため、anon + authenticated の両ロールに CRUD を許可。
*/

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_todos" ON todos;
CREATE POLICY "anon_select_todos" ON todos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_todos" ON todos;
CREATE POLICY "anon_insert_todos" ON todos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_todos" ON todos;
CREATE POLICY "anon_update_todos" ON todos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_todos" ON todos;
CREATE POLICY "anon_delete_todos" ON todos FOR DELETE
  TO anon, authenticated USING (true);
