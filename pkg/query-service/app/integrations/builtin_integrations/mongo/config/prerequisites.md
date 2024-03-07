### Prepare mongo for monitoring

- Have a running mongodb instance
- Have the monitoring user created
- Have the monitoring user granted the necessary permissions

Mongodb recommends to set up a least privilege user (LPU) with a `clusterMonitor` role in order to collect.

Run the following command to create a user with the necessary permissions.

```
use admin
db.createUser(
  {
    user: "monitoring",
    pwd: "<PASSWORD>",
    roles: ["clusterMonitor"]
  }
);
```

Replace `<PASSWORD>` with a strong password and set is as env var `MONGODB_PASSWORD`.
