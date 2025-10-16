
const DATA_URL = 'data/sample-data.json';

async function loadData() {
  try {
    const res = await fetch(DATA_URL, {cache:'no-store'});
    if (!res.ok) throw new Error('Failed to load data');
    return await res.json();
  } catch (e) {
    console.error(e);
    return { tasks:[], writing:[], content:[], goals:[], projects:[], health:[] };
  }
}

function formatDate(d){
  if(!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('he-IL');
}

function calcKPIs({tasks, writing, content, goals}){
  const done = tasks.filter(t=> (t.status||'').toLowerCase()==='done').length;
  const open = tasks.length - done;
  const wordsToday = writing.reduce((s,w)=>s+(+w.wordsToday||0),0);
  const goalWords = goals.filter(g=> (g.metric||'').toLowerCase()==='words').reduce((s,g)=>s+(+g.target||0),0);
  const scheduledPosts = content.filter(c=> c.plannedDate && c.plannedDate.trim()!=='').length;
  const actualWords = writing.reduce((s,w)=>s+(+w.cumulativeWords||0),0);
  const goalPosts = goals.filter(g=> (g.metric||'').toLowerCase()==='posts').reduce((s,g)=>s+(+g.target||0),0);
  return {openTasks:open, doneTasks:done, wordsToday, goalWords, scheduledPosts, actualWords, goalPosts};
}

function renderKPIs(kpis){
  document.querySelectorAll('[data-kpi]').forEach(el=>{
    const key = el.getAttribute('data-kpi');
    el.textContent = (kpis[key] ?? '—').toLocaleString('he-IL');
  });
}

function renderTable(id, rows, cols){
  const tbody = document.querySelector('#'+id+' tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r=>'<tr>'+cols.map(c=>'<td>'+ (c.render? c.render(r): (r[c.key]??'')) +'</td>').join('') + '</tr>').join('');
}

function applyTaskFilters(data){
  const buttons = document.querySelectorAll('.filters [data-filter]');
  const tbody = document.querySelector('#tasksTable tbody');
  if (!buttons.length || !tbody) return;

  function computeUrgency(due){
    if (!due) return '';
    const dd = new Date(due); const today = new Date(); today.setHours(0,0,0,0);
    const dt = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());
    if (dt < today) return 'Overdue';
    if (+dt === +today) return 'Today';
    const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate()+7);
    if (dt <= weekAhead) return 'This Week';
    return 'Later';
  }

  function draw(filter){
    const rows = data.tasks.map(t=>({...t, urgency: computeUrgency(t.due)})).filter(t=>{
      if (filter==='today') return t.urgency==='Today';
      if (filter==='week') return t.urgency==='This Week';
      if (filter==='overdue') return t.urgency==='Overdue';
      return true;
    });
    renderTable('tasksTable', rows, [
      {key:'task'}, {key:'project'}, {key:'priority'}, {key:'status'},
      {key:'due', render: r=> formatDate(r.due) }, {key:'urgency'}
    ]);
  }

  buttons.forEach(b=> b.addEventListener('click', ()=> draw(b.dataset.filter)));
  draw('all');
}

(async function init(){
  const data = await loadData();
  const kpis = calcKPIs(data);
  renderKPIs(kpis);

  renderTable('writingTable', data.writing, [
    {key:'project'}, {key:'piece'}, {key:'goalWords'}, {key:'wordsToday'}, {key:'cumulativeWords'}, {key:'status'}
  ]);
  renderTable('contentTable', data.content, [
    {key:'platform'}, {key:'title'}, {key:'plannedDate', render:r=>formatDate(r.plannedDate)}, {key:'status'}
  ]);
  renderTable('projectsTable', data.projects, [
    {key:'project'}, {key:'stage'}, {key:'milestone'}, {key:'due', render:r=>formatDate(r.due)}, {key:'risk'}
  ]);
  renderTable('healthTable', data.health, [
    {key:'date', render:r=>formatDate(r.date)}, {key:'sleep'}, {key:'energy'}, {key:'practice'}, {key:'notes'}
  ]);

  applyTaskFilters(data);
})();
