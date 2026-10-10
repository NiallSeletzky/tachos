'use strict';
const $ = id => document.getElementById(id);
let current = null;
const status = message => { $('status').textContent = message; };
const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const button = (label, fn, cls) => { const el = node('button', label, cls); el.addEventListener('click', fn); return el; };

async function api(path, method='GET', payload) {
  const headers = {'Authorization': 'Bearer ' + $('token').value.trim()};
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {method, headers, body: payload === undefined ? undefined : JSON.stringify(payload), cache: 'no-store'});
  let result;
  try { result = await response.json(); } catch { throw new Error('Unexpected response'); }
  if (!response.ok) throw new Error(result.message || result.error || 'Request failed');
  return result;
}

async function run(fn) { try { await fn(); } catch (err) { status('Action blocked: ' + err.message); } }
function projectPath() { return '/api/projects/' + encodeURIComponent($('projectId').value.trim()); }

async function refresh() {
  if (!$('projectId').value.trim()) { status('Create a fictional project or enter a project ID.'); return; }
  current = await api(projectPath());
  render();
  status('Connected as ' + current.role + ' · ' + current.project.name + ' · saved state loaded');
}

function render() {
  const p = current.project;
  $('projectTitle').textContent = p.name;
  $('projectMeta').textContent = p.site_alias + ' · ' + p.project_type.replace('_', ' ') + ' · ' + p.classification + ' · Definition ' + p.definition_version;
  const accepted = current.stages.filter(s => s.state === 'ACCEPTED').length;
  $('progress').replaceChildren(document.createTextNode(String(accepted).padStart(2,'0')), (()=>{const span=node('span','/11');return span;})());
  const stageList = $('stages'); stageList.replaceChildren();
  current.stages.forEach(s => {
    const li = node('li');
    li.append(node('span', s.stage_id, 'stage-id'), node('span', s.title, 'stage-name'), node('span', s.state === 'ACCEPTED' ? 'ACCEPTED' : s.enabled_for_demo ? s.state : 'LOCKED', 'badge' + (s.state === 'ACCEPTED' ? ' accepted' : '')));
    stageList.append(li);
  });
  const taskList = $('tasks'); taskList.replaceChildren();
  current.tasks.filter(t=>t.stage_id==='S00').forEach(t=>{
    const card = node('article', undefined, 'task');
    const title = node('h4', t.title);
    card.append(node('span',t.task_id,'task-id'), title, node('p',t.action));
    const controls = node('div',undefined,'task-controls');
    controls.append(node('span',t.state,'badge' + (t.state === 'ACCEPTED' ? ' accepted' : '')));
    if (t.state === 'DRAFT' || t.state === 'REWORK') {
      const field = node('input'); field.type='text'; field.setAttribute('aria-label','Synthetic evidence reference for '+t.task_id);
      field.value = 'demo://' + p.id + '/' + t.task_id + '/sample-evidence';
      controls.append(field, button('Submit for review',()=>run(async()=>{
        await api(projectPath()+'/tasks/'+t.task_id+'/submit','POST',{evidence_ref:field.value,expected_revision:t.revision});
        await refresh();
      })));
    }
    if (t.state === 'AWAITING_REVIEW') {
      controls.append(button('Accept evidence',()=>run(async()=>{
        await api(projectPath()+'/tasks/'+t.task_id+'/review','POST',{decision:'ACCEPTED',expected_revision:t.revision});await refresh();
      })),button('Return for rework',()=>run(async()=>{
        await api(projectPath()+'/tasks/'+t.task_id+'/review','POST',{decision:'REWORK',expected_revision:t.revision});await refresh();
      }),'secondary'));
    }
    if (t.reviewed_by) card.append(node('p','Reviewed by: '+t.reviewed_by));
    card.append(controls);taskList.append(card);
  });
  const approvals = $('gateApprovals'); approvals.replaceChildren();
  for (const role of ['sponsor','security']) {
    const a = current.approvals.find(a=>a.stage_id==='S00' && a.role===role);
    approvals.append(node('span',role.toUpperCase() + ': ' + (a ? 'APPROVED BY ' + a.actor : 'PENDING'), 'badge' + (a ? ' accepted' : '')));
  }
  const stage = current.stages.find(s=>s.stage_id==='S00');
  $('approve').disabled = stage.state === 'ACCEPTED';
}

$('create').addEventListener('click',()=>run(async()=>{
  const result = await api('/api/projects','POST',{
    name:$('name').value,site_alias:$('alias').value,scope:$('scope').value,
    project_type:'retrofit',classification:'SYNTHETIC_DEMO'});
  $('projectId').value = result.project_id;
  await refresh();
}));
$('load').addEventListener('click',()=>run(refresh));
$('connect').addEventListener('click',()=>run(refresh));
$('approve').addEventListener('click',()=>run(async()=>{
  if (!current) throw new Error('No project loaded');
  const stage = current.stages.find(s=>s.stage_id==='S00');
  await api(projectPath()+'/stages/S00/approve','POST',{expected_revision:stage.revision});
  await refresh();
}));
$('audit').addEventListener('click',()=>run(async()=>{
  const r = await api(projectPath()+'/audit');
  $('auditResult').hidden=false;
  $('auditResult').textContent=JSON.stringify(r.events,null,2);
}));
(async()=>{try{const d=await api('/api/definition');status('Loaded '+d.stages.length+' stages. Enter a demo token to begin.');}catch(e){status(e.message);}})();
