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

const striptags = require('striptags');
const alexa = require('alexa-app');
const Alexa = require('alexa-sdk');
const Nuxeo = require('nuxeo');
const APP_ID = 'NUXEO'; // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Nuxeo',
            WELCOME_MESSAGE: "Welcome to Nuxeo. Say help to list commands",
            WELCOME_NOLINK_MESSAGE: "Welcome to Nuxeo. Please setup your account through Alexa website",
            WELCOME_REPROMT: 'For instructions on what you can say, please say help me.',
            HELP_MESSAGE: "You can ask questions such as, what\'s my next task, find contracts, get my last documents, or, you can say exit...Now, what can I help you with?",
            STOP_MESSAGE: 'Goodbye!',
            RELINK_MESSAGE: 'Your account token is not authorized anymore please redo the link account procedure through Alexa website'
        },
    }
};

var t = languageStrings['en-US'].translation;

var app = new alexa.app("NUXEO");

function loadToken(request) {
    if (!request.hasSession() || !request.getSession().details || !request.getSession().details.accessToken) {
        // Fake 401 error
        return Promise.reject({response: {status: 401}});
    }
    var tokenRaw = request.getSession().details.accessToken;
    var token = new Buffer(tokenRaw, 'base64').toString().split("|");
    if (token[0][token[0].length - 1] !== '/') {
        token[0] += "/";
    }
    var nuxeo = new Nuxeo({
        baseURL: token[0],
        auth: {
            method: 'token',
            token: token[2]
        },
        currentUser: token[1]
    });
    return Promise.resolve(nuxeo);
}

function handleError(err, request, response) {
    if (err.response && err.response.status && err.response.status === 401) {
        response.say(t.RELINK_MESSAGE);
        response.linkAccount();
    } else {
        console.log(err);
    }
}

app.sessionEnded(function(request, response) {
  response.say(t.STOP_MESSAGE);
});

app.launch(function(request, response) {
  
  
  if (!request.hasSession() || !request.getSession() || !request.getSession().details || !request.getSession().details.accessToken) {
    response.linkAccount();  
    response.say(t.WELCOME_NOLINK_MESSAGE);
  } else {
    response.say(t.WELCOME_MESSAGE);
    response.reprompt(t.WELCOME_REPROMT);
    response.shouldEndSession(false);
  }
});

app.intent('AMAZON.HelpIntent', function(request, response) {
    response.say(t.HELP_MESSAGE);
    response.reprompt(t.HELP_MESSAGE);
    response.shouldEndSession(false);
});

app.intent('AMAZON.CancelIntent', function(request, response) {
    response.say(t.STOP_MESSAGE);
});

app.intent('AMAZON.StopIntent', function(request, response) {
    response.say(t.STOP_MESSAGE);
});

app.intent('GetMyLast', function(request, response) {
    return loadToken(request)
        .then(function(nuxeo) {
            return nuxeo.repository().query({
                maxResults: 5,
                query: "SELECT * FROM Document WHERE ecm:mixinType != 'HiddenInNavigation' AND ecm:isProxy = 0 AND ecm:isCheckedInVersion = 0 AND ecm:currentLifeCycleState != 'deleted' AND dc:creator = '" + nuxeo.currentUser + "'"
            });
        })
        .then(function(doc) {
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents created by you");
                return;
            }
            let i = 1;
            var docs = '';
            for (let id in doc.entries) {
                let res = "Document " + i++ + " " + striptags(doc.entries[id].title) + "\n";
                docs += res;
                response.say(res);
            }
            response.card({type: 'Standard', title: 'Your last documents', text: docs, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        })
        .catch ( function(err) {
            handleError(err, request, response);
        });
});

app.intent('GetMyTasks', function(request, response) {
    return loadToken(request)
        .then(function(nuxeo) {
            var p1 = nuxeo.workflows().fetchTasks({
                actorId: nuxeo.currentUser
            });
            var p2 = nuxeo._http({
                method: 'GET',
                url: nuxeo._baseURL + 'ui/i18n/messages.json'
            });
            return Nuxeo.Promise.all([p1, p2]);
        })
        .then(function(values) {
            var doc = values[0];
            if (doc.entries.length == 0) {
                response.say("You have no waiting tasks");
                return;
            }

            var labels = values[1];
            let i = 1;
            var tasks = '';
            for (let id in doc.entries) {
                let res = "Task " + i++ + " " + labels[doc.entries[id].name] + ' on workflow ' + labels[doc.entries[id].workflowModelName] + ' due on ' + doc.entries[id].dueDate.substr(0, 10) + "\n";
                tasks += res;
                response.say(res);
            }
            response.card({type: 'Standard', title: 'Your next tasks', text: tasks, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        }).catch ( function(err) {
            handleError(err, request, response);
        });
});

app.intent('Search', function(request, response) {
    var criteria = request.slot("Criteria");
    return loadToken(request)
        .then(function(nuxeo) {
            return nuxeo.repository().query({
                maxResults: 5,
                pageSize: 5,
                currentPageIndex: 0,
                pageProvider: 'default_search',
                ecm_fulltext: criteria,
                sortBy: 'dc:modified',
                sortOrder: 'desc'
            });
        })
        .then(function(doc) {
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents matching " + criteria);
            }
            let i = 1;
            var docs = '';
            for (let id in doc.entries) {
                let res = "Document " + i++ + " " + striptags(doc.entries[id].title) + "\n";
                docs += res;
                response.say(res);
            }
            response.card({type: 'Standard', title: 'Search for ' + criteria, text: docs, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        }).catch ( function(err) {
            handleError(err, request, response);
        });
});

exports.handler = app.lambda();
