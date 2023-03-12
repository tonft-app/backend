#!/bin/bash

# Load variables from .env file
export $(cat .env | xargs)

# Pull latest Postgres container image
docker pull postgres:latest

# Tag image with custom name
docker tag postgres:latest $POSTGRES_CONTAINER_NAME:latest

# Run docker command
docker run --name $POSTGRES_CONTAINER_NAME \
  -p $DB_PORT:$DB_PORT \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_USER=$POSTGRES_USER \
  -d postgres

ts-node "./src/db/createTables.ts"