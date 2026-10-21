import { useState, useEffect, useCallback } from 'react';
import { supabase, type Todo, type Priority } from '@/lib/supabase';
import { Plus, Search, Calendar, Check, Edit2, Trash2, X, AlertTriangle, ClipboardList } from 'lucide-react';

const priorityColors: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-sky-300',
};

const priorityLabels: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

type FilterTab = 'all' | 'incomplete' | 'completed';
type SortKey = 'due_date' | 'created_at';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('データの取得に失敗しました', error);
      return;
    }
    setTodos(data as Todo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleToggleComplete = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id);
    if (error) {
      console.error('更新に失敗しました', error);
      return;
    }
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );
    if (!todo.completed) {
      setBouncingId(todo.id);
      setTimeout(() => setBouncingId(null), 400);
    }
  };

  const [bouncingId, setBouncingId] = useState<string | null>(null);

  const handleSave = async (data: { title: string; description: string; due_date: string | null; priority: Priority }) => {
    if (editingTodo) {
      const { error } = await supabase
        .from('todos')
        .update({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
        })
        .eq('id', editingTodo.id);
      if (error) {
        console.error('更新に失敗しました', error);
        return;
      }
      setTodos((prev) =>
        prev.map((t) =>
          t.id === editingTodo.id
            ? { ...t, title: data.title, description: data.description || null, due_date: data.due_date || null, priority: data.priority }
            : t
        )
      );
    } else {
      const { data: newTodo, error } = await supabase
        .from('todos')
        .insert({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
        })
        .select()
        .single();
      if (error) {
        console.error('追加に失敗しました', error);
        return;
      }
      setTodos((prev) => [newTodo as Todo, ...prev]);
    }
    setModalOpen(false);
    setEditingTodo(null);
  };

  const handleDelete = async (todo: Todo) => {
    setRemovingId(todo.id);
    setTimeout(async () => {
      const { error } = await supabase.from('todos').delete().eq('id', todo.id);
      if (error) {
        console.error('削除に失敗しました', error);
        setRemovingId(null);
        return;
      }
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      setRemovingId(null);
    }, 250);
    setDeleteTarget(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const getDueStatus = (dueDate: string | null, completed: boolean): 'overdue' | 'soon' | 'none' => {
    if (!dueDate || completed) return 'none';
    if (dueDate < todayStr) return 'overdue';
    if (dueDate === todayStr || dueDate === tomorrowStr) return 'soon';
    return 'none';
  };

  const totalCount = todos.length;
  const incompleteCount = todos.filter((t) => !t.completed).length;
  const overdueCount = todos.filter((t) => !t.completed && t.due_date && t.due_date < todayStr).length;

  const filtered = todos
    .filter((t) => {
      if (filter === 'incomplete') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'due_date') {
        const aDate = a.due_date || '9999-12-31';
        const bDate = b.due_date || '9999-12-31';
        return aDate.localeCompare(bDate);
      }
      return b.created_at.localeCompare(a.created_at);
    });

  const openNewModal = () => {
    setEditingTodo(null);
    setModalOpen(true);
  };

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* ヘッダー */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Todoリスト</h1>
          <p className="text-slate-500 text-sm">日々のタスクを整理しましょう</p>
        </header>

        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-3 py-4 sm:px-5">
            <p className="text-2xl sm:text-3xl font-bold text-slate-700">{totalCount}</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">全件数</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-3 py-4 sm:px-5">
            <p className="text-2xl sm:text-3xl font-bold text-sky-500">{incompleteCount}</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">未完了</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-3 py-4 sm:px-5">
            <p className="text-2xl sm:text-3xl font-bold text-red-500">{overdueCount}</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">期限切れ</p>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトルで検索"
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
          />
        </div>

        {/* フィルタータブ + 並び替え */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'すべて' },
              { key: 'incomplete', label: '未完了' },
              { key: 'completed', label: '完了' },
            ] as { key: FilterTab; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  filter === tab.key
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-sky-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="created_at">作成順</option>
            <option value="due_date">期日順</option>
          </select>
        </div>

        {/* Todoリスト */}
        {loading ? (
          <div className="text-center text-slate-400 py-20">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center">
              <ClipboardList size={40} className="text-sky-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-500 mb-1">タスクはありません</p>
              <p className="text-sm text-slate-400">右下の「+」ボタンから新規追加できます</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((todo) => {
              const dueStatus = getDueStatus(todo.due_date, todo.completed);
              const isRemoving = removingId === todo.id;
              return (
                <div
                  key={todo.id}
                  className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 pl-5 transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${
                    isRemoving ? 'animate-fade-out' : 'animate-fade-in'
                  } ${dueStatus === 'overdue' ? 'border-red-200' : dueStatus === 'soon' ? 'border-orange-200' : ''}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityColors[todo.priority]}`} />
                  <div className="flex items-start gap-3">
                    {/* 完了チェック */}
                    <button
                      onClick={() => handleToggleComplete(todo)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                        todo.completed
                          ? 'bg-sky-500 border-sky-500'
                          : 'border-slate-300 hover:border-sky-400'
                      } ${bouncingId === todo.id ? 'animate-bounce-once' : ''}`}
                      aria-label="完了切り替え"
                    >
                      {todo.completed && (
                        <Check
                          size={14}
                          className={`text-white ${bouncingId === todo.id ? 'animate-check-bounce' : ''}`}
                        />
                      )}
                    </button>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-slate-800 break-words ${
                            todo.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {todo.title}
                        </h3>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(todo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-500 transition"
                            aria-label="編集"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(todo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                            aria-label="削除"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {todo.description && (
                        <p
                          className={`text-sm text-slate-500 mt-1 break-words ${
                            todo.completed ? 'line-through text-slate-300' : ''
                          }`}
                        >
                          {todo.description}
                        </p>
                      )}
                      {todo.due_date && (
                        <div
                          className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                            dueStatus === 'overdue'
                              ? 'text-red-500'
                              : dueStatus === 'soon'
                              ? 'text-orange-500'
                              : 'text-slate-400'
                          }`}
                        >
                          <Calendar size={13} />
                          <span>
                            期日: {todo.due_date}
                            {dueStatus === 'overdue' && ' (期限切れ)'}
                            {dueStatus === 'soon' && ' (まもなく)'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${priorityColors[todo.priority]}`}
                        />
                        <span className="text-xs text-slate-400">優先度: {priorityLabels[todo.priority]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新規追加ボタン（右下固定） */}
      <button
        onClick={openNewModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg shadow-sky-200 flex items-center justify-center hover:bg-sky-600 hover:scale-110 active:scale-95 transition-all z-30"
        aria-label="新規追加"
      >
        <Plus size={26} />
      </button>

      {/* 編集・追加モーダル */}
      {modalOpen && (
        <TodoModal
          todo={editingTodo}
          onClose={() => {
            setModalOpen(false);
            setEditingTodo(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="font-bold text-slate-800">削除しますか？</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              「{deleteTarget.title}」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodoModal({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; due_date: string | null; priority: Priority }) => void;
}) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [dueDate, setDueDate] = useState(todo?.due_date ?? '');
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'medium');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), due_date: dueDate || null, priority });
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800">{todo ? 'Todoを編集' : '新規Todo追加'}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              タイトル <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="タスクのタイトル"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">内容</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細内容（任意）"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">期日</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">優先度</label>
            <div className="flex gap-2">
              {([
                { key: 'high', label: '高', color: 'bg-red-400', ring: 'ring-red-300' },
                { key: 'medium', label: '中', color: 'bg-amber-400', ring: 'ring-amber-300' },
                { key: 'low', label: '低', color: 'bg-sky-300', ring: 'ring-sky-300' },
              ] as { key: Priority; label: string; color: string; ring: string }[]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                    priority === p.key
                      ? `border-transparent bg-slate-50 ring-2 ${p.ring} text-slate-700`
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 shadow-sm transition"
          >
            {todo ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
