var builder = require('botbuilder');
var restify = require('restify');
var watson = require('watson-developer-cloud');
var fs = require('fs');

var fetch = require('node-fetch');
var request = require('request');

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

const remedyData = {
    "Angular Leaf Spot or Black Arm": ["Pesticide I", "Pesticide II", "Pesticide III", "Pesticide IV"],
    "Grey Midlew": ["Pesticide II", "Pesticide V"]
};

var someData = {
    name: false,
    location: false
};

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
        session.say("Hi, I'm Agro! 🤖🌾<br />I can help you get weather information and identify & control crop diseases.");
        session.beginDialog('getName');
    }, (session, result, next) => {
        if (result.response) {
            const name = session.privateConversationData.name = result.response
            someData.name = true;
            session.say(`Hello ${name}`);
        }
        // }, (session, result, next) => {

        // session.beginDialog('getImage');
        // }, (session) => {
        var msg = new builder.Message(session)
            .text("How can I help you today?<br/>Select your choice.")
            .suggestedActions(
            builder.SuggestedActions.create(
                session, [
                    builder.CardAction.imBack(session, "Disease Classification", "Identify the disease"),
                    builder.CardAction.imBack(session, "Weather Data", "Get weather data"),
                    builder.CardAction.imBack(session, "Disease Classification Dev", "Identify the disease (dev)"),
                    builder.CardAction.imBack(session, "Cancel", "Cancel")
                ]
            ));
        session.send(msg);
    }, (session) => {
        session.endConversation("Bye bye!!");
    }
]);

bot.dialog('getName', [
    (session, args, next) => {
        if (someData.name) {
            session.endDialogWithResult({ response: session.privateConversationData.name });
        } else {
            builder.Prompts.text(session, "What is your name?");
        }
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
        if (someData.location) {
            session.endDialogWithResult({ response: session.privateConversationData.location })
        } else {
            builder.Prompts.text(session, "Please enter your location");
        }
    },
    (session, results, next) => {
        var location = results.response;

        fetch('http://api.openweathermap.org/data/2.5/weather?zip=' + location + ',in&appid=58b6f7c78582bffab3936dac99c31b25')
            .then(function (response) {
                if (response.status !== 200) {
                    session.endDialog("Incorrect ZIP. Try again")
                    return;
                }

                // Examine the text in the response
                response.json().then(function (data) {
                    if (data.cod == 404) {
                        session.endDialog("Incorrect ZIP. Try again")
                        return;
                    }
                    let formattedResponse = 'The current temperature in ' + data.name + ' is: ' + (parseInt(data.main["temp"]) - 273.15).toFixed(1) + '°C<br />' +
                        'Humidity is: ' + data.main["humidity"];
                    session.send(formattedResponse)
                });
            }
            )

        // session.sendTyping();
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

            request(attachment.contentUrl, function (error, response, body) {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                cloudinary.uploader.upload('./static/images/ex.jpg', (result) => {
                    // console.log(result)
                    runClassifier(result.url, session);
                    // session.sendTyping();
                    session.endDialog("Please wait");
                });
            });
        }
    }

])
    .triggerAction({
        matches: /^Disease Classification$/i
    })
    .cancelAction('cancelAction', 'Ok, cancelling..', {
        matches: /^cancel$/i
    });

bot.dialog('getImageDev', [
    (session, response) => {
        builder.Prompts.text(session, "Enter the URL")
    }, (session, results, next) => {
        runClassifier(results.response, session);
        session.endDialog("Please wait");
    }
])
    .triggerAction({
        matches: /^Disease Classification Dev$/i
    })
    .cancelAction('cancelAction', 'Ok, cancelling..', {
        matches: /^cancel$/i
    });


runClassifier = (url, session) => {
    var options = {
        method: 'GET',
        url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classify',
        qs:
            {
                api_key: 'a998c221a94ed21a8c6d5aadf86dfa1e68ffed7b',
                url: url,
                version: '2016-05-20',
                classifier_ids: 'DiseaseClassifier_910587994'
            },
        headers: { 'cache-control': 'no-cache' }
    };

    request(options, (error, response, body) => {
        if (error) throw new Error(error);
        console.log(body)
        var js = JSON.parse(body)
        // body.images[0].sort();
        var classes = js.images[0].classifiers[0].classes != undefined ? js.images[0].classifiers[0].classes : ["No record found"];
        classes.sort();
        // console.log(classes[0]);
        session.beginDialog('dispResult', classes[0]);
    });
}

bot.dialog('dispResult', [
    (session, args) => {
        console.log(args);
        if (args.class != undefined) {
            console.log(remedyData[args.class])
            let ele = '';
            remedyData[args.class].forEach(element => {
                ele += element + '<br />'
            });
            session.send("Your crop more likely has " + args.class + '<br /><br />Treat them using:<br />' + ele)
        } else {
            session.send("Try uploading another image")
        }
    }
])

bot.dialog('weather', [
    (session) => {
        // session.sendTyping();
        session.beginDialog('getLocation')
        // session.endDialog("Weather data might not be availabe now...");
    }, (session, result, next) => {
        
            const location = session.privateConversationData = result.response
            
            session.send(`You entered Location: ${location}`);
        
        session.endDialog("Have a nice day");
    }
]).triggerAction({ matches: [/^Weather Data$/i, /weather data/i] })

bot.dialog('cancel', [
    (session) => {
        session.endConversation("Bye bye!!");
    }
]).triggerAction({ matches: /^Cancel$/i })