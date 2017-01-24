'use strict';

var config = require('./config');

var fs = require('fs');
var SMTPServer = require('smtp-server').SMTPServer;
var MailParser = require("mailparser").MailParser;
var SparkPost = require('sparkpost');
var client = new SparkPost(config['api'].key);

var smtpOptions = {};

smtpOptions.name = config['smtp'].hostname;
smtpOptions.secure = true;
smtpOptions.cert = fs.readFileSync(config['smtp'].crt, 'utf8');
smtpOptions.key = fs.readFileSync(config['smtp'].key, 'utf8');
smtpOptions.authMethods = ['PLAIN', 'LOGIN'];
smtpOptions.size = config['smtp'].maxsize;

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
    var mailparser = new MailParser();
    stream.on('end', function (err) {
        if (err) {
            console.error('ERROR: ' + err);
        } else {
            console.log('Message Received and Processing');
        }
        callback();
    });
    mailparser.on('end', function(mailobj) {
        sendmail(mailobj);
    });
    stream.pipe(mailparser);
};

var server = new SMTPServer(smtpOptions);
server.listen(config['smtp'].port, config['smtp'].addr);

server.on('error', function(err){
    console.error('Error: ', err);
});

function sendmail (mailobj) {

    var mailcontent = {};
    mailcontent.content = {
        from: {
            email: mailobj.from[0].address,
            name: mailobj.from[0].name
        },
        subject: mailobj.subject,
        text: ''
    };
    mailcontent.recipients = [];
    mailobj.to.forEach(function(rec) {
        mailcontent.recipients.push({
            address: {
                email: rec.address,
                name: rec.name
            }
        });
    });
	if (mailobj.cc && mailobj.cc.length !== 0) {
		mailobj.cc.forEach(function(cc) {
		    mailobj.to.forEach(function(rec) {
                mailcontent.recipients.push({
                    address: {
                        email: cc,
                        header_to: rec.address
                    }
                });
            });
		});
	}
    if (mailobj.bcc && mailobj.bcc.length !== 0) {
        mailobj.bcc.forEach(function(bcc) {
            mailobj.to.forEach(function(rec) {
                mailcontent.recipients.push({
                    address: {
                        email: bcc,
                        header_to: rec.address
                    }
                });
            });
        });
    }

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
                name: att.fileName,
                data: att.content.toString('base64')
            });
        });
    }

    client.transmissions.send(mailcontent)
        .then(function (data) {
            console.log('INFO: Message Sent');
        })
        .catch(function (err) {
            console.error('ERROR: ' + err);
        });
}
