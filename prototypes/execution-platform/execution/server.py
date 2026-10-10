"""Local-only HTTP demo. Do not deploy to a public or customer-facing host."""
from __future__ import annotations

import json
import os
import secrets
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from .engine import load_definition
from .store import DomainError, Store

ROLES = {'demo_admin': 'admin', 'demo_worker': 'worker', 'demo_reviewer': 'reviewer',
         'demo_sponsor': 'sponsor', 'demo_security': 'security'}
STATIC = Path(__file__).parent / 'static'


def make_handler(store, tokens):
    class Handler(BaseHTTPRequestHandler):
        server_version = 'TachosLocalDemo/0.1'

        def send(self, status, payload, content_type='application/json'):
            body = (json.dumps(payload).encode('utf-8') if content_type == 'application/json' else payload)
            self.send_response(status)
            self.send_header('Content-Type', content_type + ('; charset=utf-8' if content_type.startswith('text/') else ''))
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(body)

        def identity(self):
            header = self.headers.get('Authorization', '')
            if not header.startswith('Bearer '):
                raise DomainError('UNAUTHENTICATED', 'Enter a demo token', 401)
            supplied = header[7:]
            for actor, token in tokens.items():
                if secrets.compare_digest(supplied, token):
                    return actor
            raise DomainError('UNAUTHENTICATED', 'Invalid demo token', 401)

        def path_parts(self):
            return [x for x in urlsplit(self.path).path.split('/') if x]

        def check_host(self):
            host = self.headers.get('Host', '')
            if host.split(':')[0] not in ('127.0.0.1', 'localhost'):
                raise DomainError('HOST', 'This demonstration is localhost-only', 403)

        def body(self):
            try:
                size = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                raise DomainError('INVALID', 'Invalid Content-Length')
            if not 0 < size <= 16384:
                raise DomainError('INVALID', 'Request body must be 1–16384 bytes', 413)
            try:
                value = json.loads(self.rfile.read(size))
            except (ValueError, UnicodeError):
                raise DomainError('INVALID', 'Expected JSON body')
            if not isinstance(value, dict):
                raise DomainError('INVALID', 'Expected JSON object')
            return value

        def do_GET(self):
            try:
                self.check_host()
                parts = self.path_parts()
                if parts == ['api', 'definition']:
                    return self.send(200, {'version': store.definition['version'], 'stages':
                        [{'id': s['id'], 'title': s['title'], 'tasks': len(s['tasks'])} for s in store.definition['stages']]})
                if len(parts) >= 3 and parts[:2] == ['api', 'projects']:
                    actor = self.identity()
                    if len(parts) == 3:
                        return self.send(200, store.overview(parts[2], actor))
                    if len(parts) == 4 and parts[3] == 'audit':
                        return self.send(200, {'events': store.audit_events(parts[2], actor)})
                if parts == []:
                    parts = ['index.html']
                if len(parts) == 1 and parts[0] in ('index.html', 'styles.css', 'app.js'):
                    types = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript'}
                    path = STATIC / parts[0]
                    return self.send(200, path.read_bytes(), types[path.suffix])
                raise DomainError('NOT_FOUND', 'Endpoint not found', 404)
            except DomainError as err:
                self.send(err.http, {'error': err.code, 'message': str(err)})

        def do_POST(self):
            try:
                self.check_host()
                actor = self.identity()
                parts = self.path_parts()
                data = self.body()
                if parts == ['api', 'projects']:
                    pid = store.create_project(actor, data.get('name'), data.get('site_alias'),
                        data.get('project_type'), data.get('scope'), data.get('classification'), ROLES)
                    return self.send(201, {'project_id': pid})
                if len(parts) == 6 and parts[:2] == ['api', 'projects'] and parts[3] == 'tasks':
                    pid, tid, action = parts[2], parts[4], parts[5]
                    if action == 'submit':
                        return self.send(200, store.submit_task(pid, tid, actor, data.get('evidence_ref'), data.get('expected_revision')))
                    if action == 'review':
                        return self.send(200, store.review_task(pid, tid, actor, data.get('decision'), data.get('expected_revision')))
                if len(parts) == 6 and parts[:2] == ['api', 'projects'] and parts[3] == 'stages' and parts[5] == 'approve':
                    return self.send(200, store.approve_stage(parts[2], parts[4], actor, data.get('expected_revision')))
                raise DomainError('NOT_FOUND', 'Endpoint not found', 404)
            except DomainError as err:
                self.send(err.http, {'error': err.code, 'message': str(err)})

    return Handler


def main():
    port = int(os.getenv('TACHOS_DEMO_PORT', '8765'))
    db = os.getenv('TACHOS_DEMO_DB', 'tachos-demo.sqlite3')
    if os.path.exists(db):
        print('Existing synthetic demo database detected; this is NOT approved storage for real data.')
    store = Store(db)
    tokens = {actor: secrets.token_urlsafe(24) for actor in ROLES}
    server = ThreadingHTTPServer(('127.0.0.1', port), make_handler(store, tokens))
    print('LOCAL SYNTHETIC DATA ONLY. NOT A PRODUCTION SECURITY SYSTEM.', flush=True)
    print(f'Open http://127.0.0.1:{port}/', flush=True)
    for actor, token in tokens.items():
        print(f'{actor}: {token}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == '__main__':
    main()
