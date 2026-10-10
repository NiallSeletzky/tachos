"""SQLite domain store for synthetic local demonstrations only."""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .engine import load_definition


class DomainError(Exception):
    def __init__(self, code, message, http=400):
        super().__init__(message)
        self.code, self.http = code, http


def now():
    return datetime.now(timezone.utc).isoformat()


SCHEMA = '''
CREATE TABLE IF NOT EXISTS projects (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, site_alias TEXT NOT NULL,
 project_type TEXT NOT NULL, scope TEXT NOT NULL, classification TEXT NOT NULL,
 definition_version TEXT NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
 project_id TEXT NOT NULL REFERENCES projects(id), actor TEXT NOT NULL,
 role TEXT NOT NULL, PRIMARY KEY(project_id, actor)
);
CREATE TABLE IF NOT EXISTS stages (
 project_id TEXT NOT NULL REFERENCES projects(id), stage_id TEXT NOT NULL,
 state TEXT NOT NULL, revision INTEGER NOT NULL,
 PRIMARY KEY(project_id, stage_id)
);
CREATE TABLE IF NOT EXISTS tasks (
 project_id TEXT NOT NULL REFERENCES projects(id), task_id TEXT NOT NULL,
 stage_id TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL,
 submitted_by TEXT, evidence_ref TEXT, baseline_rev INTEGER,
 reviewed_by TEXT, PRIMARY KEY(project_id, task_id)
);
CREATE TABLE IF NOT EXISTS approvals (
 project_id TEXT NOT NULL REFERENCES projects(id), stage_id TEXT NOT NULL,
 role TEXT NOT NULL, actor TEXT NOT NULL, stage_revision INTEGER NOT NULL,
 PRIMARY KEY(project_id, stage_id, role)
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
 actor TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL,
 timestamp TEXT NOT NULL, details TEXT NOT NULL
);
'''


class Store:
    def __init__(self, db_path=':memory:', definition=None):
        self.definition = definition or load_definition()
        self.stages = {s['id']: s for s in self.definition['stages']}
        self.tasks = {t['id']: (s['id'], t) for s in self.definition['stages'] for t in s['tasks']}
        self.conn = sqlite3.connect(str(db_path), check_same_thread=False, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self.conn.execute('PRAGMA foreign_keys=ON')
        self.conn.executescript(SCHEMA)

    @contextmanager
    def transaction(self):
        with self.lock:
            self.conn.execute('BEGIN IMMEDIATE')
            try:
                yield
                self.conn.commit()
            except BaseException:
                self.conn.rollback()
                raise

    def row(self, sql, args=()):
        return self.conn.execute(sql, args).fetchone()

    def rows(self, sql, args=()):
        return [dict(r) for r in self.conn.execute(sql, args)]

    def audit(self, pid, actor, action, subject, details=None):
        self.conn.execute('INSERT INTO audit(project_id,actor,action,subject,timestamp,details) VALUES(?,?,?,?,?,?)',
                          (pid, actor, action, subject, now(), json.dumps(details or {})))

    def require_member(self, pid, actor):
        p = self.row('SELECT * FROM projects WHERE id=?', (pid,))
        if not p:
            raise DomainError('NOT_FOUND', 'Project not found', 404)
        member = self.row('SELECT role FROM members WHERE project_id=? AND actor=?', (pid, actor))
        if not member:
            raise DomainError('FORBIDDEN', 'No access to this project', 403)
        return member['role']

    def require_role(self, pid, actor, allowed):
        role = self.require_member(pid, actor)
        if role not in allowed:
            raise DomainError('FORBIDDEN', 'Actor lacks the required project role', 403)
        return role

    def create_project(self, actor, name, site_alias, project_type, scope, classification, actors):
        if actor != 'demo_admin':
            raise DomainError('FORBIDDEN', 'Only the demo administrator can create projects', 403)
        if not all(isinstance(v, str) and 0 < len(v.strip()) <= 300 for v in
                   (name, site_alias, project_type, scope, classification)):
            raise DomainError('INVALID', 'All intake fields are required (max 300 characters)')
        if project_type not in ('new_build', 'retrofit', 'expansion'):
            raise DomainError('INVALID', 'Unknown project type')
        if classification != 'SYNTHETIC_DEMO':
            raise DomainError('INVALID', 'Only synthetic demonstration projects are permitted')
        pid = str(uuid.uuid4())
        with self.transaction():
            self.conn.execute('INSERT INTO projects VALUES(?,?,?,?,?,?,?,?,?)',
                              (pid, name.strip(), site_alias.strip(), project_type, scope.strip(), classification,
                               self.definition['version'], 1, now()))
            for person, role in actors.items():
                self.conn.execute('INSERT INTO members VALUES(?,?,?)', (pid, person, role))
            for stage in self.definition['stages']:
                self.conn.execute('INSERT INTO stages VALUES(?,?,?,?)', (pid, stage['id'], 'DRAFT', 1))
                for task in stage['tasks']:
                    self.conn.execute('INSERT INTO tasks(project_id,task_id,stage_id,state,revision) VALUES(?,?,?,?,?)',
                                      (pid, task['id'], stage['id'], 'DRAFT', 1))
            self.audit(pid, actor, 'PROJECT_CREATED', pid, {'definition_version': self.definition['version']})
        return pid

    def overview(self, pid, actor):
        self.require_member(pid, actor)
        project = dict(self.row('SELECT * FROM projects WHERE id=?', (pid,)))
        stages = self.rows('SELECT * FROM stages WHERE project_id=? ORDER BY stage_id', (pid,))
        tasks = self.rows('SELECT * FROM tasks WHERE project_id=? ORDER BY task_id', (pid,))
        approvals = self.rows('SELECT * FROM approvals WHERE project_id=?', (pid,))
        for stage in stages:
            stage['title'] = self.stages[stage['stage_id']]['title']
            stage['depends_on'] = self.stages[stage['stage_id']]['depends_on']
            stage['enabled_for_demo'] = stage['stage_id'] == 'S00'
        for task in tasks:
            task['title'] = self.tasks[task['task_id']][1]['title']
            task['action'] = self.tasks[task['task_id']][1]['action']
        return {'project': project, 'role': self.require_member(pid, actor),
                'stages': stages, 'tasks': tasks, 'approvals': approvals}

    def _revision(self, found, expected):
        if not isinstance(expected, int) or isinstance(expected, bool) or found != expected:
            raise DomainError('CONFLICT', f'Stale revision: expected {found}, received {expected}', 409)

    def submit_task(self, pid, tid, actor, evidence_ref, expected_revision):
        self.require_role(pid, actor, {'worker'})
        if tid not in self.tasks:
            raise DomainError('NOT_FOUND', 'Unknown task', 404)
        sid = self.tasks[tid][0]
        if sid != 'S00':
            raise DomainError('NOT_IMPLEMENTED', 'Only S00 is enabled in the prototype', 501)
        if not isinstance(evidence_ref, str) or not evidence_ref.startswith(f'demo://{pid}/{tid}/') or len(evidence_ref) > 500:
            raise DomainError('EVIDENCE_SCOPE', f'{tid} requires a project-scoped synthetic evidence reference')
        with self.transaction():
            task = self.row('SELECT * FROM tasks WHERE project_id=? AND task_id=?', (pid, tid))
            self._revision(task['revision'], expected_revision)
            if task['state'] not in ('DRAFT', 'REWORK'):
                raise DomainError('STATE', f'{tid} is not editable in {task["state"]}')
            baseline = self.row('SELECT revision FROM projects WHERE id=?', (pid,))['revision']
            self.conn.execute('UPDATE tasks SET state=?,revision=revision+1,submitted_by=?,evidence_ref=?,baseline_rev=?,reviewed_by=NULL WHERE project_id=? AND task_id=?',
                              ('AWAITING_REVIEW', actor, evidence_ref, baseline, pid, tid))
            self.audit(pid, actor, 'TASK_SUBMITTED', tid, {'revision': task['revision']+1})
        return self.overview(pid, actor)

    def review_task(self, pid, tid, actor, decision, expected_revision):
        self.require_role(pid, actor, {'reviewer'})
        if decision not in ('ACCEPTED', 'REWORK'):
            raise DomainError('INVALID', 'Review decision must be ACCEPTED or REWORK')
        with self.transaction():
            task = self.row('SELECT * FROM tasks WHERE project_id=? AND task_id=?', (pid, tid))
            if not task:
                raise DomainError('NOT_FOUND', 'Task not found', 404)
            self._revision(task['revision'], expected_revision)
            if task['state'] != 'AWAITING_REVIEW':
                raise DomainError('STATE', f'{tid} is not awaiting review')
            if task['submitted_by'] == actor:
                raise DomainError('SEPARATION', 'Task author cannot review own submission', 403)
            baseline = self.row('SELECT revision FROM projects WHERE id=?', (pid,))['revision']
            if task['baseline_rev'] != baseline or not task['evidence_ref']:
                raise DomainError('STALE_EVIDENCE', 'Evidence is missing or belongs to an old baseline')
            self.conn.execute('UPDATE tasks SET state=?,revision=revision+1,reviewed_by=? WHERE project_id=? AND task_id=?',
                              (decision, actor, pid, tid))
            self.audit(pid, actor, 'TASK_REVIEWED', tid, {'decision': decision})
        return self.overview(pid, actor)

    def gate_blockers(self, pid, sid):
        if sid not in self.stages:
            raise DomainError('NOT_FOUND', 'Unknown stage', 404)
        blockers = []
        for dep in self.stages[sid]['depends_on']:
            r = self.row('SELECT state FROM stages WHERE project_id=? AND stage_id=?', (pid, dep))
            if r['state'] != 'ACCEPTED':
                blockers.append({'id': dep, 'reason': 'Prerequisite stage not accepted'})
        for task in self.rows('SELECT * FROM tasks WHERE project_id=? AND stage_id=?', (pid, sid)):
            if task['state'] != 'ACCEPTED':
                blockers.append({'id': task['task_id'], 'reason': f'Task requires independent acceptance (now {task["state"]})'})
        return blockers

    def approve_stage(self, pid, sid, actor, expected_revision):
        role = self.require_role(pid, actor, {'sponsor', 'security'})
        if sid != 'S00':
            raise DomainError('NOT_IMPLEMENTED', 'Only S00 approval is enabled in this prototype', 501)
        with self.transaction():
            stage = self.row('SELECT * FROM stages WHERE project_id=? AND stage_id=?', (pid, sid))
            self._revision(stage['revision'], expected_revision)
            if stage['state'] == 'ACCEPTED':
                raise DomainError('STATE', 'Stage already accepted')
            blockers = self.gate_blockers(pid, sid)
            if blockers:
                raise DomainError('BLOCKED', json.dumps(blockers), 409)
            if self.row('SELECT 1 FROM approvals WHERE project_id=? AND stage_id=? AND role=?', (pid, sid, role)):
                raise DomainError('DUPLICATE', 'This role has already approved')
            # Only S00 role mapping has been explicitly configured; no generic role inference.
            self.conn.execute('INSERT INTO approvals VALUES(?,?,?,?,?)', (pid, sid, role, actor, stage['revision']))
            roles = {r['role'] for r in self.rows('SELECT role FROM approvals WHERE project_id=? AND stage_id=?', (pid, sid))}
            state = 'ACCEPTED' if {'sponsor', 'security'} <= roles else 'AWAITING_REVIEW'
            self.conn.execute('UPDATE stages SET state=?,revision=revision+1 WHERE project_id=? AND stage_id=?',
                              (state, pid, sid))
            self.audit(pid, actor, 'GATE_REVIEWED', sid, {'role': role, 'state': state})
        return self.overview(pid, actor)

    def audit_events(self, pid, actor):
        self.require_member(pid, actor)
        return self.rows('SELECT id,actor,action,subject,timestamp,details FROM audit WHERE project_id=? ORDER BY id', (pid,))
