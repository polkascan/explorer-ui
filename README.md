# Polkascan UI

This repository contains the code for the [Polkascan](https://polkascan.io/) client sided [Angular](https://angular.io/) application. It utilizes [PolkADAPT](https://github.com/polkascan/polkadapt) to obtain data from multiple data sources.

**Hic sunt dracones!** this application is under heavy development, so tread carefully 😉

## Clone with submodules!

Use the following command to clone this repository and `polkadapt` submodule:
```shell
git clone --recurse-submodules <repository_url>
```
If you already cloned this repository, but without submodules, then you still need to initialize the submodules:
```shell
git submodule init
git submodule update
```
You need the submodule to build and run this application.

## Build and run with Docker

If you want a quick and easy way to run the application, you can build a [Docker](https://www.docker.com/get-started) image with the included Dockerfile. In a shell, from this project's directory, run the following command to build the Docker image:
```shell
docker build -t polkascan-ui .
```
To run the image and start a local webserver with the application:
```shell
docker run --rm -p 8000:80 polkascan-ui
```
You can now open your web browser and navigate to `http://localhost:8000/` to visit the application.

If you want to configure URL's for the various API endpoints, there are environment variables that you can change with the `-e` docker argument, e.g.:
```shell
docker run --rm -p 8000:80 -e POLKADOT_SUBSTRATE_RPC_URL=wss://mycustomnode.com polkascan-ui
```
For a full list of URL's in use, see the Dockerfile (look for 'Runtime environment variables').

## Build manually

These are the instructions for a manual build. You need [Yarn](https://yarnpkg.com/) for this. If you already have Node/NPM installed, you can install Yarn globally with NPM:
```shell
sudo npm -g i yarn
```
You need to install and build `polkadapt` before you install and build the application:
```shell
cd polkadapt
yarn
yarn build
cd ..
yarn
yarn build
```
The build artifacts will be stored in the `dist/` directory.

## Development server

Make sure you have Yarn installed (see command above).

For a dev server, open a terminal and run:
```shell
cd polkadapt
yarn
yarn start
``` 
Wait for the process to stop emitting messages. It stays active and will rebuild PolkADAPT if you change a source file.

Now open a second terminal and run:
```shell
yarn
yarn start
```
Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.
