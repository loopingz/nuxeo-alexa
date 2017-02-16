/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // Sets app default base URL
  app.baseUrl = '/';

  // Read the query values
  // Found on http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
  var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  })(window.location.search.substr(1).split('&'));

  app.client_id = qs['client_id'];
  app.response_type = qs['response_type'];
  app.state = qs['state'];
  app.redirect_uri = qs['redirect_uri'];

  app.linkAccount = function() {
    app.error = undefined;
    app.loading = true;
    app.$.ajax.method = 'POST';
    app.$.ajax.contentType = 'application/json';
    app.$.ajax.body = {'user': app.user, 'url': app.url, 'password': app.password};
    var req = app.$.ajax.generateRequest();
    req.completes.then(function (req) {
      top.location = app.redirect_uri + "#state=" + app.state + "&token_type=Bearer&access_token=" + req.response.token;
      app.loading = false;
    }).catch(function (e) {
      if (app.$.ajax.lastError.status == 302) {
        app.error = 'Invalid credentials';  
      } else {
        app.error = 'Unknown error occured';
      }
      app.loading = false;
    });
  }
})(document);
