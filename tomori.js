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
    if (config['smtp'].whitelistip.length === 0) {
        return callback();
    }
    if (config['smtp'].whitelistip.indexOf(session.remoteAddress) === -1) {
        return callback(new Error('403'));
    } else {
        callback();
    }
};
smtpOptions.onData = function(stream, session, callback){
    stream.pipe(mailparser); // print message to console
    stream.on('end', function (err) {
        console.log('Message Received and Processing');
    });
};

var server = new SMTPServer(smtpOptions);
server.listen(config['smtp'].port, config['smtp'].addr);

server.on('error', function(err){
    console.error('Error: ', err);
});

mailparser.on('end', function(mailobj) {
    sendmail(mailobj);
});

function sendmail (mailobj) {

    var mailcontent = {};
    mailcontent.content = {
        from: mailobj.from[0],
        subject: mailobj.subject,
        text: ''
    };
    mailcontent.recipients = mailobj.to;

    if (mailobj.html) {
        mailcontent.content.html = mailobj.html;
    }
    if (mailobj.text) {
        mailcontent.content.text = mailobj.text;
    }
    if (mailobj.attachments && mailobj.attachments.length > 0) {
        mailcontent.content.attachments = [];
        mailobj.attachments.forEach(function(att) {
            mailcontent.content.attachments.push({
                type: att.contentType,
                name: att.filename,
                data: att.content.toString('base64')
            });
        });
    }

    client.transmissions.send(mailcontent)
        .then(function (data) {
            console.log('INFO: ' + data);
        })
        .catch(function (err) {
            console.error('ERROR: ' + err);
        });
}
