const API_BASE = '/api/tasks';

const form = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const dueDateInput = document.getElementById('dueDate');
const priorityInput = document.getElementById('priority');
const statusInput = document.getElementById('status');
const categoryInput = document.getElementById('category');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');

const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');
const filterCategory = document.getElementById('filter-category');
const sortBy = document.getElementById('sort-by');

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');

let debounceTimer = null;

function buildQuery() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (filterStatus.value) params.set('status', filterStatus.value);
  if (filterPriority.value) params.set('priority', filterPriority.value);
  if (filterCategory.value.trim()) params.set('category', filterCategory.value.trim());
  if (sortBy.value) params.set('sortBy', sortBy.value);
  return params.toString();
}

async function fetchTasks() {
  const res = await fetch(`${API_BASE}?${buildQuery()}`);
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr, status) {
  if (!dateStr || status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (!tasks.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const task of tasks) {
    const item = document.createElement('div');
    item.className = `task-item${task.status === 'done' ? ' done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.status === 'done';
    checkbox.title = 'Mark done';
    checkbox.addEventListener('change', () => toggleDone(task, checkbox.checked));

    const main = document.createElement('div');
    main.className = 'task-main';

    const titleRow = document.createElement('div');
    titleRow.className = 'task-title-row';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    titleRow.appendChild(title);

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge priority-${task.priority}`;
    priorityBadge.textContent = task.priority;
    titleRow.appendChild(priorityBadge);

    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge status';
    statusBadge.textContent = task.status;
    titleRow.appendChild(statusBadge);

    if (task.category) {
      const catBadge = document.createElement('span');
      catBadge.className = 'badge category';
      catBadge.textContent = task.category;
      titleRow.appendChild(catBadge);
    }

    main.appendChild(titleRow);

    if (task.description) {
      const desc = document.createElement('p');
      desc.className = 'task-description';
      desc.textContent = task.description;
      main.appendChild(desc);
    }

    if (task.dueDate) {
      const meta = document.createElement('div');
      meta.className = 'task-meta';
      const dueSpan = document.createElement('span');
      const overdue = isOverdue(task.dueDate, task.status);
      dueSpan.className = overdue ? 'overdue' : '';
      dueSpan.textContent = `${overdue ? 'Overdue: ' : 'Due '}${formatDate(task.dueDate)}`;
      meta.appendChild(dueSpan);
      main.appendChild(meta);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(task));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(checkbox);
    item.appendChild(main);
    item.appendChild(actions);

    taskList.appendChild(item);
  }
}

async function loadAndRender() {
  try {
    const tasks = await fetchTasks();
    renderTasks(tasks);
  } catch (err) {
    console.error(err);
    taskList.innerHTML = '<p class="empty-state">Could not load tasks. Is the server running?</p>';
  }
}

function resetForm() {
  form.reset();
  taskIdInput.value = '';
  priorityInput.value = 'medium';
  statusInput.value = 'todo';
  submitBtn.textContent = 'Add Task';
  cancelEditBtn.classList.add('hidden');
}

function startEdit(task) {
  taskIdInput.value = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description || '';
  dueDateInput.value = task.dueDate || '';
  priorityInput.value = task.priority;
  statusInput.value = task.status;
  categoryInput.value = task.category || '';
  submitBtn.textContent = 'Save Changes';
  cancelEditBtn.classList.remove('hidden');
  titleInput.focus();
}

async function toggleDone(task, checked) {
  const newStatus = checked ? 'done' : 'todo';
  await fetch(`${API_BASE}/${task.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  loadAndRender();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  loadAndRender();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    title: titleInput.value,
    description: descriptionInput.value,
    dueDate: dueDateInput.value || null,
    priority: priorityInput.value,
    status: statusInput.value,
    category: categoryInput.value,
  };

  const id = taskIdInput.value;
  const url = id ? `${API_BASE}/${id}` : API_BASE;
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    alert((body.errors || [body.error || 'Something went wrong']).join('\n'));
    return;
  }

  resetForm();
  loadAndRender();
});

cancelEditBtn.addEventListener('click', resetForm);

[searchInput].forEach((el) =>
  el.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadAndRender, 250);
  })
);

[filterStatus, filterPriority, filterCategory, sortBy].forEach((el) =>
  el.addEventListener('change', loadAndRender)
);
filterCategory.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadAndRender, 250);
});

loadAndRender();
