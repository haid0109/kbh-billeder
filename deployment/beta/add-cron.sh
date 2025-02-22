#!/bin/bash

# Exit on any error
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NAMESPACE="beta"
FRONTEND_PUBLIC_HOSTNAME="beta.kbhbilleder.dk"
# All hours except at 02
INCREMENTAL_TIMING="32 32 0,1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *"
# Full reindex at 02
FULL_TIMING="32 42 2 * * *"
source $DIR/../add-cron.sh
