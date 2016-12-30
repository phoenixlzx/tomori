'use strict';

var config = require('./config');

var fs = require('fs');
var SMTPServer = require('smtp-server').SMTPServer;
var MailParser = require("mailparser").MailParser;
var SparkPost = require('sparkpost');
var client = new SparkPost(config['api'].key);

var mailparser = new MailParser();

var smtpOptions = {};

smtpOptions.name = config['smtp'].hostname;
smtpOptions.secure = true;
smtpOptions.cert = fs.readFileSync(config['smtp'].crt, 'utf8');
smtpOptions.key = fs.readFileSync(config['smtp'].key, 'utf8');
smtpOptions.authMethods = ['PLAIN', 'LOGIN'];

smtpOptions.onAuth = function(auth, session, callback) {
    if (!config['smtp']['user'][auth.username] || auth.password !== config['smtp']['user'][auth.username]) {
        return callback(new Error('401'));
    }
    callback(null, {user: auth.username});
};
smtpOptions.onConnect = function(session, callback) {
    if (config['whitelistip'].length === 0) {
        return callback();
    }
    if (config['whitelistip'].indexOf(session.remoteAddress) === -1) {
        return callback(new Error('403'));
    } else {
        callback();
    }
};
smtpOptions.onData = function(stream, session, callback){
    stream.pipe(mailparser); // print message to console
    stream.on('end', callback);
};

var server = new SMTPServer(smtpOptions);
server.listen(config['smtp'].port, config['smtp'].addr);

server.on('error', function(err){
    console.error('Error: ', err);
});

mailparser.on('end', function(mailobj) {
    console.log(mailobj);
    // ...
});

function sendmail (mailobj) {
    // TODO
}