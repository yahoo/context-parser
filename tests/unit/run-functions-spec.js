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
    var assert = require("assert"),
        expect = require("expect.js"),
        Parser = require("../../src/context-parser").Parser,
        FastParser = require("../../src/context-parser").FastParser;

    var config = {
        enableInputPreProcessing: false,
        enableCanonicalization: false,
        enableIEConditionalComments: false
    };

    describe('HTML5 Context Parser Functions', function() {

        describe('#getStates', function(){
            it('should parse <html></html>', function(){
                var p1 = new Parser(config);
                var html = "<html></html>";
                p1.contextualize(html);
                var states = p1.getStates();
                assert.equal(states.toString(), '1,8,10,10,10,10,1,8,9,10,10,10,10,1');
            });
        });

        describe('#setCurrentState', function(){
            it('should exist)', function(){
                var p1 = new Parser(config);
                p1.setCurrentState(10);
            });
        });
        describe('#setInitState and #getInitState', function(){

            it('should exist and set state', function(){
                var p1 = new Parser(config);
                p1.setInitState(10);
                var state = p1.getInitState();
                assert.equal(state, 10);
            });


            it('should get state', function(){
                var p1 = new Parser(config);
                var html = "<html></html>";
                p1.contextualize(html);
                var state = p1.getInitState();
                assert.equal(state, 1);
            });
        });

        describe('#getLastState', function(){

            it('should get last state', function(){
                var p1 = new Parser(config);
                var html = "<html></html>";
                p1.contextualize(html);
                var state = p1.getLastState();
                assert.equal(state, 1);
            });
        });

        describe('#getAttributeName', function(){

            var html;
            it('should get attribute name following with quoted attribute value', function(){
                var p1 = new Parser(config);
                html = "<div class='classname'></div>";
                p1.contextualize(html);
                assert.equal(p1.getAttributeName(), 'class');
            });

            it('should get attribute name following with double quoted attribute value', function(){
                var p2 = new Parser(config);
                html = '<div class="classname"></div>';
                p2.contextualize(html);
                assert.equal(p2.getAttributeName(), 'class');
            });

            it('should get attribute name following with unquoted attribute value', function(){
                var p3 = new Parser(config);
                html = "<div class=classname></div>";
                p3.contextualize(html);
                assert.equal(p3.getAttributeName(), 'class');
            });

            it('should get second attribute name', function(){
                var p1 = new Parser(config);
                html = "<div class='classname' style='color:red'></div>";
                p1.contextualize(html);
                assert.equal(p1.getAttributeName(), 'style');
            });

            it('should get second attribute name (double quoted attribute value)', function(){

                var p2 = new Parser(config);
                html = "<div class='classname' style=\"color:red\"></div>";
                p2.contextualize(html);
                assert.equal(p2.getAttributeName(), 'style');
            });

            it('should get second attribute name (unquoted attribute value)', function(){

                var p3 = new Parser(config);
                html = "<div class='classname' style=color:red></div>";
                p3.contextualize(html);
                assert.equal(p3.getAttributeName(), 'style');
            });
        });
        describe('#getAttributeValue', function(){

            it('should get attribute value (quoted)', function(){
                var p1 = new Parser(config);
                var html = "<div class='classname'></div>";
                p1.contextualize(html);
                assert.equal(p1.getAttributeValue(), 'classname');
            });
            it('should get attribute value (double quoted)', function(){
                var p2 = new Parser(config);
                var html = '<div class="classname"></div>';
                p2.contextualize(html);
                assert.equal(p2.getAttributeValue(), 'classname');
            });
            it('should get attribute value (unquoted)', function(){
                var p3 = new Parser(config);
                var html = "<div class=classname></div>";
                p3.contextualize(html);
                assert.equal(p3.getAttributeValue(), 'classname');
            });


            it('should get 2nd attribute value', function(){
                var p1 = new Parser(config);
                var html = "<div class='classname' style='color:red'></div>";
                p1.contextualize(html);
                assert.equal(p1.getAttributeValue(), 'color:red');
            });

            it('should get 2nd attribute value (double quoted)', function(){
                var p2 = new Parser(config);
                var html = '<div class="classname" style="color:red"></div>';
                p2.contextualize(html);
                assert.equal(p2.getAttributeValue(), 'color:red');
            });

            it('should get 2nd attribute value (unquoted)', function(){
                var p3 = new Parser(config);
                var html = "<div class=classname style=color:red></div>";
                p3.contextualize(html);
                assert.equal(p3.getAttributeValue(), 'color:red');
            });
        });

        describe('#lookupChar', function(){
            it('should match symbol lookup table', function(){
                var parser = new Parser(config);
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
        });

        describe('#getStartTagName', function(){

            it('should return start tag name', function(){
                var p1 = new Parser(config);
                var html = "<div class='classname' style='color:red'></div>";
                p1.contextualize(html);
                assert.equal(p1.getStartTagName(), 'div');

            });

        });

        describe('#getCurrentTagIndex and #getCurrentTag', function(){

            it('should return correct tag name/index', function(){

                [ { html: "<div class='classname' style='color:red'></div>",            tag0: 'div', tag1: 'div', index: 1},
                  { html: "<div class='classname' style='color:red'></div>         ",   tag0: 'div', tag1: 'div', index: 1},
                  { html: "<div class='classname' style='color:red'></div><img>",       tag0: 'img', tag1: 'div', index: 0},
                  { html: "<div class='classname' style='color:red'></div><img   ",     tag0: 'img', tag1: 'div', index: 0},
                  { html: "<div class='classname' style='color:red'></div><img></im",   tag0: 'img', tag1: 'im',  index: 1},
                  { html: "<div class='classname' style='color:red'></div><img></img  ",tag0: 'img', tag1: 'img', index: 1},
                ].forEach(function(testObj) {
                    var p1 = new Parser(config);
                    p1.contextualize(testObj.html);
                    assert.equal(p1.getCurrentTag(0), testObj.tag0);
                    assert.equal(p1.getCurrentTag(1), testObj.tag1);
                    assert.equal(p1.getCurrentTagIndex(), testObj.index);
                });
            });
        });

        describe('#Constructor', function(){

            it('should support multiple instances', function(){
                var p1 = new Object();
                var p2 = p1;
                assert.equal(p1, p2);
                var p1 = new Parser(config);
                var p2 = new Parser(config);
                if (p1 == p2) {
                    expect(false).to.equal(true);
                } else {
                    expect(true).to.equal(true);
                }
            });
        });
    });

    describe('HTML5 Context Fast Parser', function() {

        it('should contextualize an open tag should end with open tag state', function(){
            var fastParser = new FastParser(config);
            var html = "<html> 1 < 2";
            fastParser.contextualize(html);
            expect(fastParser.state, 10)
        });

    });
}());
