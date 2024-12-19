#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")";

# Namespace to install sample app
HOTROD_NAMESPACE=${HOTROD_NAMESPACE:-"sample-application"}
SIGNOZ_NAMESPACE="${SIGNOZ_NAMESPACE:-platform}"

# HotROD's docker image
if [[ -z $HOTROD_IMAGE ]]; then
    HOTROD_REPO="${HOTROD_REPO:-jaegertracing/example-hotrod}"
    HOTROD_TAG="${HOTROD_TAG:-1.30}"
    HOTROD_IMAGE="${HOTROD_REPO}:${HOTROD_TAG}"
fi

# Locust's docker image
if [[ -z $LOCUST_IMAGE ]]; then
    LOCUST_REPO="${LOCUST_REPO:-signoz/locust}"
    LOCUST_TAG="${LOCUST_TAG:-1.2.3}"
    LOCUST_IMAGE="${LOCUST_REPO}:${LOCUST_TAG}"
fi

# Helm release name
HELM_RELEASE="${HELM_RELEASE:-my-release}"

# Otel Collector service address
if [[ -z $JAEGER_ENDPOINT ]]; then
    if [[ "$HELM_RELEASE" == *"signoz"* ]]; then
        JAEGER_ENDPOINT="http://${HELM_RELEASE}-otel-collector.${SIGNOZ_NAMESPACE}.svc.cluster.local:14268/api/traces"
    else
        JAEGER_ENDPOINT="http://${HELM_RELEASE}-signoz-otel-collector.${SIGNOZ_NAMESPACE}.svc.cluster.local:14268/api/traces"
    fi
fi

# Create namespace for sample application if does not exist
kubectl create namespace "$HOTROD_NAMESPACE" --save-config --dry-run -o yaml 2>/dev/null | kubectl apply -f -

# Setup sample apps into specified namespace
kubectl apply --namespace="${HOTROD_NAMESPACE}" -f <( \
    (cat hotrod-template.yaml 2>/dev/null || curl -sL https://github.com/SigNoz/signoz/raw/develop/sample-apps/hotrod/hotrod-template.yaml) | \
        HOTROD_NAMESPACE="${HOTROD_NAMESPACE}" \
        HOTROD_IMAGE="${HOTROD_IMAGE}" \
        LOCUST_IMAGE="${LOCUST_IMAGE}" \
        JAEGER_ENDPOINT="${JAEGER_ENDPOINT}" \
        envsubst \
    )

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy HotROD sample application"
else
    echo "✅ Successfully deployed HotROD sample application"
fi
