# UMEE exporter

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Running the application

### Prerequisites
- [Node.js](https://nodejs.org)
- [pm2](https://pm2.keymetrics.io/) (Run `npm install pm2 -g` to install it.)

##### Step 1: Clone this repo to your server and change directory
```shell
git clone https://github.com/genesis-lab-team/umee-exporter
cd umee-exporter
```

##### Step 2: Install npm dependencies and copy ".env.example" files to ".env" with install.js script.
```shell
node install.js
```
*You need to modify default variables in .env files according to your setup.*

##### Step 3: Run the app in development mode with pm2
```shell
pm2 start config.js
```

