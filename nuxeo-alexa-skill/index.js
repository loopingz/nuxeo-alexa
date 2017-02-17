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
var nuxeo;
const APP_ID = 'NUXEO'; // TODO replace with your app ID (OPTIONAL).
var rp = require('request-promise');

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

app.loadToken = function(tokenRaw) {
    var token = new Buffer(tokenRaw, 'base64').toString().split("|");
    nuxeo = this.nuxeo = new Nuxeo({
        baseURL: token[0]
    });
    if (token[0][token[0].length - 1] !== '/') {
        token[0] += "/";
    }
    this.nuxeoUrl = token[0];
    this.currentUser = token[1];
    this.currentToken = token[2];
    this.nuxeo.header('X-Authentication-Token', token[2]);
}.bind(app);

app.intent('GetMyLast', function(request, response) {
    this.loadToken(request.getSession().details.accessToken);
    return this.nuxeo.repository().query({
            maxResults: 5,
            query: "SELECT * FROM Document WHERE ecm:mixinType != 'HiddenInNavigation' AND ecm:isProxy = 0 AND ecm:isCheckedInVersion = 0 AND ecm:currentLifeCycleState != 'deleted' AND dc:creator = '" + this.currentUser + "'"
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
}.bind(app));

app.intent('GetMyTasks', function(request, response) {
    this.loadToken(request.getSession().details.accessToken);
    return this.nuxeo.workflows().fetchTasks({
        actorId: this.currentUser
    }).then(function(doc) {
        if (doc.entries.length == 0) {
            response.say("You have no waiting tasks");
            return;
        }
        return rp({
            uri: app.nuxeoUrl + 'ui/i18n/messages.json',
            headers: {
                'X-Authentication-Token': app.currentToken
            }
        }).then((content) => {
            var labels = JSON.parse(content);
            let i = 1;
            for (let id in doc.entries) {
                response.say("Task " + i++ + " " + labels[doc.entries[id].name] + ' on workflow ' + labels[doc.entries[id].workflowModelName] + ' due on ' + doc.entries[id].dueDate.substr(0, 10));
            }
        });
    });
}.bind(app));

app.intent('Search', function(request, response) {
    var criteria = request.slot("Criteria");
    this.loadToken(request.getSession().details.accessToken);
    return app.nuxeo.repository().query({
        maxResults: 5,
        sortBy: 'dc:modified',
        sortOrder: 'desc',
        query: "SELECT * FROM Document WHERE ecm:fulltext = '" + criteria + "'"
    }).then(function(doc) {
        if (doc.entries.length == 0) {
            response.say("I haven't found any documents matching " + criteria);
        }
        let i = 1;
        for (let id in doc.entries) {
            response.say("Document " + i++ + " " + doc.entries[id].title + " . ");
        }
    });
}.bind(app));

exports.handler = app.lambda();