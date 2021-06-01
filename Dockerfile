# STAGE 1: layered build of PolkADAPT submodule and Polkascan application.

FROM node:14-alpine as builder
RUN npm update -g yarn

# The application depends on PolkADAPT, so we have to install and build PolkADAPT first.

WORKDIR /app/polkadapt

# Copy all PolkADAPT package.json files and install packages.

COPY polkadapt/package.json .
RUN yarn

COPY polkadapt/projects/core/package.json projects/core/package.json
RUN cd projects/core && yarn

# We build the core libary first, because PolkADAPT adapters depend on it.

COPY polkadapt/angular.json polkadapt/tsconfig.json polkadapt/tslint.json ./
COPY polkadapt/projects/core projects/core
RUN yarn exec ng build -- --configuration production core

COPY polkadapt/projects/substrate-rpc/package.json projects/substrate-rpc/package.json
RUN cd projects/substrate-rpc && yarn

COPY polkadapt/projects/polkascan/package.json projects/polkascan/package.json
RUN cd projects/polkascan && yarn

# Copy the rest of the files and build all PolkADAPT libraries.

COPY polkadapt .
RUN yarn exec ng build -- --configuration production substrate-rpc
RUN yarn exec ng build -- --configuration production polkascan

# Install the application dependencies.

WORKDIR /app

COPY package.json .
RUN yarn

# Copy the rest of the files and build the application.
COPY . .

ARG ENV_CONFIG=production
ENV ENV_CONFIG=$ENV_CONFIG

RUN yarn exec ng build -- --configuration ${ENV_CONFIG}


# STAGE 2: Nginx setup to serve the application.

FROM nginx:stable-alpine

# Allow for various nginx proxy configuration.

ARG NGINX_CONF=nginx/polkascan-ui.conf
ENV NGINX_CONF=$NGINX_CONF

# Runtime environment variables.

ARG POLKADOT_SUBSTRATE_RPC_URL=wss://rpc.polkadot.io
ENV POLKADOT_SUBSTRATE_RPC_URL=$POLKADOT_SUBSTRATE_RPC_URL

ARG POLKADOT_POLKASCAN_API_URL=https://explorer-35.polkascan.io/api/v2/polkadot/
ENV POLKADOT_POLKASCAN_API_URL=$POLKADOT_POLKASCAN_API_URL

ARG POLKADOT_POLKASCAN_WS_URL=wss://explorer-35.polkascan.io/api/v2/polkadot/graphql-ws
ENV POLKADOT_POLKASCAN_WS_URL=$POLKADOT_POLKASCAN_WS_URL

ARG KUSAMA_SUBSTRATE_RPC_URL=wss://kusama-rpc.polkadot.io
ENV KUSAMA_SUBSTRATE_RPC_URL=$KUSAMA_SUBSTRATE_RPC_URL

ARG KUSAMA_POLKASCAN_API_URL=https://explorer-35.polkascan.io/api/v2/kusama/
ENV KUSAMA_POLKASCAN_API_URL=$KUSAMA_POLKASCAN_API_URL

ARG KUSAMA_POLKASCAN_WS_URL=wss://explorer-35.polkascan.io/api/v2/kusama/graphql-ws
ENV KUSAMA_POLKASCAN_WS_URL=$KUSAMA_POLKASCAN_WS_URL

ARG ROCOCO_SUBSTRATE_RPC_URL=wss://rococo-rpc.polkadot.io
ENV ROCOCO_SUBSTRATE_RPC_URL=$ROCOCO_SUBSTRATE_RPC_URL

ARG ROCOCO_POLKASCAN_API_URL=https://explorer-35.polkascan.io/api/v2/rococo/
ENV ROCOCO_POLKASCAN_API_URL=$ROCOCO_POLKASCAN_API_URL

ARG ROCOCO_POLKASCAN_WS_URL=wss://explorer-35.polkascan.io/api/v2/rococo/graphql-ws
ENV ROCOCO_POLKASCAN_WS_URL=$ROCOCO_POLKASCAN_WS_URL


# Remove default nginx configs.
RUN rm -rf /etc/nginx/conf.d/*

# Copy our default nginx config.
COPY ${NGINX_CONF} /etc/nginx/conf.d/

# Remove default nginx website.
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from ‘builder’ stage to default nginx public folder.
COPY --from=builder /app/dist/polkascan-ui /usr/share/nginx/html

COPY docker-run.sh .

EXPOSE 80

CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/assets/config.template.json > /usr/share/nginx/html/assets/config.json && exec nginx -g 'daemon off;'"]
