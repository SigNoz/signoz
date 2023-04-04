from locust import HttpUser, task, between
class UserTasks(HttpUser):
    wait_time = between(5, 15)

    @task
    def generate_error(self):
        self.client.get("/generate-error")
