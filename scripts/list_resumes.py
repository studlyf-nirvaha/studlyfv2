from pymongo import MongoClient
import os
from pprint import pprint
# load env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k,v=line.strip().split('=',1)
                os.environ[k]=v
client = MongoClient(os.environ.get('MONGO_URL','mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME','studlyf_db')]
print('Resumes count:', db.resumes.count_documents({}))
for doc in db.resumes.find().sort('updated_at',-1).limit(50):
    d = doc.copy()
    d['_id'] = str(d.get('_id'))
    pprint(d)
