/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/

var fs = require('fs');
var html = fs.readFileSync('tests/samples/tests/1m.html', "utf8");  
var ContextParser = require("context-parser").Parser;

var contextualize = function(n){
    var theParser = new ContextParser();
    try {
        theParser.contextualize(html);
    } catch (e) {
        console.log(e)
    }
    if ( theParser.state !== 1 ) {
        throw "Incorrect state.";
    }
};

module.exports = function() {
    contextualize();
};
