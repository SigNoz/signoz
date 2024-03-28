## Before You Begin  

To configure metrics and logs collection for MongoDB, you need the following.

### Ensure MongoDB server is prepared for monitoring

- **Ensure that the MongoDB server is running a supported version**  
  MongoDB versions 4.4+ are supported.  
  You can use the following statement to determine server version  
  ```js
  db.version()
  ```

- **If collecting metrics, ensure that there is a MongoDB user with required permissions**  
  Mongodb recommends to set up a least privilege user (LPU) with a clusterMonitor role in order to collect metrics

  To create a monitoring user, run:  
  ```js
  use admin
  db.createUser(
    {
      user: "monitoring",
      pwd: "<PASSWORD>",
      roles: ["clusterMonitor"]
    }
  );
    ```  
    

### Ensure OTEL Collector is running with access to the MongoDB server

- **Ensure that an OTEL collector is running in your deployment environment**  
  If needed, please [install an OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/)  
  If already installed, ensure that the collector version is v0.88.0 or newer.  

  Also ensure that you can provide config files to the collector and that you can set environment variables and command line flags used for running it.  

- **Ensure that the OTEL collector can access the MongoDB server**  
  In order to collect metrics, the collector must be able to access the MongoDB server as a client using the monitoring user.  

  In order to collect logs, the collector must be able to read the MongoDB server log file.
