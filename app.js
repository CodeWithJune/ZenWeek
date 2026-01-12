// ZenWeek app.js — modern ES6+
const STORAGE_KEY = 'zenweek_tasks_v1';
const EXPANDED_KEY = 'zenweek_expanded_v1';
let memoryFallback = {};
let expandedMemoryFallback = {};
let storageAvailable = true;

const QUOTES = [
  "Well done — small wins build momentum.",
  "Nice work! One step at a time.",
  "You're creating good focus habits — keep it up.",
  "Progress, not perfection.",
  "Calm persistence beats rushed chaos.",
  "Small, consistent steps lead to big change."
];

// Helpers
const $ = sel => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k,v]) => node.setAttribute(k, v));
  children.forEach(c => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
};

const formatYYYY = d => d.toISOString().slice(0,10);
const getMonday = d => {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
};

function isLocalStorageWorking(){
  try{
    if(typeof localStorage === 'undefined') return false;
    const testKey = '__zenweek_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  }catch(e){
    console.warn('localStorage not available', e);
    return false;
  }
}

function loadData(){
  if(!isLocalStorageWorking()){
    storageAvailable = false;
    return memoryFallback;
  }
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {};
    return JSON.parse(raw) || {};
  }catch(e){
    console.error('Failed to load from localStorage',e);
    storageAvailable = false;
    showToast('Local storage unavailable — using temporary memory.', 3000);
    return memoryFallback;
  }
}

function saveData(data){
  if(!storageAvailable || !isLocalStorageWorking()){
    storageAvailable = false;
    memoryFallback = data;
    showToast('Could not save to local storage; data will not persist across sessions.', 3000);
    return;
  }
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }catch(e){
    console.error('Failed to save to localStorage', e);
    storageAvailable = false;
    memoryFallback = data;
    showToast('Saving failed (quota or permission); data saved only in memory.', 3000);
  }
}

// expand/collapse state persistence
function loadExpandedState(){
  if(!isLocalStorageWorking()) return expandedMemoryFallback;
  try{
    const raw = localStorage.getItem(EXPANDED_KEY);
    if(!raw) return {};
    return JSON.parse(raw) || {};
  }catch(e){
    console.warn('Failed to load expanded state', e);
    expandedMemoryFallback = {};
    return expandedMemoryFallback;
  }
}

function saveExpandedState(state){
  if(!isLocalStorageWorking()){
    expandedMemoryFallback = state;
    return;
  }
  try{
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(state));
  }catch(e){
    console.warn('Failed to save expanded state', e);
    expandedMemoryFallback = state;
  }
}

// App state
let data = loadData(); // { 'YYYY-MM-DD': [{id,text,completed,createdAt}, ...] }
let weekStart = getMonday(new Date());
let expandedState = loadExpandedState();

// UI helpers
function showToast(message, duration = 2500){
  const t = $('#toast');
  t.textContent = message;
  t.classList.remove('hide');
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    t.classList.add('hide');
    setTimeout(()=>{ t.classList.remove('hide'); t.style.display = 'none'; }, 200);
  }, duration);
  t.style.display = 'block';
}

// Render
function weekDates(start){
  const arr = [];
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(d.getDate()+i);
    arr.push(d);
  }
  return arr;
}

function renderWeek(){
  const grid = $('#week-grid');
  grid.innerHTML = '';
  const dates = weekDates(weekStart);
  const rangeText = `${dates[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} — ${dates[6].toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
  $('#week-range').textContent = rangeText;

  // ensure accordion rule: by default only one day is expanded in this week (unless all are intentionally expanded)
  const dateKeys = dates.map(d => formatYYYY(d));
  const trueKeys = dateKeys.filter(k => expandedState[k]);
  if(trueKeys.length > 1 && trueKeys.length < dateKeys.length){
    const todayKey = formatYYYY(new Date());
    const preferred = dateKeys.includes(todayKey) && expandedState[todayKey] ? todayKey : trueKeys[0];
    dateKeys.forEach(k => { expandedState[k] = (k === preferred); });
    saveExpandedState(expandedState);
  }

  // show a subtle empty prompt if there are no tasks in the current week
  const totalInWeek = dates.reduce((acc,d) => acc + ((data[formatYYYY(d)] || []).length), 0);
  if(totalInWeek === 0){
    const info = el('div',{class:'day-card'},
      el('div',{class:'day-head'}, el('div',{class:'day-name'}, 'No tasks yet')),
      el('div',{class:'date'}, 'Add up to 3 tasks per day to begin your focused week.')
    );
    grid.appendChild(info);
  }

  dates.forEach(d => {
    const dateKey = formatYYYY(d);
    const tasks = data[dateKey] || [];
    const card = el('section',{class:'day-card', 'data-date':dateKey, role:'region', 'aria-labelledby':`day-${dateKey}`});

    const head = el('div',{class:'day-head'},
      el('div',{class:'day-name', id:`day-${dateKey}`}, d.toLocaleDateString(undefined,{weekday:'short'})),
      el('div',{class:'date'}, d.toLocaleDateString(undefined,{month:'short',day:'numeric'}))
    );

    if(tasks.length >= 3) card.classList.add('limit-reached');

    const list = el('div',{class:'task-list'});
    tasks.forEach(task => {
      const t = el('div',{class:`task ${task.completed ? 'completed' : ''}`},
        el('div',{class:'text'}, task.text),
        el('div',{class:'meta'},
          (function(){
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'meta-toggle';
            btn.innerText = task.completed ? 'Undo' : 'Done';
            btn.setAttribute('aria-label', task.completed ? 'Mark as not completed' : 'Mark as completed');
            btn.addEventListener('click', () => toggleComplete(dateKey, task.id));
            return btn;
          })(),
          (function(){
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'meta-del';
            del.innerText = '✕';
            del.setAttribute('aria-label', 'Delete task');
            del.addEventListener('click', () => deleteTask(dateKey, task.id));
            return del;
          })()
        )
      );
      list.appendChild(t);
    });

    const controls = el('div',{class:'controls-row'});
    const input = document.createElement('input');
    input.className = 'add-input';
    input.placeholder = 'Add a focused task...';
    input.maxLength = 120;
    input.setAttribute('aria-label', `Add task for ${d.toLocaleDateString()}`);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-btn';
    addBtn.innerText = 'Add';
    addBtn.setAttribute('aria-label', `Add task for ${d.toLocaleDateString()}`);
    addBtn.disabled = tasks.length >= 3;

    addBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if(!text) { showToast('Enter a short task to add.'); return; }
      addTask(dateKey, text);
      input.value = '';
      input.focus();
    });

    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') addBtn.click(); });

    const badge = el('div',{class:'limit-badge', 'aria-hidden':'true', 'data-count': String(tasks.length)}, `${tasks.length}/3`);

    controls.appendChild(input);
    controls.appendChild(addBtn);
    controls.appendChild(badge);

    // content wrapper that will collapse/expand
    const content = el('div',{class:'collapsible'});
    const warn = tasks.length >=3 ? el('div',{class:'warning-msg'}, 'Limit reached (3 tasks). Prioritize or delete one.') : null;
    content.appendChild(list);
    content.appendChild(controls);
    if(warn) content.appendChild(warn);

    // default: expand according to saved state or today's date
    const isToday = dateKey === formatYYYY(new Date());
    const saved = expandedState[dateKey];
    const shouldExpand = typeof saved === 'boolean' ? saved : isToday;
    if(shouldExpand) card.classList.add('expanded');

    card.appendChild(head);
    card.appendChild(content);

    // accessibility & interaction: clicking or key toggles expand/collapse and persist
    head.tabIndex = 0;
    head.setAttribute('role','button');
    head.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
    head.addEventListener('click', () => {
      const wasExpanded = card.classList.contains('expanded');
      const datesInWeek = weekDates(weekStart).map(d => formatYYYY(d));
      if(!wasExpanded){
        // accordion behavior: collapse others, expand this one
        datesInWeek.forEach(k => { expandedState[k] = false; });
        expandedState[dateKey] = true;
      } else {
        // collapse this one
        expandedState[dateKey] = false;
      }
      saveExpandedState(expandedState);
      renderWeek();
    });
    head.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); } });

    grid.appendChild(card);
  });

  updateProgress();

  // render floating expand/collapse controls
  renderExpandControls();
}

function addTask(dateKey, text){
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  if(!data[dateKey]) data[dateKey] = [];
  if(data[dateKey].length >= 3){
    showToast('Daily limit reached (3).');
    return;
  }
  data[dateKey].push({id, text, completed:false, createdAt:Date.now()});
  saveData(data);
  renderWeek();
}

function toggleComplete(dateKey, id){
  const tasks = data[dateKey] || [];
  const t = tasks.find(x => x.id === id);
  if(!t) return;
  t.completed = !t.completed;
  saveData(data);
  renderWeek();
  if(t.completed){
    showMotivationalQuote();
    checkDailyComplete(dateKey);
  }
}

function deleteTask(dateKey, id){
  if(!data[dateKey]) return;
  data[dateKey] = data[dateKey].filter(x => x.id !== id);
  if(data[dateKey].length === 0) delete data[dateKey];
  saveData(data);
  renderWeek();
}

function checkDailyComplete(dateKey){
  const tasks = data[dateKey] || [];
  if(tasks.length > 0 && tasks.every(t => t.completed)){
    const d = new Date(dateKey);
    const dayName = d.toLocaleDateString(undefined,{weekday:'long'});
    showToast(`All done on ${dayName}! Great job 🎉`, 3600);
  }
}

// Expand/collapse helpers (accordion + expand all / collapse all)
function expandAll(){
  const dates = weekDates(weekStart).map(d => formatYYYY(d));
  dates.forEach(k => expandedState[k] = true);
  saveExpandedState(expandedState);
  renderWeek();
}

function collapseAll(){
  const dates = weekDates(weekStart).map(d => formatYYYY(d));
  dates.forEach(k => expandedState[k] = false);
  saveExpandedState(expandedState);
  renderWeek();
}

function renderExpandControls(){
  if(document.querySelector('.fab-controls')) return; // already rendered
  const container = document.createElement('div');
  container.className = 'fab-controls';
  container.setAttribute('aria-hidden','false');

  const expandBtn = document.createElement('button');
  expandBtn.className = 'fab-btn fab-expand';
  expandBtn.title = 'Expand all';
  expandBtn.setAttribute('aria-label','Expand all days');
  expandBtn.innerHTML = '⇪';
  expandBtn.addEventListener('click', (e) => { e.stopPropagation(); expandAll(); });

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'fab-btn fab-collapse';
  collapseBtn.title = 'Collapse all';
  collapseBtn.setAttribute('aria-label','Collapse all days');
  collapseBtn.innerHTML = '⇩';
  collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); collapseAll(); });

  container.appendChild(expandBtn);
  container.appendChild(collapseBtn);
  document.body.appendChild(container);
}

function updateProgress(){
  const allTasks = Object.values(data).flat();
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  $('#progress-fill').style.width = `${percent}%`;
  $('#progress-percent').textContent = `${percent}%`;
}

function showMotivationalQuote(extra){
  const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  showToast(extra ? `${q} ${extra}` : q, 2600);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderWeek();
});

// Expose for debugging
window.ZenWeek = { data, saveData, loadData, addTask };
