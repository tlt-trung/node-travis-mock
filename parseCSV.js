var parse = require('csv-parse');
var fs = require('fs');
var UserModel = require('./models/userModel');
var mongoose = require('mongoose');
var Client = require('ssh2-sftp-client');
var sftp = new Client();
var schedule = require('node-schedule');

var i = 1;
var MONGOURL = process.env.MONGOURL;
var PATHTOFILE = process.env.PATHTOFILE;

mongoose.connect(MONGOURL)
    .then(function () {
        console.log("Connected correctly to server");
        // TODO: any DB initialization here
    })
    .catch(function (connErr) {
        console.error.bind(console, 'connection error');
        app.use(function (err, req, res, next) {
            next(connErr);
        })
    });

exports.parser = function() {
    console.log('Parsing ' + PATHTOFILE);
    fs.createReadStream(PATHTOFILE)
        .pipe(parse({delimiter: ',', columns: true}))
        .on('data', function(entry) {
            entry = removeQuotes(entry);
            var u = entry.uNID;
            UserModel.findOne({uNID: u}, function(err,user) {
                if(user !== null) {
                    console.log(i++ + ' ' + entry.first_name + ' ' + entry.last_name + ' already exists');
                } else {
                    console.log('pushing ', i++ + ' ' + entry.first_name + ' ' + entry.last_name);
                    new UserModel({
                        uNID: entry.uNID,
                        first_name: entry.first_name,
                        last_name: entry.last_name,
                        magSwipe: entry.magSwipe,
                        nfc: entry.nfc
                    })
                        .save()
                        .catch(function(error) {
                            console.log(error);
                        });
                }
            })
        })
        .on('end',function() {
            console.log('done posting to db');
            process.exit();
        });
}

var removeQuotes = function(entry) {
    entry.uNID = entry.uNID.replace(/['"]+/g, '');
    entry.nfc = entry.nfc.replace(/['"]+/g, '');
    entry.magSwipe = entry.magSwipe.replace(/['"]+/g, '');
    entry.first_name = entry.first_name.replace(/['"]+/g, '');
    entry.last_name = entry.last_name.replace(/['"]+/g, '');
    return entry;
};
//
// var k = schedule.scheduleJob('0 11 * * *', function(){
//     console.log(new Date().toLocaleString(), 'reinit db');
//     parser();
// });



