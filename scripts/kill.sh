#!/usr/bin/env bash
# Util to kill processes listening on ports we might use during dev
# - Firebase Emulator UI:      4000
# - Datastore Emulator:        8081
# - Firestore Emulator:        9000
# - Firebase Auth Emulator:    9099
# - Firebase Storage Emulator: 9199
server_tcp_ports="4000,8081,9000,9099,9199"
kill_options="$@"

if [[ -n "${kill_options}" ]]; then
    echo "Using options for kill: ${kill_options}"
fi

echo "Killing processes listening to tcp ports ${server_tcp_ports} ..."
for pid in $(lsof -i tcp:${server_tcp_ports} -t); do
    echo "  - killing pid ${pid}"
    kill ${kill_options} ${pid}
done
echo "...done"
