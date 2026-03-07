from locust import HttpUser, task, between
class UserTasks(HttpUser):
    wait_time = between(5, 15)

    @task
    def rachel(self):
        self.client.get("/dispatch?customer=123&nonse=0.6308392664170006")
    @task
    def trom(self):
        self.client.get("/dispatch?customer=392&nonse=0.015296363321630757")
    @task
    def japanese(self):
        self.client.get("/dispatch?customer=731&nonse=0.8022286220408668")
    @task
    def coffee(self):
        self.client.get("/dispatch?customer=567&nonse=0.0022220379420636593")
