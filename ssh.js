var fs = require('fs');
var crypto = require('crypto');
var buffersEqual = require('buffer-equal-constant-time');
var ssh2 = require('ssh2');
var utils = ssh2.utils;
var UserModel = require('./models/userModel');

var pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('ssh.key.pub')));
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

var USER = process.env.USER;
var PASSWORD = process.env.PASSWORD;

mongoose.connect('mongodb://localhost:27017/one-btn-studio')
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
function queryDBSSH(stream, nfc) {
    console.log('querying ' + nfc + "\n");
    UserModel.findOne({nfc: nfc}, function (err, user) {
        console.log(user);
        if (err) {
            stream.write("err\x03\n");
        }
        if (!user) {
            stream.write("err\x03\n");
        } else {
            stream.write('\x02' + user.first_name + '-f-' + user.last_name + '-l-' + user.uNID + '-u\x03\n');
        }
    });
}

function receiveDataSSH(stream, data) {
    console.log('receiving');
    console.log(data.toString());
    var textIn = data.toString();

    textIn = data.toString().replace(/(\r\n|\n|\r|#)/gm,"");
    if(data.toString().length < 4) {
        stream.write("err\x03\n");
    } else {
        queryDBSSH(stream, textIn);
    }

}

new ssh2.Server({
    hostKeys: [fs.readFileSync('ssh.key')]
}, function(client) {
    console.log('Client connected!');

    client.on('authentication', function(ctx) {
        // if (ctx.method === 'password'
        //     // Note: Don't do this in production code, see
        //     // https://www.brendanlong.com/timing-attacks-and-usernames.html
        //     // In node v6.0.0+, you can use `crypto.timingSafeEqual()` to safely
        //     // compare two values.
        //     && ctx.username === 'foo'
        //     && ctx.password === 'bar')
        //     ctx.accept();
        // else
        //     ctx.reject();
        if(ctx.key) {
            console.log('method',ctx.method);
            console.log('pubKey',pubKey.fulltype);
            console.log('ctx.key.algo',ctx.key.algo);
            console.log('ctx.key.data',ctx.key.data);
            console.log('pubkey.public',pubKey.public);
            console.log('ctx.signature',ctx.signature);
            console.log('ctx.sigalgo',ctx.sigAlgo);
            console.log('pubkey.publicOrig', pubKey.publicOrig);
            console.log(buffersEqual(ctx.key.data, pubKey.public))
        }
//        if (ctx.method === 'password' && ctx.username === 'tltuser' && ctx.password === 'f=XKzK26..QqXH]j')
        if (ctx.method === 'password' && ctx.username === USER && ctx.password === PASSWORD)
        {
            console.log('password');
            ctx.accept();
        }
        else if (ctx.method === 'publickey'
            && ctx.key.algo === pubKey.fulltype
            && buffersEqual(ctx.key.data, pubKey.public)) {
            if (ctx.signature) {
                var verifier = crypto.createVerify(ctx.sigAlgo);
                verifier.update(ctx.blob);
                if (verifier.verify(pubKey.publicOrig, ctx.signature))
                    ctx.accept();
                else
                    ctx.reject();
            } else {
                // if no signature present, that means the client is just checking
                // the validity of the given public key
                ctx.accept();
            }
        } else
            ctx.reject();
    }).on('ready', function() {
        console.log('Client authenticated!');

        client.on('session', function(accept, reject) {
            var session = accept();
            session.once('shell', function(accept, reject, info) {
                var stream = accept();
                stream.on('data', function(data) {
                    console.log(data.toString().replace("\n\n", "\n"));
                    receiveDataSSH(stream,data);
                });
            });
        });
    }).on('end', function() {
        console.log('Client disconnected');
    });
}).listen(7071, '127.0.0.1', function() {
    console.log('Listening on port ' + this.address().port);
});
