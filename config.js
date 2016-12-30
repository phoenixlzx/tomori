module.exports = {
    smtp: {
        addr: '0.0.0.0',
        port: 1465,
        hostname: 'smtp.example.com',
        crt: './cert.pem',
        key: './priv.key',
        user: {
            "example_user": "password"
        },
        whitelistip: [
            ''
        ],
        maxsize: 20971520
    },
    api: {
        key: 'your sparkpost api key'
    }
};
