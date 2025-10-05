from backend.app.database import init_db
from fastapi.testclient import TestClient
from backend.app.main import app

init_db()
client = TestClient(app)

resp = client.post('/bootstrap/demo')
print('bootstrap status', resp.status_code)
print(resp.json())

print('teachers', client.get('/teachers').json())
print('exams', client.get('/exams').json())

submission_payload = {"student_id": 1, "exam_id": 1}
resp = client.post('/submissions', json=submission_payload)
print('create submission', resp.status_code)
print(resp.json())

print('submissions list', client.get('/submissions').json())
print('analytics', client.post('/analytics', json={}).json())
print('mistakes', client.get('/students/1/mistakes').json())

practice_payload = {"student_id": 1, "max_items": 5}
resp = client.post('/practice', json=practice_payload)
print('practice status', resp.status_code)
print(resp.json())
