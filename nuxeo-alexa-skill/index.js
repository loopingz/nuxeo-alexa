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
const path = require("path");
const crypto = require('crypto');
const algo = 'aes-256-ctr';
const secret = require('./secret');
const APP_ID = 'NUXEO';
const urlencode = require('urlencode');

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
    let tokenRaw = request.getSession().details.accessToken;
    let raw = Buffer.from(tokenRaw, 'base64');
    let iv = raw.slice(0,16);
    let enc = raw.slice(16);
    let cipher = crypto.createCipheriv(algo, secret, iv);
    let dec = cipher.update(enc, 'ascii', 'ascii');
    dec += cipher.final('ascii');
    var token = dec.toString().split("|");
    if (token.length !== 3) {
        return Promise.reject({response: {status: 401}});
    }
    if (token[0][token[0].length - 1] !== '/') {
        token[0] += "/";
    }
    var nuxeo = new Nuxeo({
        baseURL: token[0],
        auth: {
            method: 'token',
            token: token[2]
        }
    });
    nuxeo.currentUser = token[1];
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

function handleList(request, response, docs) {
    var card = '';
    let listItems = [];
    var i = 1;
    for (let id in docs) {
        let doc = docs[id];
        let title = striptags(doc.title);
        let docPath = path.dirname(doc.path);
        let url = "https://s3.amazonaws.com/nuxeo-alexa/nuxeo_doc.png";
        let res = "Document " + i++ + " " + title + "\n";
        card += res;
        if (doc.facets.indexOf("Thumbnail") >= 0) {
            url = "https://nuxeo-auth.loopingz.com/thumbnail.php?token=" + urlencode(request.getSession().details.accessToken) + "&uid=" + doc.uid;
        }
        response.say(res);
        listItems.push(
        {
            'token': doc.uid,
            "image": { 
                "sources": [
                    {"url": url}
                ],
                "contentDescription": "Thumbnail"
            },
            'textContent': {
                "primaryText": {
                    "type": "PlainText",
                    "text": title
                },
                "secondaryText": {
                    "type": "PlainText",
                    "text": docPath
                }
            }
        });
    }
    return {list: listItems, card: card};
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
    // Load the token from the request
    return loadToken(request)
        .then(function(nuxeo) {
            // Query Nuxeo
            return nuxeo.repository().query({
                maxResults: 5,
                query: "SELECT * FROM Document WHERE ecm:mixinType != 'HiddenInNavigation' AND ecm:isProxy = 0 AND ecm:isCheckedInVersion = 0 AND ecm:currentLifeCycleState != 'deleted' AND dc:creator = '" + nuxeo.currentUser + "'"
            });
        })
        .then(function(doc) {
            // If no document say so
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents created by you");
                return;
            }
            // List documents
            var res = handleList(request, response, doc.entries);
            let template = {
              "type": "ListTemplate2",
              "token": "last",
              "title": "Your last documents",
              "listItems": res.list
            }
            response.directive({"type": "Display.RenderTemplate", "template": template });
            // Add a result card to Alexa UI
            response.card({type: 'Standard', title: 'Your last documents', text: res.card, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        })
        .catch ( function(err) {
            // Handle errors
            handleError(err, request, response);
        });
});

app.intent('GetMyTasks', function(request, response) {
    return loadToken(request)
        // Load the token from the request
        .then(function(nuxeo) {
            // Retrieve the user tasks
            var p1 = nuxeo.workflows().fetchTasks({
                actorId: nuxeo.currentUser
            });
            // Retrieve also the labels
            var p2 = nuxeo._http({
                method: 'GET',
                url: nuxeo._baseURL + 'ui/i18n/messages.json'
            });
            return Nuxeo.Promise.all([p1, p2]);
        })
        .then(function(values) {
            var doc = values[0];
            // If no tasks say so
            if (doc.entries.length == 0) {
                response.say("You have no waiting tasks");
                return;
            }
            // List the tasks
            var labels = values[1];
            let i = 1;
            var listItems = [];
            var tasks = '';
            for (let id in doc.entries) {
                let res = "Task " + i++ + " " + labels[doc.entries[id].name] + ' on workflow ' + labels[doc.entries[id].workflowModelName] + ' due on ' + doc.entries[id].dueDate.substr(0, 10) + "\n";
                tasks += res;
                response.say(res);
                listItems.push(
                    {
                        'token': i,
                        'textContent': {
                            "primaryText": {
                                "type": "PlainText",
                                "text": labels[doc.entries[id].name]
                            },
                            "secondaryText": {
                                "type": "PlainText",
                                "text": doc.entries[id].dueDate.substr(0, 10) + ' - ' + labels[doc.entries[id].workflowModelName]
                            }
                        }
                    });
            }
            let template = {
              "type": "ListTemplate1",
              "token": "workflow",
              "title": "Your workflow tasks",
              "listItems": listItems
            };
            response.directive({"type": "Display.RenderTemplate", "template": template });
            // Add a card to the result
            response.card({type: 'Standard', title: 'Your next tasks', text: tasks, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        }).catch ( function(err) {
            // Handle error
            handleError(err, request, response);
        });
});

app.intent('Search', function(request, response) {
    // Retrieve the criteria
    var criteria = request.slot("Criteria");
    // Load the token from the request
    return loadToken(request)
        .then(function(nuxeo) {
            // Search Nuxeo
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
            // If no document say so
            if (doc.entries.length == 0) {
                response.say("I haven't found any documents matching " + criteria);
                return;
            }
            var res = handleList(request, response, doc.entries);
            let template = {
              "type": "ListTemplate2",
              "token": criteria,
              "title": "Nuxeo result for " + criteria,
              "listItems": res.list
            }
            response.directive({"type": "Display.RenderTemplate", "template": template });
            // Add a result card for the Alexa UI
            response.card({type: 'Standard', title: 'Search for ' + criteria, text: res.card, image: {smallImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png', largeImageUrl: 'https://s3.amazonaws.com/nuxeo-alexa/icon-512x512.png'}});
        }).catch ( function(err) {
            // Handle Error
            handleError(err, request, response);
        });
});

exports.handler = app.lambda();
