# HotROD Sample Application (Kubernetes)

Follow the steps in this section to install a sample application named HotR.O.D, and generate tracing data.

```console
kubectl create ns sample-application

kubectl -n sample-application apply -f https://github.com/SigNoz/signoz/raw/develop/sample-apps/hotrod/hotrod.yaml
```

In case, you have installed SigNoz in namespace other than `platform` or selected Helm release name other than `my-release`, follow the steps below:

```console
export HELM_RELEASE=my-release-2
export SIGNOZ_NAMESPACE=platform-2
export HOTROD_NAMESPACE=sample-application-2

curl -sL https://github.com/SigNoz/signoz/raw/develop/sample-apps/hotrod/hotrod-install.sh | bash
```

To delete sample application:

```console
export HOTROD_NAMESPACE=sample-application-2

curl -sL https://github.com/SigNoz/signoz/raw/develop/sample-apps/hotrod/hotrod-delete.sh | bash
```

For testing with local scripts, you can use the following commands:

```console
# To install hotrod
cat hotrod-install.sh | bash

# To delete hotrod
cat hotrod-delete.sh | bash
```
