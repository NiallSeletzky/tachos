import http.client
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

from execution.server import make_handler
from execution.store import Store


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.store=Store(str(Path(self.temp.name)/'test.db'))
        self.tokens={'demo_admin':'secret_admin','demo_worker':'secret_worker',
                     'demo_reviewer':'secret_reviewer','demo_sponsor':'secret_sponsor','demo_security':'secret_security'}
        self.server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(self.store,self.tokens))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.port=self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join(timeout=2)
        self.store.conn.close();self.temp.cleanup()

    def call(self, method, path, token=None, body=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=3)
        headers={}
        if token:headers['Authorization']='Bearer '+token
        if body is not None:headers['Content-Type']='application/json'
        conn.request(method,path,body=None if body is None else json.dumps(body),headers=headers)
        response=conn.getresponse()
        data=response.read()
        code=response.status
        conn.close()
        try:data=json.loads(data)
        except ValueError:data=None
        return code,data

    def test_unauthenticated_and_forged_actor(self):
        code,data=self.call('POST','/api/projects',body={'name':'Fictional','site_alias':'DEMO','project_type':'retrofit','scope':'demo','classification':'SYNTHETIC_DEMO'})
        self.assertEqual(code,401)
        code,data=self.call('POST','/api/projects',token='secret_worker',body={'name':'Fictional','site_alias':'DEMO','project_type':'retrofit','scope':'demo','classification':'SYNTHETIC_DEMO','actor':'demo_admin'})
        self.assertEqual(code,403)

    def test_project_and_cross_project_evidence(self):
        code,data=self.call('POST','/api/projects',token='secret_admin',body={'name':'Fictional','site_alias':'DEMO','project_type':'retrofit','scope':'demo','classification':'SYNTHETIC_DEMO'})
        self.assertEqual(code,201)
        pid=data['project_id']
        code,data=self.call('GET',f'/api/projects/{pid}',token='secret_worker')
        self.assertEqual(code,200)
        self.assertEqual(len(data['tasks']),64)
        code,data=self.call('POST',f'/api/projects/{pid}/tasks/S00.01/submit',token='secret_worker',body={'evidence_ref':'demo://other/S00.01/foreign','expected_revision':1})
        self.assertEqual(code,400)
        code,data=self.call('POST',f'/api/projects/{pid}/tasks/S00.01/submit',token='secret_worker',body={'evidence_ref':f'demo://{pid}/S00.01/evidence','expected_revision':1})
        self.assertEqual(code,200)
        code,data=self.call('POST',f'/api/projects/{pid}/tasks/S00.01/review',token='secret_worker',body={'decision':'ACCEPTED','expected_revision':2,'actor':'demo_reviewer'})
        self.assertEqual(code,403)


if __name__=='__main__':unittest.main()
