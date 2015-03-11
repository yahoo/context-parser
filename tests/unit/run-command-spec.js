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
    var expect = require("expect.js");

    describe('HTML5 Context Parser Command Line Utility', function(){

        it("should run benchmark command without error", function(done) {
            var exec = require('child_process').exec,
                child;
            var child = exec('./bin/benchmark',
                    function (error, stdout, stderr) {
                        if (error === null) {
                            expect(true).to.equal(true);
                            expect(stdout).to.match(/^context-parser runs at a speed of/);
                        }
                    }
                );
            setTimeout(function(f) {
                done();
            }, 100);
        });

        it("should run context-dump command without error", function(done) {
            var exec = require('child_process').exec,
                child;
            var file  = "./tests/samples/tests/001.html";
                child = exec('./bin/context-dump '+file,
                    function (error, stdout, stderr) {
                        if (error === null) {
                            expect(true).to.equal(true);
                        }
                    }
                );
            setTimeout(function(f) {
                done();
            }, 100);
        });

        it("should run state-inspector command without error", function(done) {
            var exec = require('child_process').exec,
                child;
            var child = exec('./bin/state-inspector 1 1',
                    function (error, stdout, stderr) {
                        if (error === null) {
                            expect(true).to.equal(true);
                            expect(stdout).to.match(/{ ch: '1', symbol: 12, newState: 1, reconsume: 0, extraLogic: 0 }/);
                        }
                    }
                );
            setTimeout(function(f) {
                done();
            }, 100);
        });
    });
}());
