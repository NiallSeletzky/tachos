"""TACHOS local-only workflow engine prototype. No site authority is granted."""
from __future__ import annotations

import json
import re
from pathlib import Path

DEFINITION_PATH = Path(__file__).parent / 'definitions' / 'workflow-definition.v0.1.json'
STAGE_PATTERN = re.compile(r'^S\d{2}$')
TASK_PATTERN = re.compile(r'^S\d{2}\.\d{2}$')


class WorkflowError(ValueError):
    pass


def load_definition(path=DEFINITION_PATH):
    with open(path, encoding='utf-8') as stream:
        data = json.load(stream)
    validate_definition(data)
    return data


def validate_definition(data):
    if not isinstance(data, dict) or not isinstance(data.get('version'), str):
        raise WorkflowError('Definition version is required')
    stages = data.get('stages')
    if not isinstance(stages, list) or not stages:
        raise WorkflowError('Definition requires stages')
    seen_stages, seen_tasks = set(), set()
    dependencies = {}
    for stage in stages:
        sid = stage.get('id')
        if not isinstance(sid, str) or not STAGE_PATTERN.fullmatch(sid):
            raise WorkflowError('Invalid stage ID')
        if sid in seen_stages:
            raise WorkflowError(f'Duplicate stage ID {sid}')
        seen_stages.add(sid)
        deps = stage.get('depends_on')
        if not isinstance(deps, list) or any(not isinstance(x, str) for x in deps):
            raise WorkflowError(f'Invalid dependencies for {sid}')
        if len(set(deps)) != len(deps):
            raise WorkflowError(f'Duplicate dependency in {sid}')
        dependencies[sid] = deps
        tasks = stage.get('tasks')
        if not isinstance(tasks, list) or not tasks:
            raise WorkflowError(f'Stage {sid} has no tasks')
        for task in tasks:
            tid = task.get('id')
            if not isinstance(tid, str) or not TASK_PATTERN.fullmatch(tid) or not tid.startswith(sid + '.'):
                raise WorkflowError(f'Invalid task ID in {sid}')
            if tid in seen_tasks:
                raise WorkflowError(f'Duplicate task ID {tid}')
            seen_tasks.add(tid)
            if not task.get('title') or not task.get('action'):
                raise WorkflowError(f'Incomplete task {tid}')
    for sid, deps in dependencies.items():
        if any(dep not in seen_stages for dep in deps):
            raise WorkflowError(f'Unknown dependency for {sid}')
    colour = {}
    def visit(sid):
        if colour.get(sid) == 'grey':
            raise WorkflowError('Cyclic stage dependency')
        if colour.get(sid) == 'black':
            return
        colour[sid] = 'grey'
        for dep in dependencies[sid]:
            visit(dep)
        colour[sid] = 'black'
    for sid in dependencies:
        visit(sid)
    return {'stages': len(seen_stages), 'tasks': len(seen_tasks)}
