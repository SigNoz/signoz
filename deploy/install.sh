#!/bin/bash

set -o errexit


is_command_present() {
    type "$1" >/dev/null 2>&1
}

# Check whether 'wget' command exists.
has_wget() {
    has_cmd wget
}

# Check whether 'curl' command exists.
has_curl() {
    has_cmd curl
}

# Check whether the given command exists.
has_cmd() {
    command -v "$1" > /dev/null 2>&1
}

is_mac() {
    [[ $OSTYPE == darwin* ]]
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
        Linux\ Mint*)
            desired_os=1
            os="linux mint"
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
        SLES*)
            desired_os=1
            os="sles"
            package_manager="zypper"
            ;;
        openSUSE*)
            desired_os=1
            os="opensuse"
            package_manager="zypper"
            ;;
        *)
            desired_os=0
            os="Not Found"
    esac
}


send_telemetry() {
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "install-script:run", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'`get_os_info`'" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if [ -z "$WASP_TELEMETRY_DISABLE" ]; then
        if has_curl; then
            curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
        elif has_wget; then
            wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
        fi
    fi
}

# This function checks if the relevant ports required by Appsmith are available or not
# The script should error out in case they aren't available
check_ports_occupied() {
    local port_check_output
    local ports_pattern="80|443"

    if is_mac; then
        port_check_output="$(netstat -anp tcp | awk '$6 == "LISTEN" && $4 ~ /^.*\.('"$ports_pattern"')$/')"
    elif is_command_present ss; then
        # The `ss` command seems to be a better/faster version of `netstat`, but is not available on all Linux
        # distributions by default. Other distributions have `ss` but no `netstat`. So, we try for `ss` first, then
        # fallback to `netstat`.
        port_check_output="$(ss --all --numeric --tcp | awk '$1 == "LISTEN" && $4 ~ /^.*:('"$ports_pattern"')$/')"
    elif is_command_present netstat; then
        port_check_output="$(netstat --all --numeric --tcp | awk '$6 == "LISTEN" && $4 ~ /^.*:('"$ports_pattern"')$/')"
    fi

    if [[ -n $port_check_output ]]; then
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "port not available" } }'
        URL="https://app.posthog.com/capture"
        HEADER="Content-Type: application/json"

        if has_curl; then
            curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
        elif has_wget; then
            wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
        fi

        echo "+++++++++++ ERROR ++++++++++++++++++++++"
        echo "Appsmith requires ports 80 & 443 to be open. Please shut down any other service(s) that may be running on these ports."
        echo "You can run appsmith on another port following this guide https://docs.appsmith.com/v/v1.2.1/troubleshooting-guide/deployment-errors"
        echo "++++++++++++++++++++++++++++++++++++++++"
        echo ""
        exit 1
    fi
}

install_docker() {
    echo "++++++++++++++++++++++++"
    echo "Setting up docker repos"

    if [[ $package_manager == apt-get ]]; then
        apt_cmd="sudo apt-get --yes --quiet"
        $apt_cmd update
        $apt_cmd install software-properties-common gnupg-agent
        curl -fsSL "https://download.docker.com/linux/$os/gpg" | sudo apt-key add -
        sudo add-apt-repository \
            "deb [arch=amd64] https://download.docker.com/linux/$os $(lsb_release -cs) stable"
        $apt_cmd update
        echo "Installing docker"
        $apt_cmd install docker-ce docker-ce-cli containerd.io
    elif [[ $package_manager == zypper ]]; then
        zypper_cmd="sudo zypper --quiet --no-gpg-checks --non-interactive"
        echo "Installing docker"
        if [[ $os == sles ]]; then
            os_sp="$(cat /etc/*-release | awk -F= '$1 == "VERSION_ID" { gsub(/"/, ""); print $2; exit }')"
            os_arch="$(uname -i)"
            sudo SUSEConnect -p sle-module-containers/$os_sp/$os_arch -r ''
        fi
        $zypper_cmd install docker docker-runc containerd
        sudo systemctl enable docker.service
    else
        yum_cmd="sudo yum --assumeyes --quiet"
        $yum_cmd install yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/$os/docker-ce.repo
        echo "Installing docker"
        $yum_cmd install docker-ce docker-ce-cli containerd.io

    fi

}
install_docker_machine() {

    echo "\nInstalling docker machine ..."

    if [[ $os == "Mac" ]];then
        curl -sL https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/usr/local/bin/docker-machine
        chmod +x /usr/local/bin/docker-machine
    else
        curl -sL https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/tmp/docker-machine
        chmod +x /tmp/docker-machine
        sudo cp /tmp/docker-machine /usr/local/bin/docker-machine

    fi


}

install_docker_compose() {
    if [[ $package_manager == "apt-get" || $package_manager == "zypper" || $package_manager == "yum" ]]; then
        if [[ ! -f /usr/bin/docker-compose ]];then
            echo "++++++++++++++++++++++++"
            echo "Installing docker-compose"
            sudo curl -L "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
            echo "docker-compose installed!"
            echo ""
        fi
    else
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Docker Compose not found" } }'
        URL="https://app.posthog.com/capture"
        HEADER="Content-Type: application/json"

        if has_curl; then
            curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
        elif has_wget; then
            wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
        fi

        echo "+++++++++++ IMPORTANT READ ++++++++++++++++++++++"
        echo "docker-compose not found! Please install docker-compose first and then continue with this installation."
        echo "Refer https://docs.docker.com/compose/install/ for installing docker-compose."
        echo "+++++++++++++++++++++++++++++++++++++++++++++++++"
        exit 1
    fi
}

start_docker() {
    echo "Starting Docker ..."
    if [ $os == "Mac" ]
    then
        open --background -a Docker && while ! docker system info > /dev/null 2>&1; do sleep 1; done
    else 
        if ! sudo systemctl is-active docker.service > /dev/null; then
            echo "Starting docker service"
            sudo systemctl start docker.service
        fi
    fi
}
wait_for_containers_start() {
    local timeout=$1

    # The while loop is important because for-loops don't work for dynamic values
    while [[ $timeout -gt 0 ]]; do
        status_code="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/services/list > /dev/null || true)"
        if [[ status_code -eq 200 ]]; then
            break
        else
            SUPERVISORS="$(curl -so -  http://localhost:8888/druid/indexer/v1/supervisor)"
            LEN_SUPERVISORS="${#SUPERVISORS}"

            if [[ LEN_SUPERVISORS -ne 19 && $timeout -eq 50 ]];then
                echo "No Supervisors found... Re-applying docker compose"
                sudo docker-compose -f ./docker/docker-compose-tiny.yaml up -d
            fi

            echo -ne "Waiting for all containers to start. This check will timeout in $timeout seconds...\r\c"
        fi
        ((timeout--))
        sleep 1
    done

    echo ""
}

bye() {  # Prints a friendly good bye message and exits the script.
    if [ "$?" -ne 0 ]; then
        set +o errexit
        echo "Please share your email if you wish to receive support with the installation"
        read -rp 'Email: ' email

        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Support", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "email": "'"$email"'" } }'
        URL="https://app.posthog.com/capture"
        HEADER="Content-Type: application/json"


        if has_curl; then
            curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
        elif has_wget; then
            wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
        fi


        echo ""
        echo -e "\nWe will reach out to you at the email provided shortly, Exiting for now. Bye! 👋 \n"
        exit 0
    fi
}


echo -e "👋 Thank you for trying out SigNoz! "
echo ""


# Checking OS and assigning package manager
desired_os=0
os=""
echo -e "🕵️  Detecting your OS"
check_os


SIGNOZ_INSTALLATION_ID=$(curl -s 'https://api64.ipify.org')

# Run bye if failure happens
trap bye EXIT


if [[ $desired_os -eq 0 ]];then
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "OS Not Supported" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

fi

check_ports_occupied

# Check is Docker daemon is installed and available. If not, the install & start Docker for Linux machines. We cannot automatically install Docker Desktop on Mac OS
if ! is_command_present docker; then
    if [[ $package_manager == "apt-get" || $package_manager == "zypper" || $package_manager == "yum" ]]; then
        install_docker
    else
        echo ""
        echo "+++++++++++ IMPORTANT READ ++++++++++++++++++++++"
        echo "Docker Desktop must be installed manually on Mac OS to proceed. Docker can only be installed automatically on Ubuntu / openSUSE / SLES / Redhat / Cent OS"
        echo "https://docs.docker.com/docker-for-mac/install/"
        echo "++++++++++++++++++++++++++++++++++++++++++++++++"
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Docker not installed" } }'
        URL="https://app.posthog.com/capture"
        HEADER="Content-Type: application/json"

        if has_curl; then
            curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
        elif has_wget; then
            wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
        fi
        exit 1
    fi
fi

# Install docker-compose
if ! is_command_present docker-compose; then
    install_docker_compose
fi

# if ! is_command_present docker-compose; then
#     install_docker_machine
#     docker-machine create -d virtualbox --virtualbox-memory 3584 signoz

# fi


start_docker


echo ""
echo "Pulling the latest container images for SigNoz"
sudo docker-compose -f ./docker/docker-compose-tiny.yaml pull
echo ""
echo "Starting the SigNoz containers"
# The docker-compose command does some nasty stuff for the `--detach` functionality. So we add a `|| true` so that the
# script doesn't exit because this command looks like it failed to do it's thing.
sudo docker-compose -f ./docker/docker-compose-tiny.yaml up --detach --remove-orphans || true

wait_for_containers_start 60
echo ""

if [[ $status_code -ne 200 ]]; then
    echo "+++++++++++ ERROR ++++++++++++++++++++++"
else
    echo "++++++++++++++++++ SUCCESS ++++++++++++++++++++++"
    echo "Your installation is complete!"
    echo ""
fi


#####   Changing default memory limit of docker     ############
# # Check if memory is less and Confirm to increase size of docker machine
# # https://github.com/docker/machine/releases
# # On OS X

# $ curl -L https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/usr/local/bin/docker-machine && \
# chmod +x /usr/local/bin/docker-machine
# # On Linux

# $ curl -L https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/tmp/docker-machine &&
# chmod +x /tmp/docker-machine &&
# sudo cp /tmp/docker-machine /usr/local/bin/docker-machine

# VBoxManage list vms
# docker-machine stop
# VBoxManage modifyvm default --cpus 2
# VBoxManage modifyvm default --memory 4096
# docker-machine start

# VBoxManage showvminfo default | grep Memory
# VBoxManage showvminfo default | grep CPU

