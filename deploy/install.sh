#!/bin/bash

set -o errexit

# Regular Colors
Black='\033[0;30m'        # Black
Red='\[\e[0;31m\]'        # Red
Green='\033[0;32m'        # Green
Yellow='\033[0;33m'       # Yellow
Blue='\033[0;34m'         # Blue
Purple='\033[0;35m'       # Purple
Cyan='\033[0;36m'         # Cyan
White='\033[0;37m'        # White
NC='\033[0m' # No Color

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
        Amazon\ Linux*)
            desired_os=1
            os="amazon linux"
            package_manager="yum"
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
            os="Not Found: $os_name"
    esac
}


# This function checks if the relevant ports required by SigNoz are available or not
# The script should error out in case they aren't available
check_ports_occupied() {
    local port_check_output
    local ports_pattern="80|3000|8080"

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
        echo "SigNoz requires ports 80 & 443 to be open. Please shut down any other service(s) that may be running on these ports."
        echo "You can run SigNoz on another port following this guide https://signoz.io/docs/deployment/docker#troubleshooting"
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
    elif [[ $package_manager == yum && $os == 'amazon linux' ]]; then
        echo
        echo "Amazon Linux detected ... "
        echo
        sudo yum install docker
        sudo service docker start
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
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Docker Compose not found", "setup_type": "'"$setup_type"'" } }'
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
    if [ $os = "Mac" ]; then
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
        status_code="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/services/list || true)"
        if [[ status_code -eq 200 ]]; then
            break
        else
            if [ $setup_type == 'druid' ]; then
                SUPERVISORS="$(curl -so -  http://localhost:8888/druid/indexer/v1/supervisor)"
                LEN_SUPERVISORS="${#SUPERVISORS}"

                if [[ LEN_SUPERVISORS -ne 19 && $timeout -eq 50 ]];then
                    echo -e "\n🟠 Supervisors taking time to start ⏳ ... let's wait for some more time ⏱️\n\n"
                    sudo docker-compose -f ./docker/druid-kafka-setup/docker-compose-tiny.yaml up -d
                fi
            fi

            echo -ne "Waiting for all containers to start. This check will timeout in $timeout seconds ...\r\c"
        fi
        ((timeout--))
        sleep 1
    done

    echo ""
}

bye() {  # Prints a friendly good bye message and exits the script.
    if [ "$?" -ne 0 ]; then
        set +o errexit

        echo "🔴 The containers didn't seem to start correctly. Please run the following command to check containers that may have errored out:"
        echo ""
        if [ $setup_type == 'clickhouse' ]; then
            echo -e "sudo docker-compose -f docker/clickhouse-setup/docker-compose.yaml ps -a"
        else   
            echo -e "sudo docker-compose -f docker/druid-kafka-setup/docker-compose-tiny.yaml ps -a"
        fi
        # echo "Please read our troubleshooting guide https://signoz.io/docs/deployment/docker#troubleshooting"
        echo "or reach us on SigNoz for support https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"
        echo "++++++++++++++++++++++++++++++++++++++++"

        echo -e "\n📨 Please share your email to receive support with the installation"
        read -rp 'Email: ' email

        while [[ $email == "" ]]
        do
            read -rp 'Email: ' email
        done

        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Support", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "email": "'"$email"'", "setup_type": "'"$setup_type"'" } }'
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
echo -e "Detecting your OS ..."
check_os

SIGNOZ_INSTALLATION_ID=$(curl -s 'https://api64.ipify.org')

echo ""

echo -e "👉 ${RED}Two ways to go forward\n"  
echo -e "${RED}1) ClickHouse as database (default)\n"  
echo -e "${RED}2) Kafka + Druid as datastore \n"  
read -p "⚙️  Enter your preference (1/2):" choice_setup 

while [[ $choice_setup != "1"   &&  $choice_setup != "2" && $choice_setup != "" ]]
do
    # echo $choice_setup
    echo -e "\n❌ ${CYAN}Please enter either 1 or 2"
    read -p "⚙️  Enter your preference (1/2):  " choice_setup 
    # echo $choice_setup
done

if [[ $choice_setup == "1" || $choice_setup == "" ]];then
    setup_type='clickhouse'
else
    setup_type='druid'
fi

echo -e "\n✅ ${CYAN}You have chosen: ${setup_type} setup\n"

# Run bye if failure happens
trap bye EXIT


DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Started", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "setup_type": "'"$setup_type"'" } }'
URL="https://app.posthog.com/capture"
HEADER="Content-Type: application/json"

if has_curl; then
    curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
elif has_wget; then
    wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
fi


if [[ $desired_os -eq 0 ]];then
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "OS Not Supported", "setup_type": "'"$setup_type"'" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

fi

# check_ports_occupied

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
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Docker not installed", "setup_type": "'"$setup_type"'" } }'
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



start_docker


# sudo docker-compose -f ./docker/clickhouse-setup/docker-compose.yaml up -d --remove-orphans || true


echo ""
echo -e "\n🟡 Pulling the latest container images for SigNoz. To run as sudo it may ask for system password\n"
if [ $setup_type == 'clickhouse' ]; then
    sudo docker-compose -f ./docker/clickhouse-setup/docker-compose.yaml pull
else
    sudo docker-compose -f ./docker/druid-kafka-setup/docker-compose-tiny.yaml pull
fi


echo ""
echo "🟡 Starting the SigNoz containers. It may take a few minutes ..."
echo
# The docker-compose command does some nasty stuff for the `--detach` functionality. So we add a `|| true` so that the
# script doesn't exit because this command looks like it failed to do it's thing.
if [ $setup_type == 'clickhouse' ]; then
    sudo docker-compose -f ./docker/clickhouse-setup/docker-compose.yaml up --detach --remove-orphans || true
else
    sudo docker-compose -f ./docker/druid-kafka-setup/docker-compose-tiny.yaml up --detach --remove-orphans || true
fi

wait_for_containers_start 60
echo ""

if [[ $status_code -ne 200 ]]; then
    echo "+++++++++++ ERROR ++++++++++++++++++++++"
    echo "🔴 The containers didn't seem to start correctly. Please run the following command to check containers that may have errored out:"
    echo ""
    if [ $setup_type == 'clickhouse' ]; then
        echo -e "sudo docker-compose -f docker/clickhouse-setup/docker-compose.yaml ps -a"
    else
        echo -e "sudo docker-compose -f docker/druid-kafka-setup/docker-compose-tiny.yaml ps -a"
    fi
    echo "Please read our troubleshooting guide https://signoz.io/docs/deployment/docker/#troubleshooting-of-common-issues"
    echo "or reach us on SigNoz for support https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"
    echo "++++++++++++++++++++++++++++++++++++++++"

    if [ $setup_type == 'clickhouse' ]; then
        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error - Checks", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Containers not started", "data": "some_checks", "setup_type": "'"$setup_type"'" } }'
    else
        SUPERVISORS="$(curl -so -  http://localhost:8888/druid/indexer/v1/supervisor)"

        DATASOURCES="$(curl -so -  http://localhost:8888/druid/coordinator/v1/datasources)"

        DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Error - Checks", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "error": "Containers not started", "SUPERVISORS": '"$SUPERVISORS"', "DATASOURCES": '"$DATASOURCES"', "setup_type": "'"$setup_type"'" } }'
    fi

    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

    exit 1

else
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Installation Success", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'"}, "setup_type": "'"$setup_type"'" }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi
    echo "++++++++++++++++++ SUCCESS ++++++++++++++++++++++"
    echo ""
    echo "🟢 Your installation is complete!"
    echo ""
    echo -e "🟢 Your frontend is running on http://localhost:3000"
    echo ""

    if [ $setup_type == 'clickhouse' ]; then
        echo "ℹ️  To bring down SigNoz and clean volumes : sudo docker-compose -f docker/clickhouse-setup/docker-compose.yaml down -v"
    else
        echo "ℹ️  To bring down SigNoz and clean volumes : sudo docker-compose -f docker/druid-kafka-setup/docker-compose-tiny.yaml down -v"
    fi

    echo ""
    echo "+++++++++++++++++++++++++++++++++++++++++++++++++"
    echo ""
    echo "👉 Need help Getting Started?"
    echo -e "Join us on Slack https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"
    echo ""
    echo -e "\n📨 Please share your email to receive support & updates about SigNoz!"
    read -rp 'Email: ' email

    while [[ $email == "" ]]
    do
        read -rp 'Email: ' email
    done
    
    DATA='{ "api_key": "H-htDCae7CR3RV57gUzmol6IAKtm5IMCvbcm_fwnL-w", "type": "capture", "event": "Identify Successful Installation", "distinct_id": "'"$SIGNOZ_INSTALLATION_ID"'", "properties": { "os": "'"$os"'", "email": "'"$email"'", "setup_type": "'"$setup_type"'" } }'
    URL="https://app.posthog.com/capture"
    HEADER="Content-Type: application/json"

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header="$HEADER" "$URL" > /dev/null 2>&1
    fi

fi

echo -e "\n🙏 Thank you!\n"
