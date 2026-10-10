import copy
import json
import tempfile
import unittest
from pathlib import Path

from execution.engine import WorkflowError, load_definition, validate_definition
from execution.store import Store, DomainError


class WorkflowTests(unittest.TestCase):
    def test_original_definition(self):
        d=load_definition()
        self.assertEqual(validate_definition(d), {'stages':11,'tasks':64})
        self.assertEqual([s['id'] for s in d['stages']], [f'S{i:02}' for i in range(11)])

    def test_duplicate_id_rejected(self):
        d=load_definition()
        d['stages'][0]['tasks'][1]['id']=d['stages'][0]['tasks'][0]['id']
        with self.assertRaises(WorkflowError):validate_definition(d)

    def test_cycle_rejected(self):
        d=load_definition()
        d['stages'][0]['depends_on']=['S10']
        with self.assertRaises(WorkflowError):validate_definition(d)


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.db=str(Path(self.temp.name)/'demo.sqlite3')
        self.store=Store(self.db)
        self.actors={'demo_admin':'admin','demo_worker':'worker','demo_reviewer':'reviewer',
                     'demo_sponsor':'sponsor','demo_security':'security'}
        self.pid=self.create('Orion')

    def tearDown(self):
        self.store.conn.close()
        self.temp.cleanup()

    def create(self, name):
        return self.store.create_project('demo_admin',name,'DEMO-ORION','retrofit','Fictional scope','SYNTHETIC_DEMO',self.actors)

    def submit(self, tid, pid=None):
        pid=pid or self.pid
        t=next(t for t in self.store.overview(pid,'demo_worker')['tasks'] if t['task_id']==tid)
        return self.store.submit_task(pid,tid,'demo_worker',f'demo://{pid}/{tid}/evidence',t['revision'])

    def review(self, tid):
        t=next(t for t in self.store.overview(self.pid,'demo_reviewer')['tasks'] if t['task_id']==tid)
        return self.store.review_task(self.pid,tid,'demo_reviewer','ACCEPTED',t['revision'])

    def assert_code(self, expected, fn):
        with self.assertRaises(DomainError) as ctx:fn()
        self.assertEqual(ctx.exception.code,expected)

    def test_missing_evidence_blocked(self):
        self.assert_code('EVIDENCE_SCOPE',lambda:self.store.submit_task(self.pid,'S00.01','demo_worker','',1))
        self.assert_code('BLOCKED',lambda:self.store.approve_stage(self.pid,'S00','demo_sponsor',1))

    def test_task_needs_review(self):
        self.submit('S00.01')
        self.assert_code('BLOCKED',lambda:self.store.approve_stage(self.pid,'S00','demo_sponsor',1))
        self.assertEqual(self.store.overview(self.pid,'demo_worker')['tasks'][0]['state'],'AWAITING_REVIEW')

    def test_role_and_self_review(self):
        self.submit('S00.01')
        self.assert_code('FORBIDDEN',lambda:self.store.review_task(self.pid,'S00.01','demo_worker','ACCEPTED',2))
        self.assert_code('FORBIDDEN',lambda:self.store.approve_stage(self.pid,'S00','demo_reviewer',1))

    def test_stale_revision(self):
        self.submit('S00.01')
        self.assert_code('CONFLICT',lambda:self.store.submit_task(self.pid,'S00.01','demo_worker',f'demo://{self.pid}/S00.01/second',1))

    def test_cross_project_evidence_rejected(self):
        other=self.create('Other')
        self.assert_code('EVIDENCE_SCOPE',lambda:self.store.submit_task(self.pid,'S00.01','demo_worker',f'demo://{other}/S00.01/foreign',1))
        self.assert_code('FORBIDDEN',lambda:self.store.overview(other,'outsider'))

    def test_unapproved_na_is_rejected(self):
        self.submit('S00.01')
        self.assert_code('INVALID',lambda:self.store.review_task(self.pid,'S00.01','demo_reviewer','NOT_APPLICABLE',2))

    def test_two_role_gate_and_audit(self):
        for i in range(1,6):
            tid=f'S00.{i:02}'
            self.submit(tid);self.review(tid)
        self.assertEqual(self.store.gate_blockers(self.pid,'S00'),[])
        r=self.store.approve_stage(self.pid,'S00','demo_sponsor',1)
        self.assertEqual(r['stages'][0]['state'],'AWAITING_REVIEW')
        self.assert_code('DUPLICATE',lambda:self.store.approve_stage(self.pid,'S00','demo_sponsor',2))
        r=self.store.approve_stage(self.pid,'S00','demo_security',2)
        self.assertEqual(r['stages'][0]['state'],'ACCEPTED')
        self.assertEqual(self.store.gate_blockers(self.pid,'S01')[0]['id'],'S01.01')
        self.assertEqual(len(self.store.audit_events(self.pid,'demo_admin')),1+10+2)

    def test_persistence(self):
        self.submit('S00.01')
        self.store.conn.close()
        self.store=Store(self.db)
        self.assertEqual(self.store.overview(self.pid,'demo_worker')['tasks'][0]['state'],'AWAITING_REVIEW')

    def test_later_stages_not_implemented(self):
        self.assert_code('NOT_IMPLEMENTED',lambda:self.store.approve_stage(self.pid,'S01','demo_sponsor',1))


if __name__=='__main__':unittest.main()
