var net = require('net');
var sockets = [];
var UserModel = require('./models/userModel');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var schedule = require('node-schedule');
var parser = require('./parseCSV');

var MONGOURL = process.env.MONGOURL;
var REMOTEPATH = process.env.REMOTEPATH;
var PATHTOFILE = process.env.PATHTOFILE;

var Client = require('ssh2-sftp-client');
var sftp = new Client();


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

// Method to query database
function queryDB(i, nfc) {
    console.log('querying ' + nfc + "\n");
    UserModel.findOne({nfc: nfc}, function (err, user) {
        console.log(user);
        if (err) {
            sockets[i].write("err\x03");
        }
        if (!user) {
            sockets[i].write("err\x03");
        } else {
            sockets[i].write('\x02' + user.first_name + '-f-' + user.last_name + '-l-' + user.uNID + '-u\x03');
        }
    });
}

// Method executed when a socket recieves data
function recieveData(socket, data) {
    var i = sockets.indexOf(socket);
    var textIn = data.toString();
    if ((textIn.indexOf('\r')) >= 0) {
        textIn = data.toString().replace(/(\r\n|\n|\r|#)/gm,"");
        if(data.toString().length < 4) {
            sockets[i].write("err\x03");
        } else {
            queryDB(i, textIn);
        }
    }
}

// Method executed when a socket ends
function closeSocket(socket) {
    var i = sockets.indexOf(socket);
    if (i != -1) {
        sockets.splice(i, 1);
    }
}

// Callback method executed when a new TCP socket is opened.

function newSocket(socket) {
    sockets.push(socket);
    socket.on('data', function(data) {
        if(!data.includes('PROXY')) {
            recieveData(socket, data);
        }
    })
    socket.on('end', function() {
        closeSocket(socket);
    })
}

// Create a new server and provide a callback for when a connection occurs
var server = net.createServer(newSocket);

// Listen on port 8547
server.listen(8547);

var k = schedule.scheduleJob('0 0 * * 0', function(){
    console.log(new Date().toLocaleString(), 'reinit db');
    parser.parser();
});



