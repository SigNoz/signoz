#! /bin/bash
readonly NAME="volume-migration"
readonly DOCKER_COMPOSE_DIR="deploy/docker"
readonly DOCKER_SWARM_COMPOSE_DIR="deploy/docker-swarm"
readonly STANDALONE_DATA_DIR="${DOCKER_COMPOSE_DIR}/clickhouse-setup/data"
readonly SWARM_DATA_DIR="${DOCKER_SWARM_COMPOSE_DIR}/clickhouse-setup/data"
readonly SIGNOZ_NETWORK="signoz-net"
readonly SIGNOZ_NETWORK_OLD="clickhouse-setup_default"

# Exit on error, undefined variables, and pipe failures
set -uo pipefail

################################################################################
## Global Variables
################################################################################

# Runtime variables
SCRIPT_PATH=$(readlink -f "$0")
BASE_DIR=$(dirname "${SCRIPT_PATH}")

# Command line arguments
DOCKER_COMPOSE_CMD="docker compose"
DEPLOYMENT_TYPE=""
MIGRATION_COMPONENT=""
OPERATION=""
# SIGNOZ_ROOT_DIR="${HOME}/signoz"
SIGNOZ_ROOT_DIR="${BASE_DIR}/../.."
SILENT="false"

################################################################################
## Helper Functions
################################################################################

##############################################################################
# Prints help message
# Arguments:
#   None
# Outputs:
#   Help text to stdout
##############################################################################
help() {
  printf "NAME\n"
  printf "\t%s - Migrate data from bind mounts to Docker volumes\n\n" "${NAME}"
  printf "USAGE\n"
  printf "\t%s [-d deployment-type] [-m migration-component] [-o operation] [-p signoz-root-dir] [-s silent] [-h]\n\n" "${NAME}"
  printf "OPTIONS:\n"
  printf "\t-d\tDeployment type (standalone, swarm)\n"
  printf "\t-m\tMigration component (all, clickhouse, zookeeper, signoz, alertmanager)\n"
  printf "\t-o\tOperation (migrate, post-migrate)\n"
  printf "\t-p\tSignoz root directory (default: ~/signoz)\n"
  printf "\t-s\tSilent mode (true, false)\n"
  printf "\t-h\tShow this help message\n"
}

##############################################################################
# Prints message to stdout if silent mode is not enabled.
# Arguments:
#   Message
# Outputs:
#   Message to stdout
##############################################################################
print() {
  if [[ "${SILENT}" == "true" ]]; then
    return
  fi
  echo "${NAME}: $*"
}

##############################################################################
# Prints error message to stderr
# Arguments:
#   Error message
# Outputs:
#   Error message to stderr
##############################################################################
err() {
  echo "${NAME}: $*" >&2
}

##############################################################################
# Check if docker is available
# Arguments:
#   None
# Returns:
#   None
##############################################################################
docker_check() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is not available, are you sure you have SigNoz already installed using Docker?"
    exit 1
  fi
}

##############################################################################
# Get the docker compose command
# Arguments:
#   None
# Returns:
#   docker compose if available, otherwise docker-compose
##############################################################################
docker_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo 'docker compose'
  else
    echo 'docker-compose'
  fi
}

##############################################################################
# Start standalone services
# Arguments:
#   deployment_type (standalone, swarm)
#   signoz_root_dir (defaults to the SigNoz root directory)
# Returns:
#   None
##############################################################################
start_services() {
  local deployment_type=$1
  local signoz_root_dir=$2
  local compose_dir

  compose_dir=$(get_compose_dir "${deployment_type}" "${signoz_root_dir}")
  if [[ "${deployment_type}" == "standalone" ]]; then
    print "Starting Docker Standalone services"
    ${DOCKER_COMPOSE_CMD} -f "${compose_dir}/docker-compose.yaml" up -d --remove-orphans
  elif [[ "${deployment_type}" == "swarm" ]]; then
    print "Starting Docker Swarm services"
    docker stack deploy -c "${compose_dir}/docker-compose.yaml" signoz
  fi
}

##############################################################################
# Docker network check
# Arguments:
#   network name
# Returns:
#   0 if network exists, 1 if network does not exist
##############################################################################
docker_network_check() {
  local network=$1
  local exit_status=1
  if ! docker network inspect "${network}" >/dev/null 2>&1; then
    exit_status=0
  fi
  return "${exit_status}"
}

##############################################################################
# Cleanup Docker Standalone
# Arguments:
#   compose_dir path to the compose directory
# Returns:
#   None
##############################################################################
cleanup_standalone() {
  local compose_dir=$1
  local container_using_signoz_net=""
  local containers_array=()
  local signoz_network

  print "Stopping Docker Standalone services"
  ${DOCKER_COMPOSE_CMD} -f "${compose_dir}/docker-compose.yaml" down
  print "Cleaning up all containers and networks associated to old clickhouse-setup project"
  docker ps -q --filter "label=com.docker.compose.project=clickhouse-setup" | xargs docker stop >/dev/null 2>&1
  docker ps -aq --filter "label=com.docker.compose.project=clickhouse-setup" | xargs docker rm >/dev/null 2>&1

  if ! docker_network_check "${SIGNOZ_NETWORK}"; then
    signoz_network="${SIGNOZ_NETWORK}"
  elif ! docker_network_check "${SIGNOZ_NETWORK_OLD}"; then
    signoz_network="${SIGNOZ_NETWORK_OLD}"
  else
    print "no signoz network found, skipping standalone cleanup"
    return 0
  fi

  container_using_signoz_net=$(docker network inspect "${signoz_network}" --format '{{ range $key, $value := .Containers }}{{printf "%s " .Name}}{{ end }}')
  IFS=" " read -ra containers_array <<<"${container_using_signoz_net}"
  for container in "${containers_array[@]}"; do
    docker stop "${container}" >/dev/null 2>&1
    docker rm "${container}" >/dev/null 2>&1
  done
  docker network rm "${signoz_network}" >/dev/null 2>&1
}

##############################################################################
# Cleanup Docker Swarm
# Arguments:
#   compose_dir path to the compose directory
# Returns:
#   None
##############################################################################
cleanup_swarm() {
  local compose_dir=$1
  print "Stopping Docker Swarm services"
  docker stack rm -c "${compose_dir}/docker-compose.yaml" signoz
}

##############################################################################
# Stop services in Docker Standalone and Swarm
# Arguments:
#   deployment_type (standalone, swarm)
#   signoz_root_dir (default: ~/signoz)
# Returns:
#   None
##############################################################################
stop_services() {
  local deployment_type=$1
  local signoz_root_dir=$2
  local compose_dir

  compose_dir=$(get_compose_dir "${deployment_type}" "${signoz_root_dir}")

  if [[ "${deployment_type}" == "standalone" ]]; then
    cleanup_standalone "${compose_dir}"
  elif [[ "${deployment_type}" == "swarm" ]]; then
    cleanup_swarm "${compose_dir}"
  fi
}

##############################################################################
# Get the compose directory
# Arguments:
#   deployment_type       (standalone, swarm)
#   signoz_root_directory (default: ~/signoz)
# Returns:
#   compose directory
##############################################################################
get_compose_dir() {
  local deployment_type=$1
  local signoz_root_dir=$2

  if [[ "${deployment_type}" == "standalone" ]]; then
    echo "${signoz_root_dir}/${DOCKER_COMPOSE_DIR}"
  elif [[ "${deployment_type}" == "swarm" ]]; then
    echo "${signoz_root_dir}/${DOCKER_SWARM_COMPOSE_DIR}"
  fi
}

##############################################################################
# Get the data directory
# Arguments:
#   deployment_type         (standalone, swarm)
#   signoz_root_directory  (default: ~/signoz)
# Returns:
#   data directory
##############################################################################
get_data_dir() {
  local deployment_type=$1
  local signoz_root_dir=$2

  if [[ "${deployment_type}" == "standalone" ]]; then
    echo "${signoz_root_dir}/${STANDALONE_DATA_DIR}"
  elif [[ "${deployment_type}" == "swarm" ]]; then
    echo "${signoz_root_dir}/${SWARM_DATA_DIR}"
  fi
}

################################################################################
## Component Functions
################################################################################

migrate_clickhouse() {
  local data_dir=$1
  local uidgid="101:101"
  migrate "clickhouse" "${data_dir}/clickhouse" "signoz-clickhouse" "${uidgid}"
  if [[ -f "${data_dir}/clickhouse-2/uuid" ]]; then
    migrate "clickhouse-2" "${data_dir}/clickhouse-2" "signoz-clickhouse-2" "${uidgid}"
  fi
  if [[ -f "${data_dir}/clickhouse-3/uuid" ]]; then
    migrate "clickhouse-3" "${data_dir}/clickhouse-3" "signoz-clickhouse-3" "${uidgid}"
  fi
}

migrate_zookeeper() {
  local data_dir=$1
  local uidgid="1000:1000"
  migrate "zookeeper" "${data_dir}/zookeeper-1" "signoz-zookeeper-1" "${uidgid}"
  if [[ -d "${data_dir}/zookeeper-2/data" ]]; then
    migrate "zookeeper-2" "${data_dir}/zookeeper-2" "signoz-zookeeper-2" "${uidgid}"
  fi
  if [[ -d "${data_dir}/zookeeper-3/data" ]]; then
    migrate "zookeeper-3" "${data_dir}/zookeeper-3" "signoz-zookeeper-3" "${uidgid}"
  fi
}

migrate_signoz() {
  local data_dir=$1
  migrate "signoz" "${data_dir}/signoz" "signoz-sqlite" ""
}

migrate_alertmanager() {
  local data_dir=$1
  migrate "alertmanager" "${data_dir}/alertmanager" "signoz-alertmanager" ""
}

post_migrate_clickhouse() {
  local data_dir=$1

  post_migrate "clickhouse" "${data_dir}/clickhouse"
  if [[ -d "${data_dir}/clickhouse-2" ]]; then
    post_migrate "clickhouse-2" "${data_dir}/clickhouse-2"
  fi
  if [[ -d "${data_dir}/clickhouse-3" ]]; then
    post_migrate "clickhouse-3" "${data_dir}/clickhouse-3"
  fi
}

post_migrate_zookeeper() {
  local data_dir=$1

  post_migrate "zookeeper" "${data_dir}/zookeeper-1"
  if [[ -d "${data_dir}/zookeeper-2" ]]; then
    post_migrate "zookeeper-2" "${data_dir}/zookeeper-2"
  fi
  if [[ -d "${data_dir}/zookeeper-3" ]]; then
    post_migrate "zookeeper-3" "${data_dir}/zookeeper-3"
  fi
}

post_migrate_signoz() {
  local data_dir=$1
  post_migrate "signoz" "${data_dir}/signoz"
}

post_migrate_alertmanager() {
  local data_dir=$1
  post_migrate "alertmanager" "${data_dir}/alertmanager"
}

################################################################################
## Main Functions
################################################################################

##############################################################################
# Migrate data from bind mounts to new volume
# Arguments:
#   migration_component component name: all, clickhouse, zookeeper, signoz, alertmanager
#   bind_mounts path to the directory of the bind mounts
#   new_volume name of the new volume
# Returns:
#   None
##############################################################################
migrate() {
  local migration_component=$1
  local bind_mounts=$2
  local new_volume=$3
  local owner_uidgid=$4
  local commands=""

  echo "Creating new volume ${new_volume}"
  docker volume create "${new_volume}" --label "com.docker.compose.project=signoz" >/dev/null 2>&1

  echo "Migrating ${migration_component} from bind mounts to the new volume ${new_volume}"
  if [[ "${migration_component}" == "clickhouse" ]]; then
    echo "Please be patient, this may take a while for clickhouse migration..."
  fi
  if [[ -n "${owner_uidgid}" ]]; then
    commands="cp -rp /data/* /volume; chown -R ${owner_uidgid} /volume"
  else
    commands="cp -rp /data/* /volume"
  fi
  if docker run --rm -v "${bind_mounts}":/data -v "${new_volume}":/volume alpine sh -c "${commands}" 2>&1; then
    echo "Migration of ${migration_component} from bind mounts to the new volume ${new_volume} completed successfully"
  else
    echo "Migration of ${migration_component} from bind mounts to the new volume ${new_volume} failed"
    exit 1
  fi
}

##############################################################################
# Post-migration cleanup
# Arguments:
#   migration_component component name: clickhouse, zookeeper, signoz, alertmanager
#   data_dir path to the directory of the data
# Returns:
#   None
##############################################################################
post_migrate() {
  local migration_component=$1
  local data_dir=$2
  echo "Running post-migration cleanup for ${migration_component}"
  if [[ "${migration_component}" == "clickhouse" ]]; then
    echo "Please be patient, this may take a while for clickhouse post-migration cleanup..."
  fi
  if docker run --rm -v "${data_dir}":/data alpine sh -c "rm -rf /data/*" 2>&1; then
    echo "Post-migration cleanup for ${migration_component} completed successfully"
  else
    echo "Post-migration cleanup for ${migration_component} failed"
    exit 1
  fi
}

##############################################################################
# Run the migration
# Arguments:
#   deployment_type deployment type (standalone, swarm)
#   migration_component migration component (all, clickhouse, zookeeper, signoz, alertmanager)
#   signoz_root_dir signoz root directory (default: ~/signoz)
# Returns:
#   None
##############################################################################
run_migration() {
  local deployment_type=$1
  local migration_component=$2
  local signoz_root_dir=$3
  local data_dir

  data_dir=$(get_data_dir "${deployment_type}" "${signoz_root_dir}")

  stop_services "${deployment_type}" "${signoz_root_dir}"

  case "${migration_component}" in
    "all")
      migrate_clickhouse "${data_dir}"
      migrate_zookeeper "${data_dir}"
      migrate_signoz "${data_dir}"
      migrate_alertmanager "${data_dir}"
      ;;
    "clickhouse")
      migrate_clickhouse "${data_dir}"
      ;;
    "zookeeper")
      migrate_zookeeper "${data_dir}"
      ;;
    "signoz")
      migrate_signoz "${data_dir}"
      ;;
    "alertmanager")
      migrate_alertmanager "${data_dir}"
      ;;
    *)
      help
      exit 1
      ;;
  esac

  start_services "${deployment_type}" "${signoz_root_dir}"
}

################################################################################
# Run post-migration cleanup
# Arguments:
#   deployment_type deployment type (standalone, swarm)
#   migration_component migration component (all, clickhouse, zookeeper, signoz, alertmanager)
#   signoz_root_dir signoz root directory (default: ~/signoz)
# Returns:
#   None
################################################################################
run_post_migration() {
  local deployment_type=$1
  local migration_component=$2
  local signoz_root_dir=$3
  local data_dir
  data_dir=$(get_data_dir "${deployment_type}" "${signoz_root_dir}")

  case "${migration_component}" in
    "all")
      post_migrate_clickhouse "${data_dir}"
      post_migrate_zookeeper "${data_dir}"
      post_migrate_signoz "${data_dir}"
      post_migrate_alertmanager "${data_dir}"
      ;;
    "clickhouse")
      post_migrate_clickhouse "${data_dir}"
      ;;
    "zookeeper")
      post_migrate_zookeeper "${data_dir}"
      ;;
    "signoz")
      post_migrate_signoz "${data_dir}"
      ;;
    "alertmanager")
      post_migrate_alertmanager "${data_dir}"
      ;;
    *)
      help
      exit 1
      ;;
  esac
}

################################################################################
## Argument Parsing
################################################################################

##############################################################################
# Parse command line arguments
# Arguments:
#   None
# Returns:
#   0 on success, non-zero on failure
##############################################################################
parse_args() {
  while getopts 'd:m:o:p:sh' opt; do
    case "${opt}" in
      d)
        DEPLOYMENT_TYPE="${OPTARG}"
        ;;
      m)
        MIGRATION_COMPONENT="${OPTARG}"
        ;;
      o)
        OPERATION="${OPTARG}"
        ;;
      p)
        SIGNOZ_ROOT_DIR="${OPTARG}"
        ;;
      s)
        SILENT="true"
        ;;
      h)
        help
        exit 0
        ;;
      ?)
        err "Invalid option."
        err "For help, run: $0 -h"
        exit 1
        ;;
      *)
        err "Unknown error while processing options"
        exit 1
        ;;
    esac
  done

  # Validate required arguments
  if [[ -z "${DEPLOYMENT_TYPE}" ]]; then
    err "Deployment type (-d) is required"
    return 1
  fi

  if [[ -z "${MIGRATION_COMPONENT}" ]]; then
    err "Migration type (-m) is required"
    return 1
  fi

  if [[ -z "${OPERATION}" ]]; then
    err "Operation (-o) is required"
    return 1
  fi

  # Validate argument values
  if [[ "${DEPLOYMENT_TYPE}" != "standalone" && "${DEPLOYMENT_TYPE}" != "swarm" ]]; then
    err "Invalid deployment type: ${DEPLOYMENT_TYPE}. Must be one of: standalone, swarm"
    return 1
  fi

  if [[ "${MIGRATION_COMPONENT}" != "all" &&
    "${MIGRATION_COMPONENT}" != "clickhouse" &&
    "${MIGRATION_COMPONENT}" != "zookeeper" &&
    "${MIGRATION_COMPONENT}" != "signoz" &&
    "${MIGRATION_COMPONENT}" != "alertmanager" ]]; then
    err "Invalid migration type: ${MIGRATION_COMPONENT}. Must be one of: all, clickhouse, zookeeper, signoz, alertmanager"
    return 1
  fi

  if [[ "${OPERATION}" != "migrate" && "${OPERATION}" != "post-migrate" ]]; then
    err "Invalid operation: ${OPERATION}. Must be one of: migrate, post-migrate"
    return 1
  fi

  return 0
}

################################################################################
## Main Script
################################################################################

main() {
  local parse_status
  # Parse command line arguments
  parse_args "$@"
  parse_status=$?

  if [[ "${parse_status}" -ne 0 ]]; then
    err "Failed to parse command line arguments"
    exit "${parse_status}"
  fi

  docker_check
  DOCKER_COMPOSE_CMD=$(docker_compose_cmd)

  # Execute migration or post-migration
  if [[ "${OPERATION}" == "migrate" ]]; then
    run_migration "${DEPLOYMENT_TYPE}" "${MIGRATION_COMPONENT}" "${SIGNOZ_ROOT_DIR}"
  elif [[ "${OPERATION}" == "post-migrate" ]]; then
    run_post_migration "${DEPLOYMENT_TYPE}" "${MIGRATION_COMPONENT}" "${SIGNOZ_ROOT_DIR}"
  fi
}

# Execute main function
main "$@"
