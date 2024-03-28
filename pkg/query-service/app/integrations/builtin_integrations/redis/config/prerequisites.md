## Before You Begin  

To configure metrics and logs collection for a Redis server, you need the following.

### Ensure Redis server is running a supported version

Redis server versions newer than 3.0 are supported.

### Ensure OTEL Collector is running with access to the Redis server

#### Ensure that an OTEL collector is running in your deployment environment
If needed, please [install an OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/)  
If already installed, ensure that the collector version is v0.88.0 or newer.  

Also ensure that you can provide config files to the collector and that you can set environment variables and command line flags used for running it.  

#### Ensure that the OTEL collector can access the Redis server
In order to collect metrics, the collector must be able to access the Redis server as a client.

In order to collect logs, the collector must be able to read the Redis server log file.
