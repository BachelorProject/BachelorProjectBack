const mailSender = require('gmail-send');
const config = require('./../../config/config');

class MailSender {

    static getSender(to, subject) {
        return mailSender({
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASSWORD,
            to: to,
            subject: subject,
        });
    }

    static send(to, subject, text, onSuccess, onError) {
        this.getSender(to, subject)({
            text: text
        }, (error, result, fullResult) => {
            if (error) onError(error);
            else onSuccess(fullResult);
        })
    }

}

// const testSender = new MailSender();
// testSender.send("droga16@freeuni.edu.ge", "test subject", "test text",
//     res => {
//         console.log(res)
//     },
//     err => {
//         console.log(err)
//     }) //example

module.exports = MailSender;
