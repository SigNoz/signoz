## Before You Begin  

To configure logs collection for Nginx, you need the following.

### Ensure Nginx server is running a supported version

Ensure that your Nginx server is running a version newer than 1.0.0


### Ensure OTEL Collector is running with access to the Nginx server

- **Ensure that an OTEL collector is running in your deployment environment**  
  If needed, please [install an OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/)  
  If already installed, ensure that the collector version is v0.88.0 or newer.  

  Also ensure that you can provide config files to the collector and that you can set environment variables and command line flags used for running it.  

- **Ensure that the OTEL collector can access the Nginx server**  
  In order to collect logs, the collector must be able to read Nginx server log files.
