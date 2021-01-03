# Steps to Deploy SigNoz

1. git clone https://gitlab.com/signoz-oss/signoz.git && cd signoz
2. helm dependency update deploy/kubernetes/platform
3. kubectl create ns platform
4. helm -n platform install signoz deploy/kubernetes/platform
5. kubectl -n platform apply -Rf deploy/kubernetes/jobs
6. kubectl -n platform apply -f deploy/kubernetes/otel-collector

 
## Test HotROD application with SigNoz

1. kubectl create ns sample-application
2. kubectl -n sample-application apply -Rf sample-apps/hotrod/


### How to generate load

- kubectl -n sample-application run strzal --image=djbingham/curl --restart='OnFailure' -i --tty --rm --command -- curl -X POST -F 'locust_count=6' -F 'hatch_rate=2' http://locust-master:8089/swarm


### How to stop load

- kubectl -n sample-application run strzal --image=djbingham/curl --restart='OnFailure' -i --tty --rm --command -- curl http://locust-master:8089/stop