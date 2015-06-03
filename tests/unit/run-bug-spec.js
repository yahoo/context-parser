/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    require("mocha");
    var expect = require("expect.js"),
        fs = require("fs");

    var config = {
        enableInputPreProcessing: false,
        enableCanonicalization: false,
        enableIEConditionalComments: false
    };

    describe('HTML5 Context Parser with Buggy Subclass Prototype', function(){

        it('should not print char twice in reconsume logic test', function(){
            var file  = "./tests/samples/tests/001.html";
            var Parser = require("../../src/context-parser").Parser;
            var BuggyParser = function() { Parser.call(this); }
            BuggyParser.prototype = Object.create(Parser.prototype);
            BuggyParser.prototype.constructor = Parser;
            BuggyParser.prototype.afterWalk = function( ch, i ) {
                if (!this.bytes) {
                    this.bytes = [];
                }
                this.bytes[i] = ch;
            };
            var parser = new BuggyParser(config);
            var data = fs.readFileSync(file, 'utf-8');
            parser.contextualize(data);
            o = parser.bytes.join('');

            expect(o).not.to.match(/sscript/);
            expect(o).not.to.match(/script>>/);
            expect(o).not.to.match(/\/a>>/);
        });

        it('should not crash with "beforeWalk" returning out of bound index', function() {
            var Parser = require("../../src/context-parser").Parser;
            var BuggyParser = function() { Parser.call(this); }
            BuggyParser.prototype = Object.create(Parser.prototype);
            BuggyParser.prototype.constructor = Parser;
            BuggyParser.prototype.beforeWalk = function( ) {
                return 1000;
            }
            var parser = new BuggyParser(config);
            parser.contextualize('<html></html>');

        });

        it('should not crash with "walk" returning out of bound index', function() {
            var Parser = require("../../src/context-parser").Parser;
            var BuggyParser = function() { Parser.call(this); }
            BuggyParser.prototype = Object.create(Parser.prototype);
            BuggyParser.prototype.constructor = Parser;
            BuggyParser.prototype.walk = function( ) {
                return 1000;
            }
            var parser = new BuggyParser(config);
            parser.contextualize('<html></html>');

        });

    });

}());
