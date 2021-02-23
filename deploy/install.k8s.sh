#!/bin/bash

set -o errexit

is_command_present() {
    type "$1" >/dev/null 2>&1
}

is_mac() {
    [[ $OSTYPE == darwin* ]]
}


check_k8s_setup() {
    echo "Checking your k8s setup status"
    if ! is_command_present kubectl; then
        echo "Please install kubectl on your machine"
        exit 1
    else
        
        if ! is_command_present jq; then
            install_jq
        fi
        clusters=`kubectl config view -o json | jq -r '."current-context"'` 
        if [[ ! -n $clusters ]]; then
            echo "Please setup a k8s cluster & config kubectl to connect to it"
            exit 1
        fi
        k8s_minor_version=`kubectl version --short -o json | jq ."serverVersion.minor" | sed 's/[^0-9]*//g'`
        # if [[ $k8s_minor_version < 18 ]]; then
        #     echo "+++++++++++ ERROR ++++++++++++++++++++++"
        #     echo "SigNoz deployments require Kubernetes >= v1.18. Found version: v1.$k8s_minor_version"
        #     echo "+++++++++++ ++++++++++++++++++++++++++++"
        #     exit 1
        # fi;
    fi
}

install_jq(){
    if [ $package_manager == "brew" ]; then
        brew install jq
    elif [ $package_manager == "yum" ]; then
        yum_cmd="sudo yum --assumeyes --quiet"
        $yum_cmd install jq
    else
        apt_cmd="sudo apt-get --yes --quiet"
        $apt_cmd update
        $apt_cmd install jq
    fi
}


check_os() {
    if is_mac; then
        package_manager="brew"
        desired_os=1
        os="Mac"
        return
    fi

    os_name="$(cat /etc/*-release | awk -F= '$1 == "NAME" { gsub(/"/, ""); print $2; exit }')"

    case "$os_name" in
        Ubuntu*)
            desired_os=1
            os="ubuntu"
            package_manager="apt-get"
            ;;
        Debian*)
            desired_os=1
            os="debian"
            package_manager="apt-get"
            ;;
        Red\ Hat*)
            desired_os=1
            os="red hat"
            package_manager="yum"
            ;;
        CentOS*)
            desired_os=1
            os="centos"
            package_manager="yum"
            ;;
        *)
            desired_os=0
            os="Not Found"
    esac
}


echo_contact_support() {
    echo "Please contact <support@signoz.io> with your OS details and version${1:-.}"
}

bye() {  # Prints a friendly good bye message and exits the script.
    set +o errexit
    echo "Please share your email to receive support with the installation"
    read -rp 'Email: ' email

    while [[ $email == "" ]]
    do
        read -rp 'Email: ' email
    done

    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Support", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "email": "'"$email"'", "platform": "k8s", "k8s_minor_version": "'"$k8s_minor_version"'" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"


    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

    echo -e "\nExiting for now. Bye! \U1F44B\n"
    exit 1
}

deploy_app() {
    kubectl apply -f "$install_dir/config-template"
    kubectl apply -f "$install_dir"
}

wait_for_application_start() {
    local timeout=$1
    address=$custom_domain
    if [[ "$ssl_enable" == "true" ]]; then
        protocol="https"
    else
        protocol="http"
    fi
    # The while loop is important because for-loops don't work for dynamic values
    while [[ $timeout -gt 0 ]]; do
        if [[ $address == "" || $address == null ]]; then
            address=`kubectl get ingress appsmith-ingress -o json | jq -r '.status.loadBalancer.ingress[0].ip'`
        fi
        status_code="$(curl -s -o /dev/null -w "%{http_code}" $protocol://$address/api/v1 || true)"
        if [[ status_code -eq 401 ]]; then
            break
        else
            echo -ne "Waiting for all containers to start. This check will timeout in $timeout seconds...\r\c"
        fi
        ((timeout--))
        sleep 1
    done

    echo ""
}


echo -e "👋  Thank you for trying out SigNoz! "
echo ""


# Checking OS and assigning package manager
desired_os=0
os=""
echo -e "🕵️  Detecting your OS"
check_os
SIGNOZ_INSTALLATION_ID=$(curl -s 'https://api64.ipify.org')

# Run bye if failure happens
trap bye EXIT

DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Started", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "platform": "k8s", "k8s_minor_version": "'"$k8s_minor_version"'" } }'

URL="https://app.posthog.com/capture"
HEADER="Content-Type: application/json"

if has_curl; then
    curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
elif has_wget; then
    wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
fi

# Check for  kubernetes setup
check_k8s_setup

echo ""
echo "Deploy Appmisth on your cluster"
echo ""

deploy_app

wait_for_application_start 60


if [[ $status_code -ne 200 ]]; then
    echo "+++++++++++ ERROR ++++++++++++++++++++++"
    echo "The containers didn't seem to start correctly. Please run the following command to check containers that may have errored out:"
    echo ""
    echo -e "sudo docker-compose -f docker/docker-compose-tiny.yaml ps -a"
    echo "Please read our troubleshooting guide https://signoz.io/docs/deployment/docker#troubleshooting"
    echo "or reach us on SigNoz for support https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"
    echo "++++++++++++++++++++++++++++++++++++++++"

    SUPERVISORS="$(curl -so -  http://localhost:8888/druid/indexer/v1/supervisor)"

    DATASOURCES="$(curl -so -  http://localhost:8888/druid/coordinator/v1/datasources)"

    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error - Checks", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "platform": "k8s", "error": "Containers not started", "SUPERVISORS": '"$SUPERVISORS"', "DATASOURCES": '"$DATASOURCES"' } }'

    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

    exit 1

else
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Success", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'"} }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi
    echo "++++++++++++++++++ SUCCESS ++++++++++++++++++++++"
    echo "Your installation is complete!"
    echo ""
    echo "Your frontend is running on 'http://localhost:3000'."

    echo ""
    echo "+++++++++++++++++++++++++++++++++++++++++++++++++"
    echo ""
    echo "Need help Getting Started?"
    echo "Join us on Slack https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"
    echo ""
    echo "Please share your email to receive support & updates about SigNoz!"
    read -rp 'Email: ' email

    while [[ $email == "" ]]
    do
        read -rp 'Email: ' email
    done
    
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Identify Successful Installation", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "email": "'"$email"'", "platform": "k8s" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

fi

echo -e "\nThank you!\n"
