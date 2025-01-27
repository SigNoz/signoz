#!/bin/bash

set -o errexit

# Variables
BASE_DIR="$(dirname "$(readlink -f "$0")")"
DOCKER_STANDALONE_DIR="docker"
DOCKER_SWARM_DIR="docker-swarm" # TODO: Add docker swarm support

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

# Check if docker compose plugin is present
has_docker_compose_plugin() {
    docker compose version > /dev/null 2>&1
}

is_mac() {
    [[ $OSTYPE == darwin* ]]
}

is_arm64(){
    [[ `uname -m` == 'arm64' || `uname -m` == 'aarch64' ]]
}

check_os() {
    if is_mac; then
        package_manager="brew"
        desired_os=1
        os="Mac"
        return
    fi

    if is_arm64; then
        arch="arm64"
        arch_official="aarch64"
    else
        arch="amd64"
        arch_official="x86_64"
    fi

    platform=$(uname -s | tr '[:upper:]' '[:lower:]')

    os_name="$(cat /etc/*-release | awk -F= '$1 == "NAME" { gsub(/"/, ""); print $2; exit }')"

    case "$os_name" in
        Ubuntu*|Pop!_OS)
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
        Rocky*)
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
    local ports_pattern="3301|4317"

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
        send_event "port_not_available"

        echo "+++++++++++ ERROR ++++++++++++++++++++++"
        echo "SigNoz requires ports 3301 & 4317 to be open. Please shut down any other service(s) that may be running on these ports."
        echo "You can run SigNoz on another port following this guide https://signoz.io/docs/install/troubleshooting/"
        echo "++++++++++++++++++++++++++++++++++++++++"
        echo ""
        exit 1
    fi
}

install_docker() {
    echo "++++++++++++++++++++++++"
    echo "Setting up docker repos"


    if [[ $package_manager == apt-get ]]; then
        apt_cmd="$sudo_cmd apt-get --yes --quiet"
        $apt_cmd update
        $apt_cmd install software-properties-common gnupg-agent
        curl -fsSL "https://download.docker.com/linux/$os/gpg" | $sudo_cmd apt-key add -
        $sudo_cmd add-apt-repository \
            "deb [arch=$arch] https://download.docker.com/linux/$os $(lsb_release -cs) stable"
        $apt_cmd update
        echo "Installing docker"
        $apt_cmd install docker-ce docker-ce-cli containerd.io
    elif [[ $package_manager == zypper ]]; then
        zypper_cmd="$sudo_cmd zypper --quiet --no-gpg-checks --non-interactive"
        echo "Installing docker"
        if [[ $os == sles ]]; then
            os_sp="$(cat /etc/*-release | awk -F= '$1 == "VERSION_ID" { gsub(/"/, ""); print $2; exit }')"
            os_arch="$(uname -i)"
            SUSEConnect -p sle-module-containers/$os_sp/$os_arch -r ''
        fi
        $zypper_cmd install docker docker-runc containerd
        $sudo_cmd systemctl enable docker.service
    elif [[ $package_manager == yum && $os == 'amazon linux' ]]; then
        echo
        echo "Amazon Linux detected ... "
        echo
        # yum install docker
        # service docker start
        $sudo_cmd yum install -y amazon-linux-extras
        $sudo_cmd amazon-linux-extras enable docker
        $sudo_cmd yum install -y docker
    else

        yum_cmd="$sudo_cmd yum --assumeyes --quiet"
        $yum_cmd install yum-utils
        $sudo_cmd yum-config-manager --add-repo https://download.docker.com/linux/$os/docker-ce.repo
        echo "Installing docker"
        $yum_cmd install docker-ce docker-ce-cli containerd.io
    fi
}

compose_version () {
    local compose_version
    compose_version="$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)"
    echo "${compose_version:-v2.18.1}"
}

install_docker_compose() {
    if [[ $package_manager == "apt-get" || $package_manager == "zypper" || $package_manager == "yum" ]]; then
        if [[ ! -f /usr/bin/docker-compose ]];then
            echo "++++++++++++++++++++++++"
            echo "Installing docker-compose"
            compose_url="https://github.com/docker/compose/releases/download/$(compose_version)/docker-compose-$platform-$arch_official"
            echo "Downloading docker-compose from $compose_url"
            $sudo_cmd curl -L "$compose_url" -o /usr/local/bin/docker-compose
            $sudo_cmd chmod +x /usr/local/bin/docker-compose
            $sudo_cmd ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
            echo "docker-compose installed!"
            echo ""
        fi
    else
        send_event "docker_compose_not_found"

        echo "+++++++++++ IMPORTANT READ ++++++++++++++++++++++"
        echo "docker-compose not found! Please install docker-compose first and then continue with this installation."
        echo "Refer https://docs.docker.com/compose/install/ for installing docker-compose."
        echo "+++++++++++++++++++++++++++++++++++++++++++++++++"
        exit 1
    fi
}

start_docker() {
    echo -e "🐳 Starting Docker ...\n"
    if [[ $os == "Mac" ]]; then
        open --background -a Docker && while ! docker system info > /dev/null 2>&1; do sleep 1; done
    else
        if ! $sudo_cmd systemctl is-active docker.service > /dev/null; then
            echo "Starting docker service"
            $sudo_cmd systemctl start docker.service
        fi
        if [[ -z $sudo_cmd ]]; then
            if ! docker ps > /dev/null && true; then
                request_sudo
            fi
        fi
    fi
}

wait_for_containers_start() {
    local timeout=$1

    # The while loop is important because for-loops don't work for dynamic values
    while [[ $timeout -gt 0 ]]; do
        status_code="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3301/api/v1/health?live=1" || true)"
        if [[ status_code -eq 200 ]]; then
            break
        else
            echo -ne "Waiting for all containers to start. This check will timeout in $timeout seconds ...\r\c"
        fi
        ((timeout--))
        sleep 1
    done

    echo ""
}

bye() {  # Prints a friendly good bye message and exits the script.
    # Switch back to the original directory
    popd > /dev/null 2>&1
    if [[ "$?" -ne 0 ]]; then
        set +o errexit

        echo "🔴 The containers didn't seem to start correctly. Please run the following command to check containers that may have errored out:"
        echo ""
        echo -e "cd ${DOCKER_STANDALONE_DIR}"
        echo -e "$sudo_cmd $docker_compose_cmd ps -a"

        echo "Please read our troubleshooting guide https://signoz.io/docs/install/troubleshooting/"
        echo "or reach us for support in #help channel in our Slack Community https://signoz.io/slack"
        echo "++++++++++++++++++++++++++++++++++++++++"

        if [[ $email == "" ]]; then
            echo -e "\n📨 Please share your email to receive support with the installation"
            read -rp 'Email: ' email

            while [[ $email == "" ]]
            do
                read -rp 'Email: ' email
            done
        fi

        send_event "installation_support"


        echo ""
        echo -e "\nWe will reach out to you at the email provided shortly, Exiting for now. Bye! 👋 \n"
        exit 0
    fi
}

request_sudo() {
    if hash sudo 2>/dev/null; then
        echo -e "\n\n🙇 We will need sudo access to complete the installation."
        if (( $EUID != 0 )); then
            sudo_cmd="sudo"
            echo -e "Please enter your sudo password, if prompted."
            if ! $sudo_cmd -l | grep -e "NOPASSWD: ALL" > /dev/null && ! $sudo_cmd -v; then
                echo "Need sudo privileges to proceed with the installation."
                exit 1;
            fi

            echo -e "Got it! Thanks!! 🙏\n"
            echo -e "Okay! We will bring up the SigNoz cluster from here 🚀\n"
        fi
	fi
}

echo ""
echo -e "👋 Thank you for trying out SigNoz! "
echo ""

sudo_cmd=""
docker_compose_cmd=""

# Check sudo permissions
if (( $EUID != 0 )); then
    echo "🟡 Running installer with non-sudo permissions."
    echo "   In case of any failure or prompt, please consider running the script with sudo privileges."
    echo ""
else
    sudo_cmd="sudo"
fi

# Checking OS and assigning package manager
desired_os=0
os=""
email=""
echo -e "🌏 Detecting your OS ...\n"
check_os

# Obtain unique installation id
# sysinfo="$(uname -a)"
# if [[ $? -ne 0 ]]; then
#     uuid="$(uuidgen)"
#     uuid="${uuid:-$(cat /proc/sys/kernel/random/uuid)}"
#     sysinfo="${uuid:-$(cat /proc/sys/kernel/random/uuid)}"
# fi
if ! sysinfo="$(uname -a)"; then
    uuid="$(uuidgen)"
    uuid="${uuid:-$(cat /proc/sys/kernel/random/uuid)}"
    sysinfo="${uuid:-$(cat /proc/sys/kernel/random/uuid)}"
fi

digest_cmd=""
if hash shasum 2>/dev/null; then
    digest_cmd="shasum -a 256"
elif hash sha256sum 2>/dev/null; then
    digest_cmd="sha256sum"
elif hash openssl 2>/dev/null; then
    digest_cmd="openssl dgst -sha256"
fi

if [[ -z $digest_cmd ]]; then
    SIGNOZ_INSTALLATION_ID="$sysinfo"
else
    SIGNOZ_INSTALLATION_ID=$(echo "$sysinfo" | $digest_cmd | grep -E -o '[a-zA-Z0-9]{64}')
fi

setup_type='clickhouse'

# Run bye if failure happens
trap bye EXIT

URL="https://api.segment.io/v1/track"
HEADER_1="Content-Type: application/json"
HEADER_2="Authorization: Basic OWtScko3b1BDR1BFSkxGNlFqTVBMdDVibGpGaFJRQnI="

send_event() {
    error=""

    case "$1" in
        'install_started')
            event="Installation Started"
            ;;
        'os_not_supported')
            event="Installation Error"
            error="OS Not Supported"
            ;;
        'docker_not_installed')
            event="Installation Error"
            error="Docker not installed"
            ;;
        'docker_compose_not_found')
            event="Installation Error"
            event="Docker Compose not found"
            ;;
        'port_not_available')
            event="Installation Error"
            error="port not available"
            ;;
        'installation_error_checks')
            event="Installation Error - Checks"
            error="Containers not started"
            others='"data": "some_checks",'
            ;;
        'installation_support')
            event="Installation Support"
            others='"email": "'"$email"'",'
            ;;
        'installation_success')
            event="Installation Success"
            ;;
        'identify_successful_installation')
            event="Identify Successful Installation"
            others='"email": "'"$email"'",'
            ;;
        *)
            print_error "unknown event type: $1"
            exit 1
            ;;
    esac

    if [[ "$error" != "" ]]; then
        error='"error": "'"$error"'", '
    fi

    DATA='{ "anonymousId": "'"$SIGNOZ_INSTALLATION_ID"'", "event": "'"$event"'", "properties": { "os": "'"$os"'", '"$error $others"' "setup_type": "'"$setup_type"'" } }'

    if has_curl; then
        curl -sfL -d "$DATA" --header "$HEADER_1" --header "$HEADER_2" "$URL" > /dev/null 2>&1
    elif has_wget; then
        wget -q --post-data="$DATA" --header "$HEADER_1" --header "$HEADER_2" "$URL" > /dev/null 2>&1
    fi
}

send_event "install_started"

if [[ $desired_os -eq 0 ]]; then
    send_event "os_not_supported"
fi

# Check is Docker daemon is installed and available. If not, the install & start Docker for Linux machines. We cannot automatically install Docker Desktop on Mac OS
if ! is_command_present docker; then

    if [[ $package_manager == "apt-get" || $package_manager == "zypper" || $package_manager == "yum" ]]; then
        request_sudo
        install_docker
        # enable docker without sudo from next reboot
        sudo usermod -aG docker "${USER}"
    elif is_mac; then
        echo ""
        echo "+++++++++++ IMPORTANT READ ++++++++++++++++++++++"
        echo "Docker Desktop must be installed manually on Mac OS to proceed. Docker can only be installed automatically on Ubuntu / openSUSE / SLES / Redhat / Cent OS"
        echo "https://docs.docker.com/docker-for-mac/install/"
        echo "++++++++++++++++++++++++++++++++++++++++++++++++"

        send_event "docker_not_installed"
        exit 1
    else
        echo ""
        echo "+++++++++++ IMPORTANT READ ++++++++++++++++++++++"
        echo "Docker must be installed manually on your machine to proceed. Docker can only be installed automatically on Ubuntu / openSUSE / SLES / Redhat / Cent OS"
        echo "https://docs.docker.com/get-docker/"
        echo "++++++++++++++++++++++++++++++++++++++++++++++++"

        send_event "docker_not_installed"
        exit 1
    fi
fi

if has_docker_compose_plugin; then
    echo "docker compose plugin is present, using it"
    docker_compose_cmd="docker compose"
# Install docker-compose
else
    docker_compose_cmd="docker-compose"
    if ! is_command_present docker-compose; then
        request_sudo
        install_docker_compose
    fi
fi

start_docker

# Switch to the Docker Standalone directory
pushd "${BASE_DIR}/${DOCKER_STANDALONE_DIR}" > /dev/null 2>&1

# check for open ports, if signoz is not installed
if is_command_present docker-compose; then
    if $sudo_cmd $docker_compose_cmd ps | grep "signoz-query-service" | grep -q "healthy" > /dev/null 2>&1; then
        echo "SigNoz already installed, skipping the occupied ports check"
    else
        check_ports_occupied
    fi
fi

echo ""
echo -e "\n🟡 Pulling the latest container images for SigNoz.\n"
$sudo_cmd $docker_compose_cmd pull

echo ""
echo "🟡 Starting the SigNoz containers. It may take a few minutes ..."
echo
# The $docker_compose_cmd command does some nasty stuff for the `--detach` functionality. So we add a `|| true` so that the
# script doesn't exit because this command looks like it failed to do it's thing.
$sudo_cmd $docker_compose_cmd up --detach --remove-orphans || true

wait_for_containers_start 60
echo ""

if [[ $status_code -ne 200 ]]; then
    echo "+++++++++++ ERROR ++++++++++++++++++++++"
    echo "🔴 The containers didn't seem to start correctly. Please run the following command to check containers that may have errored out:"
    echo ""

    echo "cd ${DOCKER_STANDALONE_DIR}"
    echo "$sudo_cmd $docker_compose_cmd ps -a"
    echo ""

    echo "Try bringing down the containers and retrying the installation"
    echo "cd ${DOCKER_STANDALONE_DIR}"
    echo "$sudo_cmd $docker_compose_cmd down -v"
    echo ""

    echo "Please read our troubleshooting guide https://signoz.io/docs/install/troubleshooting/"
    echo "or reach us on SigNoz for support https://signoz.io/slack"
    echo "++++++++++++++++++++++++++++++++++++++++"

    send_event "installation_error_checks"
    exit 1

else
    send_event "installation_success"

    echo "++++++++++++++++++ SUCCESS ++++++++++++++++++++++"
    echo ""
    echo "🟢 Your installation is complete!"
    echo ""
    echo -e "🟢 Your frontend is running on http://localhost:3301"
    echo ""
    echo "ℹ️  By default, retention period is set to 15 days for logs and traces, and 30 days for metrics."
    echo -e "To change this, navigate to the General tab on the Settings page of SigNoz UI. For more details, refer to https://signoz.io/docs/userguide/retention-period \n"

    echo "ℹ️  To bring down SigNoz and clean volumes:"
    echo ""
    echo "cd ${DOCKER_STANDALONE_DIR}"
    echo "$sudo_cmd $docker_compose_cmd down -v"

    echo ""
    echo "+++++++++++++++++++++++++++++++++++++++++++++++++"
    echo ""
    echo "👉 Need help in Getting Started?"
    echo -e "Join us on Slack https://signoz.io/slack"
    echo ""
    echo -e "\n📨 Please share your email to receive support & updates about SigNoz!"
    read -rp 'Email: ' email

    while [[ $email == "" ]]
    do
        read -rp 'Email: ' email
    done

    send_event "identify_successful_installation"
fi

echo -e "\n🙏 Thank you!\n"
