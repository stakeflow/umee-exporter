const dotenv = require('dotenv');
const client = require('prom-client');
const { exec } = require("child_process");
const Web3 = require('web3');
const axios = require('axios');

dotenv.config();

const infuraWS = process.env.INFURA_WS;
const localNodeWS = process.env.LOCAL_ETH_NODE_WS;
const orchestratorAddress = process.env.ORCHESTRATOR_ETH_ADDRESS;
const orchestratorUmeeAddress = process.env.ORCHESTRATOR_UMEE_ADDRESS;
const peggoApi = process.env.PEGGO_API;

const web3 = new Web3(Web3.givenProvider || infuraWS);
const web3_local = new Web3(Web3.givenProvider || localNodeWS);


function localEthBlockHeightMetric(registry) {
    const gauge = new client.Gauge({
        name: 'local_eth_block_height',
        help: 'Local node block height',
        registers: [registry],
    });

    async function collectEthBlockHeight() {
        web3_local.eth.getBlockNumber().then(result => {
            gauge.set(Number(result));
        });
    }

    setInterval(collectEthBlockHeight, 120000);
}

function ethBlockHeightMetric(registry) {
    const gauge = new client.Gauge({
        name: 'eth_block_height',
        help: 'External node block height',
        registers: [registry],
    });

    async function collectEthBlockHeight() {
        web3.eth.getBlockNumber().then(result => {
            gauge.set(Number(result));
        });
    }

    setInterval(collectEthBlockHeight, 120000);
}

function orchestratorETHBalanceMetric(registry) {
    const gauge = new client.Gauge({
        name: 'orchestrator_eth_balance',
        help: 'Orchestrator ETH balance',
        registers: [registry],
    });

    async function collectOrchestratorETHBalance() {
        web3.eth.getBalance(orchestratorAddress).then(result => {
            let balanceETH = web3.utils.fromWei(result, 'ether');
            gauge.set(Number(balanceETH));
        });
    }

    setInterval(collectOrchestratorETHBalance, 300000);
}

function orchestratorUmeeBalanceMetric(registry) {
    const gauge = new client.Gauge({
        name: 'orchestrator_umee_balance',
        help: 'Orchestrator ETH balance',
        registers: [registry],
    });

    async function collectOrchestratorUmeeBalance() {
        exec(`umeed q bank balances ${orchestratorUmeeAddress} --output json | jq '.balances[0] | .amount' | tr -d '\"'`, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }

            let balance = Number(stdout);
            balance = balance / 1000000;

            gauge.set(Number(balance));
        });
    }

    setInterval(collectOrchestratorUmeeBalance, 300000);
}

function umeeVersionMetric(registry) {
    const gauge = new client.Gauge({
        name: 'umee_version',
        help: 'umeed version',
        registers: [registry],
    });

    async function collectUmeeVersion() {
        exec("/usr/local/bin/umeed version 2>&1", async (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }

            await axios.get("https://api.github.com/repos/umee-network/umee/releases/latest", {
                responseType: 'application/vnd.github.v3+json'
            }).then(response => {
                if (response.data.tag_name === stdout) {
                    gauge.set(1);
                } else {
                    gauge.set(0);
                }
            }).catch(err => {
                console.log(err.message);
                gauge.set(0);
            });
        });
    }

    setInterval(collectUmeeVersion, 300000);
}

function peggoVersionMetric(registry) {
    const gauge = new client.Gauge({
        name: 'peggo_version',
        help: 'peggo version',
        registers: [registry],
    });

    async function collectPeggoVersion() {
        exec("/root/go/bin/peggo version --format json | jq .version | tr -d '\"' | tr -d '\n'", async (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }

            await axios.get("https://api.github.com/repos/umee-network/peggo/releases/latest", {
                responseType: 'application/vnd.github.v3+json'
            }).then(response => {
                if (response.data.tag_name === stdout) {
                    gauge.set(1);
                } else {
                    gauge.set(0);
                }
            }).catch(err => {
                console.log(err.message);
                gauge.set(0);
            });
        });
    }

    setInterval(collectPeggoVersion, 300000);
}

function peggoSynсMetric(registry) {
    const gauge = new client.Gauge({
        name: 'peggo_sync',
        help: 'Peggo checker',
        registers: [registry],
    });

    async function collectPeggoSynс() {

        await axios.get(peggoApi + "/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED").then(async response => {
            let orchAddresses = [];
            for (const item of response.data.validators) {
                await axios.get(peggoApi + "/gravity/v1beta/query_delegate_keys_by_validator?validator_address=" + item.operator_address).then(response => {
                    orchAddresses.push(response.data.orchestrator_address);
                }).catch(err => {
                    console.log(err.message);
                    gauge.set(10000);
                });
            }

            let ownNonce = 0;
            let orchNonces = [];
            for (let item of orchAddresses) {
                await axios.get(peggoApi + "/gravity/v1beta/oracle/eventnonce/" + item).then(response => {
                    if (item == orchestratorUmeeAddress) {
                        ownNonce = response.data.event_nonce;
                    }
                    orchNonces.push(response.data.event_nonce);
                }).catch(err => {
                    console.log(err.message);
                    gauge.set(10000);
                });
            }

            let maxNonce = Math.max(...orchNonces);
            let delta = maxNonce - ownNonce;
            gauge.set(delta);
        }).catch(err => {
            console.log(err.message);
            gauge.set(10000);
        });
    }

    setInterval(collectPeggoSynс, 60000);
}


module.exports = (registry) => {
    orchestratorETHBalanceMetric(registry);
    ethBlockHeightMetric(registry);
    localEthBlockHeightMetric(registry);
    orchestratorUmeeBalanceMetric(registry);
    umeeVersionMetric(registry);
    peggoVersionMetric(registry);
    peggoSynсMetric(registry);
};