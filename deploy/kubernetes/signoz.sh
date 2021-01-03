#!/usr/bin/env bash

set -eEu -o functrace
script=$0

function clean() {
  EXIT_CODE=0
  kubectl get ns ${HT_KUBE_NAMESPACE} ${KUBE_FLAGS} >/dev/null 2>&1 || EXIT_CODE=$?
  if [ ${EXIT_CODE} != 0 ]; then
    echo "[ERROR] Couldn't find namespace to uninstall. namespace: ${HT_KUBE_NAMESPACE}, context: ${HT_KUBE_CONTEXT}"
    exit 1
  fi

  EXIT_CODE=0
  helm get all hypertrace-platform-services ${HELM_FLAGS} >/dev/null 2>&1 || EXIT_CODE=$?
  if [ ${EXIT_CODE} == 0 ]; then
    echo "[INFO] found existing platform services deployment. running helm uninstall. release: 'hypertrace-platform-services'"
    helm uninstall hypertrace-platform-services ${HELM_FLAGS}
  else
    echo "[INFO] Couldn't find helm release 'hypertrace-platform-services'"
  fi

  EXIT_CODE=0
  helm get all hypertrace-data-services ${HELM_FLAGS} >/dev/null 2>&1 || EXIT_CODE=$?
  if [ ${EXIT_CODE} == 0 ]; then
    echo "[INFO] found existing data services deployment. running helm uninstall. release: 'hypertrace-data-services'"
    helm uninstall hypertrace-data-services ${HELM_FLAGS}
  else
    echo "[INFO] Couldn't find helm release 'hypertrace-data-services'"
  fi
  echo "[INFO] We are clean! good to go!"
}

error_report() {
    local retval=$?
    echo "${script}: Error at line#: $1, command: $2, error code: ${retval}"
    exit ${retval}
}

trap 'error_report ${LINENO} ${BASH_COMMAND}' ERR

function usage() {
    echo "usage: $script {install|uninstall} [option]"
    echo " "
    echo "available options:"
    echo " "
    echo "--clean             removes previous deployments of Hypertrace and do clean install"

    exit 1
}

HYPERTRACE_HOME="`dirname \"$0\"`"
HYPERTRACE_HOME="`( cd \"${HYPERTRACE_HOME}\" && pwd )`"  # absolutized and normalized

HYPERTRACE_CONFIG=${HYPERTRACE_HOME}/config/hypertrace.properties

if [ ! -f "${HYPERTRACE_CONFIG}" ]; then
    echo "Configuration file not found: '${HYPERTRACE_CONFIG}'"
fi
source ${HYPERTRACE_CONFIG}

LOG_DIR=${HYPERTRACE_HOME}/logs
LOG_FILE=hypertrace.log
mkdir -p ${LOG_DIR}

if [ x${HT_KUBE_CONTEXT} == "x" ]; then
  HT_KUBE_CONTEXT="$(kubectl config current-context)"
fi

HELM_FLAGS="--kube-context=${HT_KUBE_CONTEXT} --namespace=${HT_KUBE_NAMESPACE} --log-dir=${LOG_DIR} --log-file=${LOG_FILE} --log-file-max-size=16 --alsologtostderr=true --logtostderr=false"
KUBE_FLAGS="--context=${HT_KUBE_CONTEXT} --namespace=${HT_KUBE_NAMESPACE} --log-dir=${LOG_DIR} --log-file=${LOG_FILE} --log-file-max-size=16 --alsologtostderr=true --logtostderr=false"


if [[ "$HT_ENABLE_DEBUG" == "true" ]]; then
  HELM_FLAGS="$HELM_FLAGS --debug --v=4"
  KUBE_FLAGS="$KUBE_FLAGS --v=4"
fi

if [ "$#" -gt 1 ]; then
  if [[ $2 == "--clean" ]]; then
      clean
    else
      usage
  fi
elif [ "$#" -ne 1 ]; then
    echo "[ERROR] Illegal number of parameters"
    echo "-------------------------------------"
    usage
fi


subcommand=$1; shift

case "$subcommand" in
  install)
    EXIT_CODE=0;

    # namespace - create when it doesn't exists. ignore, otherwise.
    kubectl get ns ${HT_KUBE_NAMESPACE} ${KUBE_FLAGS} >/dev/null 2>&1 || EXIT_CODE=$?
    if [ ${EXIT_CODE} == 0 ]; then
      echo "[WARN] Skipping namespace creation. Namespace already exists. namespace: ${HT_KUBE_NAMESPACE}, context: ${HT_KUBE_CONTEXT}"
    else
      echo "[INFO] Creating namespace. namespace: ${HT_KUBE_NAMESPACE}, context: ${HT_KUBE_CONTEXT}"
      kubectl create ns ${HT_KUBE_NAMESPACE} ${KUBE_FLAGS}
    fi

    
    echo "[INFO] cleaning up any helm temporary working directory"
    rm -rf ${HYPERTRACE_HOME}/data-services/charts
    rm -rf ${HYPERTRACE_HOME}/data-services/tmpcharts
    rm -rf ${HYPERTRACE_HOME}/data-services/Chart.lock
    rm -rf ${HYPERTRACE_HOME}/platform-services/charts
    rm -rf ${HYPERTRACE_HOME}/platform-services/tmpcharts
    rm -rf ${HYPERTRACE_HOME}/platform-services/Chart.lock

    echo "[INFO] installing hypertrace data services. namespace: ${HT_KUBE_NAMESPACE}, context: ${HT_KUBE_CONTEXT}"
    helm dependency update ${HYPERTRACE_HOME}/data-services ${HELM_FLAGS}
    helm upgrade hypertrace-data-services ${HYPERTRACE_HOME}/data-services -f ${HYPERTRACE_HOME}/data-services/values.yaml -f ${HYPERTRACE_HOME}/clusters/$HT_PROFILE/values.yaml --install --wait ${HELM_FLAGS} --timeout ${HT_INSTALL_TIMEOUT}m --set htEnv=${HT_ENV}

    echo "[INFO] installing hypertrace platform services. namespace: ${HT_KUBE_NAMESPACE}, context: ${HT_KUBE_CONTEXT}"
    helm dependency update ${HYPERTRACE_HOME}/platform-services ${HELM_FLAGS}
    helm upgrade hypertrace-platform-services ${HYPERTRACE_HOME}/platform-services -f ${HYPERTRACE_HOME}/platform-services/values.yaml -f ${HYPERTRACE_HOME}/clusters/$HT_PROFILE/values.yaml --install ${HELM_FLAGS} --timeout ${HT_INSTALL_TIMEOUT}m --set htEnv=${HT_ENV}
    echo "[INFO] Hypertrace installation completed"
    ;;

  uninstall)
    echo "[INFO] Uninstalling Hypertrace deletes the hypertrace namespace and deletes any data stored."
    echo "Choose an option to continue"

    select yn in "Yes" "No"; do
        case $yn in
            Yes )
              clean
              kubectl delete ns ${HT_KUBE_NAMESPACE} ${KUBE_FLAGS}
              echo "[INFO] Uninstall successful."
              break;;

            No )
              echo "[INFO] Uninstall cancelled."
              exit;;
        esac
    done
    ;;
  *)
    echo "[ERROR] Unknown command: ${subcommand}"
    usage
    ;;
esac