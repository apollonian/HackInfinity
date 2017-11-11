// This loads the environment variables from the .env file
//require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
//var locationDialog = require('botbuilder-location');



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
        session.beginDialog('getLocation');
    }
]);

//bot.library(locationDialog.createLibrary("BING_MAPS_API_KEY"));

bot.dialog('getName', [
    (session, args, next) => {
        session.send("what is your name ?");
    },
    (session, results, next) => {
        const name = results.response;
        console.log(name)
        session.conversationData.name = name;
        session.endDialogWithResult({ response: name })
    }
]);

// bot.dialog('getLocation', [
//     (session, args, next) => {
//         var options = {
//             prompt: "Where should I ship your order? Type or say an address.",
//             useNativeControl: true,
//             requiredFields:
//                 locationDialog.LocationRequiredFields.streetAddress |
//                 locationDialog.LocationRequiredFields.locality |
//                 locationDialog.LocationRequiredFields.region |
//                 locationDialog.LocationRequiredFields.postalCode |
//                 locationDialog.LocationRequiredFields.country
//         };
//         locationDialog.getLocation(session, options);
//     },
//     function (session, results) {
//         if (results.response) {
//             var place = results.response;
// 			var formattedAddress = 
//             session.send("Thanks, I will ship to " + getFormattedAddressFromPlace(place, ", "));
//         }
// }
// ]);