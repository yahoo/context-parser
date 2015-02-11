/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*
This utility benchmarks the performance of the JavaScript implementation of the HTML5 Context Parser.
*/
var Debug = require("debug"),
    progname = 'HTML-State';

Debug.enable(progname);

(function() {
    var fs = require('fs'),
        debug = Debug(progname),
        Parser = require("./context-parser").Tokenizer,
        parseCount = 0,
        charCount = 0,
        t = 0;

    var dirlist = [
        __dirname+"/../tests/samples/htmlparser-benchmark"
    ];

    function parsing(file) {
        var parser = new Parser();

        var data = fs.readFileSync(file, 'utf-8');
        charCount += data.length;

        var s = (new Date()).getTime();
        parser.contextualize(data);
        var e = (new Date()).getTime();

        t += e - s;
    }

    for(var j=0;j<dirlist.length;++j) {
        var files = fs.readdirSync(dirlist[j]);
        for(var i=0;i<files.length;++i) {
            parsing(dirlist[j]+"/"+files[i]);
            ++parseCount;
        }
    }

    debug("Total "+parseCount+" files, "+charCount+" chars, for "+t+" milliseconds.");
    debug("Files per second: "+Math.round((parseCount/t)*1000)+" , MB per second: " + (((charCount/t)*1000/1000000)));

}).call(this);
