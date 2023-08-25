# STAGE 1: layered build of PolkADAPT submodule and Polkascan Explorer application.

FROM node:lts as builder

# The application depends on PolkADAPT, so we have to install and build PolkADAPT first.

WORKDIR /app/polkadapt

# Copy all PolkADAPT package.json files and install packages.

COPY polkadapt/package.json .
RUN npm i

COPY polkadapt/projects/core/package.json projects/core/package.json
RUN cd projects/core && npm i

# We build the core libary first, because PolkADAPT adapters depend on it.

COPY polkadapt/angular.json polkadapt/tsconfig.json ./
COPY polkadapt/projects/core projects/core
RUN npm exec ng build -- --configuration production core

COPY polkadapt/projects/substrate-rpc/package.json projects/substrate-rpc/package.json
RUN cd projects/substrate-rpc && npm i

COPY polkadapt/projects/polkascan-explorer/package.json projects/polkascan-explorer/package.json
RUN cd projects/polkascan-explorer && npm i

COPY polkadapt/projects/coingecko/package.json projects/coingecko/package.json
RUN cd projects/coingecko && npm i

COPY polkadapt/projects/subsquid/package.json projects/subsquid/package.json
RUN cd projects/subsquid && npm i

# Copy the rest of the files and build all PolkADAPT libraries.

COPY polkadapt .
RUN npm exec ng build -- --configuration production substrate-rpc
RUN npm exec ng build -- --configuration production polkascan-explorer
RUN npm exec ng build -- --configuration production coingecko
RUN npm exec ng build -- --configuration production subsquid

# Install the application dependencies.

WORKDIR /app

COPY package.json .
RUN npm i

# Copy the rest of the files and build the application.
COPY . .

ARG ENV_CONFIG=production
ENV ENV_CONFIG=$ENV_CONFIG

RUN npm exec ng build -- --configuration ${ENV_CONFIG}


# STAGE 2: Nginx setup to serve the application.

FROM nginx:stable-alpine

# Allow for various nginx proxy configuration.
ARG NGINX_CONF=nginx/explorer-ui.conf
ENV NGINX_CONF=$NGINX_CONF

# Remove default nginx configs.
RUN rm -rf /etc/nginx/conf.d/*

# Copy the nginx config.
COPY ${NGINX_CONF} /etc/nginx/conf.d/

# Remove default nginx website.
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from ‘builder’ stage to default nginx public folder.
COPY --from=builder /app/dist/explorer-ui /usr/share/nginx/html

# Copy config.json file for runtime environment variables.
ARG CONFIG_JSON=src/assets/config.json
ENV CONFIG_JSON=$CONFIG_JSON
COPY $CONFIG_JSON /usr/share/nginx/html/assets/config.json

# Copy privacy-policy.html file.
ARG PRIVACY_POLICY_HTML=src/assets/privacy-policy.html
ENV PRIVACY_POLICY_HTML=$PRIVACY_POLICY_HTML
COPY $PRIVACY_POLICY_HTML /usr/share/nginx/html/assets/privacy-policy.html

EXPOSE 80

CMD ["/bin/sh",  "-c",  "exec nginx -g 'daemon off;'"]
