const path = require('path')
const fs = require('fs')
const child_process = require('child_process')

const folder = process.cwd()

// Since this script is intended to be run as a "preinstall" command,
// it will do `npm install` automatically inside the root folder in the end.
console.log('===================================================================')
console.log(`Performing "npm install" inside root folder`)
console.log('===================================================================')

const has_package_json = fs.existsSync(path.join(folder, 'package.json'))
const has_dotenv_example = fs.existsSync(path.join(folder, '.env.example'))
const has_dotenv = fs.existsSync(path.join(folder, '.env'))

if (has_package_json) {
    npm_install(folder)
}

// If there is no `.env` in this folder but `.env.example` exist then copy it to `.env`.
if (!has_dotenv && has_dotenv_example) {
    fs.copyFile(`${folder}/.env.example`, `${folder}/.env`, (err) => {
        if (err) throw err;
        console.log(`${folder}/.env.example was copied to ${folder}/.env`);
    });
}

// Performs `npm install`
function npm_install(where) {
    child_process.execSync('npm install', { cwd: where, env: process.env, stdio: 'inherit' })
}