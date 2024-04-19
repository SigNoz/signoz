#!/bin/bash


OUTPUT_PATH="${GOR_OUTPUT_PATH:-./goreplay/}"
mkdir -p ${OUTPUT_PATH}

# turn on bash's job control
set -m

# Start the primary process and put it in the background
./query-service "$@" &

echo "Starting GOR"
# # Start the helper process
./gor --input-raw=:8080 --http-disallow-url "/api/v1/health" --output-file=${OUTPUT_PATH}%Y%m%d-%H.log 
echo "GOR started"

# the my_helper_process might need to know how to wait on the
# primary process to start before it does its work and returns

# now we bring the primary process back into the foreground
# and leave it there
fg %1