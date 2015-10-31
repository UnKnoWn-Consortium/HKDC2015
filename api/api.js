var express = require('express');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var fs = require("fs");
var d = new Date().toJSON();
var loggerStream = fs.createWriteStream(__dirname + "/console.log", {
    flags: 'r+',
    defaultEncoding: 'utf8'
});
var log = require('npmlog');
log.stream = loggerStream;
var db1 = mongoose.createConnection('mongodb://localhost/districtCouncilElection2015/districts');
var db2 = mongoose.createConnection('mongodb://localhost/districtCouncilElection2015/geojson');
db1.on('error', console.error.bind(console, 'Connection Error: '));
db1.once('open', function (){
    console.log("Connection to 'Districts' Opened");
});
db2.on('error', console.error.bind(console, 'Connection Error: '));
db2.once('open', function (){
    console.log("Connection to 'GeoJSON' Opened");
});
var districtSchema = new mongoose.Schema({
    "region": String,
    "ename": String,
    "cname": String,
    "population": Number,
    "electors": Number,
    "iconSrc": String,
    "exOfficio": Number,
    "GeoJSON": mongoose.Schema.Types.Mixed,
    "seats": Array
});
var District = db1.model('district', districtSchema);
var geoJSONSchema = new mongoose.Schema({
    "type": String,
    "geometry": mongoose.Schema.Types.Mixed,
    "properties": mongoose.Schema.Types.Mixed
});
var GeoJSON = db2.model('GeoJSON', geoJSONSchema);
var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.use(function (req, res, next) {
    var d = new Date().toJSON();
    console.log(d + " " + req.ip + " " + req.method.toUpperCase() + " " + req.originalUrl);
    log.info('[' + d + ']', req.ip + " " + req.method.toUpperCase() + " " + req.originalUrl + '\n');
    next();
});
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
});
app.post('/api/districts', function(req, res, next){
    var district = new District({
        "region": req.body.region,
        "ename": req.body.ename,
        "cname": req.body.cname,
        "population": req.body.population,
        "electors": req.body.electors,
        "iconSrc": req.body.iconSrc,
        "exOfficio": req.body.exOfficio,
        "GeoJSON": req.body.GeoJSON,
        "seats": req.body.seats
    });
    district.save(function(err, post){
        if (err) return next(err);
        res.status(201).json(post);
        console.log(res.statusCode);
        console.log(req.ip);
    })
});
app.post('/api/geojson', function(req, res, next){
    var geojson = new GeoJSON({
        "type": req.body.type,
        "geometry": req.body.geometry,
        "properties": req.body.properties
    });
    geojson.save(function(err, post){
        if (err) return next(err);
        res.status(201).json(post);
        console.log(res.statusCode);
        console.log(req.ip);
    })
});
app.get('/api/districts/json/full', function (req, res, next) {
    var query = District.find().select({
        _id: 0,
        __v: 0
    }).exec().then(function(districts){
        res.status(200).json(districts);
        var d = new Date().toJSON();
        log.info('[' + d + ']', req.ip + " RES " + res.statusCode + '\n');
        console.log(d + " " + req.ip + " RES " + res.statusCode);
    }, function(err){
        return next(err);
    });
});
app.get('/api/districts/json', function (req, res, next) {
    var query = District.find().select({
        _id: 0,
        __v: 0,
        "GeoJSON": 0,
        "seats.GeoJSON": 0
    }).exec().then(function(districts){
        res.status(200).json(districts);
        log.info('[' + d + ']', req.ip + " RES " + res.statusCode + '\n');
        console.log(d + " " + req.ip + " RES " + res.statusCode);
    }, function(err){
        return next(err);
    });
});
app.get('/api/districts/geojson', function (req, res, next) {
    var query = District.find().select({
        _id: 0,
        __v: 0
    }).exec().then(function(districts){
        var featureCollection = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": []
        };
        var constituents = [];
        var districtsGeoJSON = districts.map(function(district){
            var temp = district.toObject();
            constituents = constituents.concat(temp.seats);
            var geo = temp.GeoJSON;
            delete temp.GeoJSON;
            temp.seats = temp.seats.length;
            geo.properties = temp;
            return geo;
        });
        var constituentsGeoJSON = constituents.filter(function(constituent){
            return constituent.type == "constituent";
        }).map(function(constituent){
            var geo = constituent.GeoJSON;
            delete constituent.GeoJSON;
            geo.properties = constituent;
            return geo;
        });
        featureCollection.features = districtsGeoJSON.concat(constituentsGeoJSON);
        res.status(200).json(featureCollection);
        log.info('[' + d + ']', req.ip + " RES " + res.statusCode + '\n');
        console.log(d + " " + req.ip + " RES " + res.statusCode);
    }, function(err){
        return next(err);
    });
});
var server = app.listen(4444, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('HKDC2015 API listening at http://%s:%s', host, port);
});