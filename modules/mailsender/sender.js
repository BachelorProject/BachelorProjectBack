const mailSender = require('gmail-send');

class MailSender {

    getSender(to, subject) {
        return mailSender({
            user: this.user,
            pass: this.pass,
            to: to,
            subject: subject,
        });
    }

    send(to, subject, text, onSuccess, onError) {
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
