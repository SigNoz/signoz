# Deploy

Check that you have cloned [signoz/signoz](https://github.com/signoz/signoz)
and currently are in `signoz/deploy` folder.

## Docker

If you don't have docker set up, please follow [this guide](https://docs.docker.com/engine/install/)
to set up docker before proceeding with the next steps.

### Using Install Script

Now run the following command to install:

```sh
./install.sh
```

### Using Docker Compose

If you don't have docker-compose set up, please follow [this guide](https://docs.docker.com/compose/install/)
to set up docker compose before proceeding with the next steps.

For x86 chip (amd):

```sh
docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d
```

Open http://localhost:3301 in your favourite browser. In couple of minutes, you should see
the data generated from hotrod in SigNoz UI.

## Kubernetes

### Using Helm

#### Bring up SigNoz cluster

```sh
helm repo add signoz https://charts.signoz.io

kubectl create ns platform

helm -n platform install my-release signoz/signoz
```

To access the UI, you can `port-forward` the frontend service:

```sh
kubectl -n platform port-forward svc/my-release-frontend 3301:3301
```

Open http://localhost:3301 in your favourite browser. Few minutes after you generate load
from the HotROD application, you should see the data generated from hotrod in SigNoz UI.

#### Test HotROD application with SigNoz

```sh
kubectl create ns sample-application

kubectl -n sample-application apply -f https://raw.githubusercontent.com/SigNoz/signoz/main/sample-apps/hotrod/hotrod.yaml
```

To generate load:

```sh
kubectl -n sample-application run strzal --image=djbingham/curl \
--restart='OnFailure' -i --tty --rm --command -- curl -X POST -F \
'locust_count=6' -F 'hatch_rate=2' http://locust-master:8089/swarm
```

To stop load:

```sh
kubectl -n sample-application run strzal --image=djbingham/curl \
 --restart='OnFailure' -i --tty --rm --command -- curl \
 http://locust-master:8089/stop
```

## Uninstall/Troubleshoot?

Go to our official documentation site [signoz.io/docs](https://signoz.io/docs) for more.
