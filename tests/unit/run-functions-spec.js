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
    var assert = require("assert")
        expect = require("expect.js"),
        Parser = require("../../src/context-parser").Parser,
        parser = new Parser();

    describe('HTML5 Context Parser functions test suite', function(){

        // it('HTML5 Context Parser#getStates test', function(){
        //     var p1 = new Parser();
        //     var html = "<html></html>";
        //     p1.contextualize(html);
        //     var states = p1.getStates();
        //     assert.equal(states.toString(), '1,8,10,10,10,10,1,8,9,10,10,10,10,1');
        // });

        it('HTML5 Context Parser#setCurrentState test (function existence test)', function(){
            var p1 = new Parser();
            p1.setCurrentState(10);
        });

        // it('HTML5 Context Parser#setInitState test', function(){
        //     var p1 = new Parser();
        //     p1.setInitState(10);
        //     var state = p1.getInitState();
        //     assert.equal(state, 10);
        // });

        // it('HTML5 Context Parser#getInitState test', function(){
        //     var p1 = new Parser();
        //     var html = "<html></html>";
        //     p1.contextualize(html);
        //     var state = p1.getInitState();
        //     assert.equal(state, 1);
        // });

        // it('HTML5 Context Parser#getLastState test', function(){
        //     var p1 = new Parser();
        //     var html = "<html></html>";
        //     p1.contextualize(html);
        //     var state = p1.getLastState();
        //     assert.equal(state, 1);
        // });

        it('HTML5 Context Parser#getAttributeName test 1', function(){
            var p1 = new Parser();
            var html = "<div class='classname'></div>";
            p1.contextualize(html);
            assert.equal(p1.getAttributeName(), 'class');

            var p2 = new Parser();
            html = '<div class="classname"></div>';
            p2.contextualize(html);
            assert.equal(p2.getAttributeName(), 'class');

            var p3 = new Parser();
            html = "<div class=classname></div>";
            p3.contextualize(html);
            assert.equal(p3.getAttributeName(), 'class');
        });

        it('HTML5 Context Parser#getAttributeName test 2', function(){
            var p1 = new Parser();
            var html = "<div class='classname' style='color:red'></div>";
            p1.contextualize(html);
            assert.equal(p1.getAttributeName(), 'style');

            var p2 = new Parser();
            html = "<div class='classname' style='color:red'></div>";
            p2.contextualize(html);
            assert.equal(p2.getAttributeName(), 'style');

            var p3 = new Parser();
            html = "<div class='classname' style='color:red'></div>";
            p3.contextualize(html);
            assert.equal(p3.getAttributeName(), 'style');
        });

        it('HTML5 Context Parser#getAttributeValue test 1', function(){
            var p1 = new Parser();
            var html = "<div class='classname'></div>";
            p1.contextualize(html);
            assert.equal(p1.getAttributeValue(), 'classname');

            var p2 = new Parser();
            var html = '<div class="classname"></div>';
            p2.contextualize(html);
            assert.equal(p2.getAttributeValue(), 'classname');

            var p3 = new Parser();
            var html = "<div class=classname></div>";
            p3.contextualize(html);
            assert.equal(p3.getAttributeValue(), 'classname');
        });

        it('HTML5 Context Parser#getAttributeValue test 2', function(){
            var p1 = new Parser();
            var html = "<div class='classname' style='color:red'></div>";
            p1.contextualize(html);
            assert.equal(p1.getAttributeValue(), 'color:red');

            var p2 = new Parser();
            var html = '<div class="classname" style="color:red"></div>';
            p2.contextualize(html);
            assert.equal(p2.getAttributeValue(), 'color:red');

            var p3 = new Parser();
            var html = "<div class=classname style=color:red></div>";
            p3.contextualize(html);
            assert.equal(p3.getAttributeValue(), 'color:red');
        });

        it('HTML5 Context Parser#lookupChar test', function(){
            var r = parser.lookupChar('\t');
            assert.equal(r, 0);
            r = parser.lookupChar('\n');
            assert.equal(r, 0);
            r = parser.lookupChar('\f');
            assert.equal(r, 0);
            r = parser.lookupChar(' ');
            assert.equal(r, 0);
            r = parser.lookupChar('!');
            assert.equal(r, 1);
            r = parser.lookupChar('"');
            assert.equal(r, 2);
            r = parser.lookupChar('&');
            assert.equal(r, 3);
            r = parser.lookupChar('\'');
            assert.equal(r, 4);
            r = parser.lookupChar('-');
            assert.equal(r, 5);
            r = parser.lookupChar('/');
            assert.equal(r, 6);
            r = parser.lookupChar('<');
            assert.equal(r, 7);
            r = parser.lookupChar('=');
            assert.equal(r, 8);
            r = parser.lookupChar('>');
            assert.equal(r, 9);
            r = parser.lookupChar('?');
            assert.equal(r, 10);
            r = parser.lookupChar('a');
            assert.equal(r, 11);
            r = parser.lookupChar('z');
            assert.equal(r, 11);
            r = parser.lookupChar('A');
            assert.equal(r, 11);
            r = parser.lookupChar('Z');
            assert.equal(r, 11);
            r = parser.lookupChar('1');
            assert.equal(r, 12);
        });

        it('HTML5 Context Parser#create 2 instances test', function(){
            var p1 = new Object();
            var p2 = p1;
            assert.equal(p1, p2);
            var p1 = new Parser();
            var p2 = new Parser();
            if (p1 == p2) {
                expect(false).to.equal(true);
            } else {
                expect(true).to.equal(true);
            }
        });
    });
}());
