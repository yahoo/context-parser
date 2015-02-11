/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*
This utility print out the state and related information of each character of the HTML5 web page.
*/
var Debug = require("debug"),
    progname = 'HTML-State';

Debug.enable(progname);

(function() {
    var Parser = require("./context-parser").Parser,
        debug = Debug(progname),
        fs = require('fs'),
        file,
        noofargs = 0,
        parser = new Parser();

    process.argv.forEach(function(val, index) {
        ++noofargs;
        if (index === 2) {
            file = val;
        }
    });

    Parser.prototype.printCharWithState = function() {
        var len = this.states.length;
        debug('{ statesSize: '+len+' }');
        for(var i=0;i<len;i++) {
            var c = this.bytes[i];
            var s = this.states[i];
            var t = this.symbols[i];

            if (i === 0) {
                debug('{ ch: 0, state: '+s+', symbol: 0 }');
            } else if ( t === 0 ) {
                /* space or eol */
                debug('{ ch:   [0x'+c.charCodeAt(0).toString(16)+'], state: '+s+', symbol: '+t+' }');
            } else {
                if (c !== undefined) {
                    debug('{ ch: '+c+' [0x'+c.charCodeAt(0).toString(16)+'], state: '+s+', symbol: '+t+' }');
                } else {
                    debug('{ undefined - char in template without state }');
                }
            }
        }
        return 0;
    };

    if (noofargs === 3) {
        if (fs.existsSync(file)) {
            parser.printCharWithState();
            process.exit(0);
        } else {
            console.log("[ERROR] "+file+" not exist");
            process.exit(1);
        }
    } else {
        console.log("Usage: contextparse <any template file>");
        process.exit(1);
    }

}).call(this);
