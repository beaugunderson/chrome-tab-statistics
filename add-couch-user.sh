#!/bin/bash

ADMIN_USER="admin"
ADMIN_PASSWORD=""

PROTOCOL="https://"
BASE_URL="beaugunderson.com/browser-stats"

COUCH="$PROTOCOL$ADMIN_USER:$ADMIN_PASSWORD@$BASE_URL"

NEW_USER="beau"
NEW_PASSWORD=""

curl -HContent-Type:application/json \
  -vXPUT $COUCH/_users/org.couchdb.user:$NEW_USER \
  --data-binary "{\"_id\": \"org.couchdb.user:$NEW_USER\",\"name\": \"$NEW_USER\",\"roles\": [],\"type\": \"user\",\"password\": \"$NEW_PASSWORD\"}"

curl -vX PUT $COUCH/$NEW_USER-tabs
curl -vX PUT $COUCH/$NEW_USER-events

curl -vX PUT $COUCH/$NEW_USER-tabs/_security  \
   -Hcontent-type:application/json \
    --data-binary "{\"admins\":{\"names\":[],\"roles\":[]},\"members\":{\"names\":[\"$NEW_USER\"],\"roles\":[]}}"

curl -vX PUT $COUCH/$NEW_USER-events/_security  \
   -Hcontent-type:application/json \
    --data-binary "{\"admins\":{\"names\":[],\"roles\":[]},\"members\":{\"names\":[\"$NEW_USER\"],\"roles\":[]}}"
