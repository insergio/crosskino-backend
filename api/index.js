const express = require('express');
const routes = express();

const providers = require('./providers');
routes.use('/providers', providers);

module.exports = routes;
