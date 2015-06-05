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
        Parser = require("../../src/context-parser").Parser;

    var config = {
        enableInputPreProcessing: false,
        enableCanonicalization: false,
        enableIEConditionalComments: false
    };

    describe('HTML5 Context Parser StateMachine', function() {

        // https://html.spec.whatwg.org/multipage/syntax.html#tokenization
        it('should parse <html>{}</html>', function(){
            var p1 = new Parser(config);
            var html = "<html>{}</html>";
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,1,1,1,8,9,10,10,10,10,1');
        });

        it('should parse attribute name', function(){
            var p1 = new Parser(config);
            var html = "<option value='1' selected >";
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,39,39,42,34,35,35,35,35,35,35,35,35,36,1');
        });

        it('should parse double quoted attribute value', function(){
            var p1 = new Parser(config);
            var html = '<div class="classname" style="stylestring"></div>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,34,35,35,35,35,35,37,38,38,38,38,38,38,38,38,38,38,42,34,35,35,35,35,35,37,38,38,38,38,38,38,38,38,38,38,38,38,42,1,8,9,10,10,10,1');
        });

        it('should parse single quoted attribute value', function(){
            var p1 = new Parser(config);
            var html = "<div class='classname' style='stylestring'></div>";
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,34,35,35,35,35,35,37,39,39,39,39,39,39,39,39,39,39,42,34,35,35,35,35,35,37,39,39,39,39,39,39,39,39,39,39,39,39,42,1,8,9,10,10,10,1');
        });

        it('should parse unquoted attribute value', function(){
            var p1 = new Parser(config);
            var html = "<div class= classname style= stylestring ></div>";
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,34,35,35,35,35,35,37,37,40,40,40,40,40,40,40,40,40,34,35,35,35,35,35,37,37,40,40,40,40,40,40,40,40,40,40,40,34,1,8,9,10,10,10,1');
        });

        it('should parse slash double quoted attribute value', function(){
            var p1 = new Parser(config);
            var html = '<a href="javascript:alert(\"1\");">link</a>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,34,35,35,35,35,37,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,34,35,35,35,35,35,1,1,1,1,1,8,9,10,1');
        });

        it('should parse rcdata 1 (extra logic:6)', function(){
            var p1 = new Parser(config);

            var html = '<html><title>title</title></html>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,1,8,10,10,10,10,10,3,3,3,3,3,3,11,12,13,13,13,13,13,1,8,9,10,10,10,10,1');
        });

        it('should parse rcdata 2 (extra logic:6)', function(){
            var p1 = new Parser(config);

            var html = '<html><title>title</foo></title></html>';
            p1.contextualize(html);
            var states = p1.getStates();    
            assert.equal(states.toString(), '1,8,10,10,10,10,1,8,10,10,10,10,10,3,3,3,3,3,3,11,12,13,13,3,3,11,12,13,13,13,13,13,1,8,9,10,10,10,10,1');
        });

        it('should parse rcdata with space end tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<html><title>title</title ></html>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,1,8,10,10,10,10,10,3,3,3,3,3,3,11,12,13,13,13,13,13,34,1,8,9,10,10,10,10,1');
        });

        it('should parse double slash in rcdata end tag (extra logic:6)', function(){
            var p1 = new Parser(config);

            var html = '<html><title>title</title/></html>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,1,8,10,10,10,10,10,3,3,3,3,3,3,11,12,13,13,13,13,13,43,1,8,9,10,10,10,10,1');
        });

        it('should parse <script> tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<script>var a = 0;</script>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,1');
        });

        it('should parse <script> with space end tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<script>var a = 0;</script >';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,34,1');
        });

        it('should parse double slash in <script> end tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<script>var a = 0;</script/>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,43,1');
        });

        it('should parse <style> tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<style>style</style>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,5,5,5,5,5,5,14,15,16,16,16,16,16,1');
        });

        it('should parse <style> with space end tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<style>style</style >';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,5,5,5,5,5,5,14,15,16,16,16,16,16,34,1');
        });

        it('should parse double slash in <style> end tag (extra logic:6)', function(){
            var p1 = new Parser(config);
            var html = '<style>style</style/>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,5,5,5,5,5,5,14,15,16,16,16,16,16,43,1');
        });

        it('should parse <script> comment (extra logic:8)', function(){
            var p1 = new Parser(config);
            var html = '<script><!-- script --> script data</script>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,17,20,21,24,22,22,22,22,22,22,22,22,23,24,6,6,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,1');

            p1 = new Parser(config);
            var html = '<script><!-- <script --> script data</script>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,17,20,21,24,22,25,28,28,28,28,28,28,29,30,31,6,6,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,1');

            p1 = new Parser(config);
            var html = '<script><!-- <abcde> --> script data</script>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,17,20,21,24,22,25,28,28,28,28,28,22,22,23,24,6,6,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,1');

        });

        it('should parse comment tag (extra logic:10)', function(){
            var p1 = new Parser(config);
            var html = '<!--comment-->';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,45,53,46,48,48,48,48,48,48,48,49,50,1');
        });

        it('should parse extra logic 11', function(){
            var p1 = new Parser(config);
            var html = '<script>var a = 0;</script>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,6,6,6,6,6,6,6,6,6,6,6,17,18,19,19,19,19,19,19,1');
            p1 = new Parser(config);
            html = '<noframes>noframes</noframes>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,10,10,5,5,5,5,5,5,5,5,5,14,15,16,16,16,16,16,16,16,16,1');

            p1 = new Parser(config);
            html = '<xmp>xmptext</xmp>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,5,5,5,5,5,5,5,5,14,15,16,16,16,1');

            p1 = new Parser(config);
            html = '<iframe></iframe>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,5,14,15,16,16,16,16,16,16,1');

            p1 = new Parser(config);
            html = '<noembed></noembed>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,10,5,14,15,16,16,16,16,16,16,16,1');

            p1 = new Parser(config);
            html = '<noscript></noscript>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,10,10,5,14,15,16,16,16,16,16,16,16,16,1');

            p1 = new Parser(config);
            html = '<textarea></textarea>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,10,10,3,11,12,13,13,13,13,13,13,13,13,1');

            /* reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/plaintext */
            p1 = new Parser(config);
            html = '<plaintext></plaintext>';
            p1.contextualize(html);
            var states = p1.getStates();
            assert.equal(states.toString(), '1,8,10,10,10,10,10,10,10,10,10,7,7,7,7,7,7,7,7,7,7,7,7,7');
        });
    });
}());
