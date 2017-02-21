/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a sample skill built with Amazon Alexa Skills nodejs
 * skill development kit.
 * This sample supports multiple languages (en-US, en-GB, de-GB).
 * The Intent Schema, Custom Slot and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-howto
 **/
'use strict';

const alexa = require('alexa-app');
const Alexa = require('alexa-sdk');
const Nuxeo = require('nuxeo');
const APP_ID = 'NUXEO'; // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Nuxeo',
            WELCOME_MESSAGE: "Welcome to %s. The skill is not yet finish.",
            WELCOME_REPROMT: 'For instructions on what you can say, please say help me.',
            DISPLAY_CARD_TITLE: '%s  - Recipe for %s.',
            HELP_MESSAGE: "You can ask questions such as, what\'s the recipe, or, you can say exit...Now, what can I help you with?",
            HELP_REPROMT: "You can say things like, what\'s the recipe, or you can say exit...Now, what can I help you with?",
            STOP_MESSAGE: 'Goodbye!',
            RECIPE_REPEAT_MESSAGE: 'Try saying repeat.',
            RECIPE_NOT_FOUND_MESSAGE: "I\'m sorry, I currently do not know ",
            RECIPE_NOT_FOUND_WITH_ITEM_NAME: 'the recipe for %s. ',
            RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME: 'that recipe. ',
            RECIPE_NOT_FOUND_REPROMPT: 'What else can I help with?',
        },
    }
};

var t = languageStrings['en-US'].translation;

var app = new alexa.app("NUXEO");

function loadToken(tokenRaw) {
    var token = new Buffer(tokenRaw, 'base64').toString().split("|");
    if (token[0][token[0].length - 1] !== '/') {
        token[0] += "/";
    }
    var nuxeo = new Nuxeo({
        baseURL: token[0],
        auth: {
            method: 'token',
            token: token[1]
        },
        currentUser: token[1]
    });
    return Promise.resolve(nuxeo);
}

app.intent('GetMyLast', function(request, response) {
    return loadToken(request.getSession().details.accessToken)
        .then(function(nuxeo) {
            return nuxeo.repository().query({
                maxResults: 5,
                query: "SELECT * FROM Document WHERE ecm:mixinType != 'HiddenInNavigation' AND ecm:isProxy = 0 AND ecm:isCheckedInVersion = 0 AND ecm:currentLifeCycleState != 'deleted' AND dc:creator = '" + nuxeo.currentUser + "'"
            });
        })
        .then(function(doc) {
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents created by you");
            }
            let i = 1;
            for (let id in doc.entries) {
                response.say("Document " + i++ + " " + doc.entries[id].title + ". ");
            }
        });
};

app.intent('GetMyTasks', function(request, response) {
    return loadToken(request.getSession().details.accessToken)
        .then(function(nuxeo) {
            var p1 = nuxeo.workflows().fetchTasks({
                actorId: nuxeo.currentUser
            });
            var p2 = nuxeo._http({
                method: 'GET',
                url: nuxeo._baseURL + ui/i18n/messages.json,
            });
            return Nuxeo.Promise.all([p1, p2]);
        })
        .then(function(values) {
            var doc = values[0];
            if (doc.entries.length == 0) {
                response.say("You have no waiting tasks");
                return;
            }

            var labels = JSON.parse(values[1]);
            let i = 1;
            for (let id in doc.entries) {
                response.say("Task " + i++ + " " + labels[doc.entries[id].name] + ' on workflow ' + labels[doc.entries[id].workflowModelName] + ' due on ' + doc.entries[id].dueDate.substr(0, 10));
            }
        })
    });
};

app.intent('Search', function(request, response) {
    var criteria = request.slot("Criteria");
    return loadToken(request.getSession().details.accessToken)
        .then(function(nuxeo) {
            return nuxeo.repository().query({
                maxResults: 5,
                sortBy: 'dc:modified',
                sortOrder: 'desc',
                query: "SELECT * FROM Document WHERE ecm:fulltext = '" + criteria + "'"
            });
        })
        .then(function(doc) {
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents matching " + criteria);
            }
            let i = 1;
            for (let id in doc.entries) {
                response.say("Document " + i++ + " " + doc.entries[id].title + " . ");
            }
        });
};

exports.handler = app.lambda();