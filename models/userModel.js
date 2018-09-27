var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema = mongoose.Schema;

var userSchema = Schema({
    nfc: {type: String},
    uNID: {type: String, unique: true, required: true},
    magSwipe: String,
    first_name: String,
    last_name: String,
    email: String,
    created: {type: Date, default: Date.now}
});

var UserModel = mongoose.model('UserModel', userSchema);

// make this available to our Node applications
module.exports = UserModel;