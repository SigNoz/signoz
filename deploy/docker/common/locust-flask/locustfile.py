from locust import HttpUser, task, between
from uuid import uuid4
class UserTasks(HttpUser):
    wait_time = between(5, 15)

    @task(1)
    def list(self):
        self.client.get("/list")

    @task(1)
    def add_todo(self):
        self.client.post("/action", data={"name": "new-todo-"+str(uuid4()), "desc":"new desc", "date": "1990-04-10", "pr":"1"})

    @task(1)
    def update(self):
        self.client.post("/action3", data={"_id":"626682d44bd2839cd80eb079", "name":"todo-"+str(uuid4()), "desc": "update desc", "date": "1990-04-11", "pr":"2"})

    @task(1)
    def generate_error(self):
        self.client.get("/generate-error")
