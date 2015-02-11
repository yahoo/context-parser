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
        fs = require("fs"),
        Parser = require("../../src/context-parser").Parser;

    describe('HTML5 Context Parser bug test suite', function(){

        it('Don\'t print char twice in reconsume logic test', function(){
            var o = "";
            var file  = "./tests/samples/tests/001.html";
            var parser = new Parser();

            var data = fs.readFileSync(file, 'utf-8');
            parser.contextualize(data);
            o = parser.getBuffer().join('');

            expect(o).not.to.match(/sscript/);
            expect(o).not.to.match(/script>>/);
            expect(o).not.to.match(/\/a>>/);
        });

    });

}());
