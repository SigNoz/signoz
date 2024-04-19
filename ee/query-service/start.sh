#!/bin/bash

# turn on bash's job control
set -m

# Start the primary process and put it in the background
./query-service "$@" &

# # Start the helper process

./gor --input-raw=:8080 --output-file=%Y%m%d-%H.log

echo "hello world done"

# the my_helper_process might need to know how to wait on the
# primary process to start before it does its work and returns


# now we bring the primary process back into the foreground
# and leave it there
fg %1