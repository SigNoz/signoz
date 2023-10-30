## Collect Kubernetes Pod Logs in SigNoz Cloud

To collect logs from your kubernetes cluster, you will need to deploy k8s-infra chart. Please follow the guide [here](https://signoz.io/docs/tutorial/kubernetes-infra-metrics/). Log collection of pods from all namespaces is enabled by default except for pods in `kube-system` and `hotrod`. To modify the log collection mechanism, please follow the guides below.

- [Disable automatic pod logs collection](https://signoz.io/docs/userguide/collect_kubernetes_pod_logs/#steps-to-disable-automatic-pod-logs-collection)
- [Filter/Exclude logs collection](https://signoz.io/docs/userguide/collect_kubernetes_pod_logs/#steps-to-filterexclude-logs-collection)
