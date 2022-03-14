const promClient = require('prom-client');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.EXPORTER_PORT;
const serverIP = process.env.SERVER_IP;

const exporter = express();

const metrics = require('./metrics');
const registry = new promClient.Registry();
metrics(registry);

exporter.get('/metrics', async (req, res, next) => {
  res.set('Content-Type', registry.contentType);
  res.end(registry.metrics());
  
  next();
});


exporter.listen(port, serverIP, () => console.log('Exporter started ✅ '));