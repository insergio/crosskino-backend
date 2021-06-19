var express = require("express");
var app = express();
const dotenv = require('dotenv');
dotenv.config();
var bodyParser = require("body-parser");
var cors = require("cors");
const api = require('./api');

var router = express.Router();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(cors());

app.use('/api', api);

router.get('/', function (req, res) {
    res.send("Hello World!");
});

app.use(router);

app.listen(3000, function () {
    console.log("Node server running on http://localhost:3000");
});
