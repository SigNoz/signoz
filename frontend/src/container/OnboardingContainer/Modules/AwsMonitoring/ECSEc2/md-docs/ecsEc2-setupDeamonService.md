
These steps will help you to collect **metrics, logs and traces** from your ECS infrastructure. 

## Setup Daemon Service

&nbsp;

### Daemon Service Template

This step guides in downloading a template which will be used to create a new service within your Amazon ECS (Elastic Container Service) cluster. The purpose of this service is to deploy a container that functions as a daemon. This service will run a container that will send data such as ECS infrastructure metrics and logs from docker containers and send it to SigNoz.

We will use CloudFormation template which includes parameters and configurations that define how the daemon service should be set up. For example, it specifies the container image to use for the daemon, the necessary environment variables, and network settings. 

&nbsp;

Download the `daemon-template.yaml` using the command below: 

```bash
wget https://github.com/SigNoz/benchmark/raw/main/ecs/ec2/daemon-template.yaml
```

