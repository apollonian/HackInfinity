var builder = require('botbuilder');
var restify = require('restify');
var watson = require('watson-developer-cloud');
var fs = require('fs');

var fetch = require('node-fetch');
var request = require('request');

var AWS = require('aws-sdk');
var s3 = new AWS.S3();

var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'apollonian',
    api_key: '481274298115531',
    api_secret: 'TBmxAfjX-7toMDySi8UucSz5z4s'
});

const visual_recognition = watson.visual_recognition({
    api_key: 'a998c221a94ed21a8c6d5aadf86dfa1e68ffed7b',
    version: 'v3',
    version_date: '2016-05-20'
});

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot and listen to messages
var connector = new builder.ChatConnector({
    //appId: process.env.MICROSOFT_APP_ID,
    //appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [
    (session) => {
        session.say("Hi, I'm Agro!!");
        session.beginDialog('getName');
    }, (session, result, next) => {
        if (result.response) {
            const name = session.privateConversationData = result.response
            session.say(`Hello ${name}`);
        }
        session.beginDialog('getLocation');
    }, (session, result, next) => {
        const location = session.privateConversationData = result.response
        session.send(`Location: ${location}`);
        session.beginDialog('getImage');
    }
]);

bot.dialog('getName', [
    (session, args, next) => {
        builder.Prompts.text(session, "what is your name?");
    },
    (session, results, next) => {
        var name = results.response;
        if (!name || name.length < 3) {
            session.send("Please give a proper name");
        } else
            session.endDialogWithResult({ response: name })
    }
]);
bot.dialog('getLocation', [
    (session) => {
        builder.Prompts.text(session, "Please enter your location");
    },
    (session, results, next) => {
        var location = results.response;
        session.endDialogWithResult({ response: location })
    }
]);
bot.dialog('getImage', [
    (session, response) => {
        session.say("Send a photo of your crop");
        var msg = session.message;
        if (msg.attachments.length) {
    
            // Message with attachment, proceed to download it.
            // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
            var attachment = msg.attachments[0];

            // console.log(attachment)

            request(attachment.contentUrl, function (error, response, body) {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                cloudinary.uploader.upload("'" + body + "'", function (result) {
                    console.log(result)
                });
            });

        }
    }


    // (session, response) => {
    //     var msg = session.message;
    //     // Check for an attachment
    //     if (msg.attachments.length) {
    //         var attachment = msg.attachments[0]
    //         // Echo back attachment
    //         // decodeBase64Image(msg.attachments[0]);

    //         session.send({
    //             text: "You uploaded: ",
    //             attachments: [{
    //                 contentType: attachment.contentType,
    //                 contentUrl: attachment.contentUrl,
    //                 name: attachment.name
    //             }]
    //         });

    //         // End the dialog and send a confirmation message
    //         session.send('Please wait till the response arrives...');

    //         // var bucketParams = {
    //         //     // Body: './images/example.jpg',
    //         //     Body: attachment.contentUrl,
    //         //     Bucket: "hackinfinity",
    //         //     Key: attachment.name,
    //         //     ServerSideEncryption: "AES256"
    //         // };

    //         // console.log(bucketParams)

    //         // s3.putObject(bucketParams, (err, data) => {
    //         //     if (err) console.log(err, err.stack);   // an error occurred
    //         //     else console.log(data);                 // successful response

    //         // });

    //         console.log(attachment)

    //         request(attachment.contentUrl,
    //             (response) => {

    //                 // Send reply with attachment type & size
    //                 var reply = new builder.Message(session)
    //                     .text('Attachment of %s type and size of %s bytes received.', attachment.contentType, response.length);
    //                 session.send(reply);

    //             }
    //         );


    //         cloudinary.uploader.upload(decodeBase64Image(attachment.contentUrl), function (result) {
    //             console.log(result)
    //         });

    //     } else {

    //         // IF there is no attachment, reprompt
    //         var reply = new builder.Message(session).text('Upload the picture of diseased crop.');
    //         session.send(reply);
    //     }
    // }
])



function decodeBase64Image(dataString) {
    let response = {}
    response.type = 'image/jpg';
    response.data = new Buffer(dataString, 'base64');
    return response.data;
}

runClassifier = (attachment) => {
    //     // var image = new png();
    //     // var src = "data:image/png;base64,";
    //     // src += attachment.contentUrl;
    //     // image.src = src;
    //     // var buffer = new Buffer(attachment.contentUrl, 'base64')
    //     // fs.writeFile("./images/example.png", buffer, {encoding: 'base64'});

    let params = {
        images_file: attachment

    }
    visual_recognition.classify(params, (err, res) => {
        if (!err) {
            return res
        } else {
            return err
        }
    });
}

function getPhotoAttachment(session) {

};