#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")";

HOTROD_NAMESPACE=${HOTROD_NAMESPACE:-"sample-application"}

if [[ "${HOTROD_NAMESPACE}" == "default" || "${HOTROD_NAMESPACE}" == "kube-system" || "${HOTROD_NAMESPACE}" == "platform" ]]; then
    echo "Default k8s namespace and SigNoz namespace must not be deleted"
    echo "Deleting components only"
    kubectl delete --namespace="${HOTROD_NAMESPACE}" -f <(cat hotrod-template.yaml || curl -sL https://github.com/SigNoz/signoz/raw/develop/sample-apps/hotrod/hotrod-template.yaml)
else
    echo "Delete HotROD sample app namespace ${HOTROD_NAMESPACE}"
    kubectl delete namespace "${HOTROD_NAMESPACE}"
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to delete HotROD sample application"
else
    echo "✅ Successfully deleted HotROD sample application"
fi
