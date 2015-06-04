/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W030 */
(function() {
"use strict";

var stateMachine = require('./html5-state-machine.js'),
    htmlState = stateMachine.State;

/**
 * @class FastParser
 * @constructor FastParser
 */
function FastParser() {

    this.listeners = {};

    this.state = stateMachine.State.STATE_DATA;  /* Save the current status */
    this.tags = ['', '']; /* Save the current tag name */
    this.tagIdx = 0;
    this.attrName = ''; /* Save the current attribute name */
    this.attributeValue = ''; /* Save the current attribute value */
    this.input = '';
    this.inputLen = 0;
}

/**
 * @function FastParser#on
 *
 * @param {string} eventType - the event type 
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType</p>
 *
 */
FastParser.prototype.on = function (eventType, listener) {
    var l = this.listeners[eventType];
    if (listener) {
        if (l) {
            l.push(listener);
        } else {
            this.listeners[eventType] = [listener];
        }
    }
    return this;
};

/**
 * @function FastParser#once
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType, for which it will be fired only once</p>
 *
 */
FastParser.prototype.once = function(eventType, listener) {
    var self = this, onceListener;
    if (listener) {
        onceListener = function () {
            self.off(eventType, onceListener);
            listener.apply(self, arguments);
        };
        return this.on(eventType, onceListener);
    }
    return this;
};

/**
 * @function FastParser#off
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>remove the listener from being fired when the eventType happen</p>
 *
 */
FastParser.prototype.off = function (eventType, listener) {
    if (listener) {
        var i, len, listeners = this.listeners[eventType];
        if (listeners) {
            for (i = 0; listeners[i]; i++) {
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    }
    return this;
};

/**
 * @function FastParser#emit
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @returns this
 *
 * @description
 * <p>fire those listeners correspoding to the given eventType</p>
 *
 */
FastParser.prototype.emit = function (listeners, args) {
    if (listeners) {
        var i = -1, len;
        if ((len = listeners.length)) {
            while (++i < len) {
                listeners[i].apply(this, args || []);
            }
        }
    }
    return this;
};

/*
 * @function FastParser#walk
 *
 * @param {integer} i - the position of the current character in the input stream
 * @param {string} input - the input stream
 * @returns {integer} the new location of the current character.
 *
 */
FastParser.prototype.walk = function(i, input, endsWithEOF) {

    var ch = input[i],
        symbol = this.lookupChar(ch),
        extraLogic = stateMachine.lookupAltLogicFromSymbol[symbol][this.state],
        reconsume = stateMachine.lookupReconsumeFromSymbol[symbol][this.state];

    /* Set state based on the current head pointer symbol */
    this.state = stateMachine.lookupStateFromSymbol[symbol][this.state];

    /* See if there is any extra logic required for this state transition */
    switch (extraLogic) {
        case 1:  this.createStartTag(ch); break;
        case 2:  this.createEndTag(ch);   break;
        case 3:  this.appendTagName(ch);  break;
        case 4:  this.resetEndTag(ch);    break;
        case 6:                       /* match end tag token with start tag token's tag name */
            if(this.tags[0].toLowerCase() === this.tags[1].toLowerCase()) {
                reconsume = 0;  /* see 12.2.4.13 - switch state for the following case, otherwise, reconsume. */
                this.matchEndTagWithStartTag(symbol);
            }
            break;
        case 8:  this.matchEscapedScriptTag(ch); break;
        case 11: this.processTagName(ch); break;
        case 12: this.createAttributeNameAndValueTag(ch); break;
        case 13: this.appendAttributeNameTag(ch); break;
        case 14: this.appendAttributeValueTag(ch); break;
    }

    if (reconsume) {                  /* reconsume the character */
        this.listeners.reWalk && this.emit(this.listeners.reWalk, [this.state, i, endsWithEOF]);
        return this.walk(i, input);
    }

    return i;
};

FastParser.prototype.createStartTag = function (ch) {
    this.tagIdx = 0;
    this.tags[0] = ch;
};

FastParser.prototype.createEndTag = function (ch) {
    this.tagIdx = 1;
    this.tags[1] = ch;
};

FastParser.prototype.appendTagName = function (ch) {
    this.tags[this.tagIdx] += ch;
};

FastParser.prototype.resetEndTag = function (ch) {
    this.tagIdx = 1;
    this.tags[1] = '';
};

FastParser.prototype.matchEndTagWithStartTag = function (symbol) {
        /* Extra Logic #6 :
        WHITESPACE: If the current end tag token is an appropriate end tag token, then switch to the before attribute name state.
                Otherwise, treat it as per the 'anything else' entry below.
        SOLIDUS (/): If the current end tag token is an appropriate end tag token, then switch to the this.closing start tag state.
                Otherwise, treat it as per the 'anything else' entry below.
        GREATER-THAN SIGN (>): If the current end tag token is an appropriate end tag token, then switch to the data state and emit the current tag token.
                Otherwise, treat it as per the 'anything else' entry below.
        */
        this.tags[0] = '';
        this.tags[1] = '';

        switch (symbol) {
            case stateMachine.Symbol.SPACE: /** Whitespaces */
                this.state = stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME;
                return ;
            case stateMachine.Symbol.SOLIDUS: /** [/] */
                this.state = stateMachine.State.STATE_SELF_CLOSING_START_TAG;
                return ;
            case stateMachine.Symbol.GREATER: /** [>] */
                this.state = stateMachine.State.STATE_DATA;
                return ; 
        }
};

FastParser.prototype.matchEscapedScriptTag = function (ch) {
    /* switch to the script data double escaped state if we see <script> inside <script><!-- */    
    if ( this.tags[1].toLowerCase() === 'script') {
        this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
    }
};

FastParser.prototype.processTagName = function (ch) {
    /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
    switch (this.tags[0].toLowerCase()) {
        // TODO - give exceptions when non-HTML namespace is used.
        // case 'math':
        // case 'svg':
        //     break;
        case 'script':
            this.state = stateMachine.State.STATE_SCRIPT_DATA;
            break;
        case 'noframes':
        case 'style':
        case 'xmp':
        case 'iframe':
        case 'noembed':
        case 'noscript':
            this.state = stateMachine.State.STATE_RAWTEXT;
            break;
        case 'textarea':
        case 'title':
            this.state = stateMachine.State.STATE_RCDATA;
            break;
        case 'plaintext':
            this.state = stateMachine.State.STATE_PLAINTEXT;
            break;
    }
};

FastParser.prototype.createAttributeNameAndValueTag = function (ch) {
    /* new attribute name and value token */
    this.attributeValue = '';
    this.attrName = ch;
};

FastParser.prototype.appendAttributeNameTag = function (ch) {
    /* append to attribute name token */
    this.attrName += ch;
};

FastParser.prototype.appendAttributeValueTag = function(ch) {
    this.attributeValue += ch;   
};

/**
 * @function FastParser#lookupChar
 *
 * @param {char} ch - The character.
 * @returns {integer} The integer to represent the type of input character.
 *
 * @description
 * <p>Map the character to character type.
 * e.g. [A-z] = type 17 (Letter [A-z])</p>
 *
 */
FastParser.prototype.lookupChar = function(ch) {
    var o = ch.charCodeAt(0);
    if ( o > 122 ) { return 12; }
    return stateMachine.lookupSymbolFromChar[o];
};

/**
 * @function FastParser#contextualize
 */
FastParser.prototype.contextualize = function(input, endsWithEOF) {
    var self = this, listeners = self.listeners, i = -1, lastState;

    self.input = input;
    self.inputLen = input.length;

    while (++i < self.inputLen) {
        lastState = self.state;

        // TODO: endsWithEOF handling
        listeners.preWalk && this.emit(listeners.preWalk, [lastState, i, endsWithEOF]);

        // these functions are not supposed to alter the input
        self.beforeWalk(i, input);
        self.walk(i, input, endsWithEOF);
        self.afterWalk(i, input);

        // TODO: endsWithEOF handling
        listeners.postWalk && this.emit(listeners.postWalk, [lastState, self.state, i, endsWithEOF]);
    }
};

/**
 * @function FastParser#beforeWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @description
 * Interface function for subclass to implement logics before parsing the character.
 *
 */
FastParser.prototype.beforeWalk = function (i, input) {};

/**
 * @function FastParser#afterWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @description
 * Interface function for subclass to implement logics after parsing the character.
 *
 */
FastParser.prototype.afterWalk = function (i, input) {};

/**
 * @function FastParser#getStartTagName
 *
 * @returns {string} The current handling start tag name
 *
 */
FastParser.prototype.getStartTagName = function() {
    return this.tags[0].toLowerCase();
};

/**
 * @function FastParser#getAttributeName
 *
 * @returns {string} The current handling attribute name.
 *
 * @description
 * Get the current handling attribute name of HTML tag.
 *
 */
FastParser.prototype.getAttributeName = function() {
    return this.attrName.toLowerCase();
};

/**
 * @function FastParser#getAttributeValue
 *
 * @returns {string} The current handling attribute name's value.
 *
 * @description
 * Get the current handling attribute name's value of HTML tag.
 *
 */
FastParser.prototype.getAttributeValue = function(htmlDecoded) {
    // TODO: html decode the attribute value
    return this.attributeValue;
};

/**
* @module Parser
*/
function Parser (config, listeners) {
    var self = this, k;

    // super constructor
    FastParser.call(self);

    // config
    config || (config = {});

    // deep copy config to this.config
    self.config = {};
    if (config) {
        for (k in config) {
            self.config[k] = config[k];
        }
    } else {
        config = self.config;
    }

    // deep copy the provided listeners, if any
    if (typeof listeners === 'object') {
        for (k in listeners) {
            self.listeners[k] = listeners[k].slice();
        }
        return;
    }

    // run through the input stream with input pre-processing
    this.config.enableInputPreProcessing = (config.enableInputPreProcessing === undefined || config.enableInputPreProcessing === false)? false:true;
    this.config.enableInputPreProcessing && this.on('preWalk', InputPreProcessing);
    // fix parse errors before they're encountered in walk()
    this.config.enableCanonicalization = (config.enableCanonicalization === undefined || config.enableCanonicalization === false)? false:true;
    this.config.enableCanonicalization && this.on('preWalk', Canonicalize).on('reWalk', Canonicalize);
    // enable IE conditional comments
    this.config.enableIEConditionalComments = (config.enableIEConditionalComments === undefined || config.enableIEConditionalComments === false)? false:true;
    this.config.enableIEConditionalComments && this.on('preWalk', DisableIEConditionalComments);
    // TODO: rewrite IE <comment> tags
    // TODO: When a start tag token is emitted with its self-closing flag set, if the flag is not acknowledged when it is processed by the tree construction stage, that is a parse error.
    // TODO: When an end tag token is emitted with attributes, that is a parse error.
    // TODO: When an end tag token is emitted with its self-closing flag set, that is a parse error.

    // for bookkeeping the processed inputs and states
    if (config.enableStateTracking === undefined || config.enableStateTracking) {
        this.config.enableStateTracking = true;
        this.states = [this.state];
        this.buffer = []; 
        this.on('postWalk', function (lastState, state, i, endsWithEOF) {
            this.buffer.push(this.input[i]);
            this.states.push(state);
        }).on('reWalk', this.setCurrentState);
    }
}

// as in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
Parser.prototype = Object.create(FastParser.prototype);
Parser.prototype.constructor = Parser;

/**
* @function Parser._getSymbol
* @param {integer} i - the index of input stream
*
* @description
* Get the html symbol mapping for the character located in the given index of input stream
*/
Parser.prototype._getSymbol = function (i) {
    return i < this.inputLen ? this.lookupChar(this.input[i]) : -1;
};

/**
* @function Parser._getNextState
* @param {integer} state - the current state
* @param {integer} i - the index of input stream
* @returns {integer} the potential state about to transition into, given the current state and an index of input stream
*
* @description
* Get the potential html state about to transition into
*/
Parser.prototype._getNextState = function (state, i, endsWithEOF) {
    return i < this.inputLen ? stateMachine.lookupStateFromSymbol[this._getSymbol(i)][state] : -1;
};

/**
* @function Parser.fork
* @returns {object} a new parser with all internal states inherited
*
* @description
* create a new parser with all internal states inherited
*/
Parser.prototype.fork = function() {
    var parser = new this.constructor(this.config, this.listeners);

    parser.state = this.state;
    parser.tags = this.tags.slice();
    parser.tagIdx = this.tagIdx;
    parser.attributeName = this.attributeName;
    parser.attributeValue = this.attributeValue;

    if (this.config.enableStateTracking) {
        parser.buffer = this.buffer.slice();
        parser.states = this.states.slice();
    }
    return parser;
};

/**
 * @function Parser#contextualize
 * @param {string} input - the input stream
 *
 * @description
 * It is the same as the original contextualize() except that this method always resets to its initial state before processing.
 *
 * If the Canonicalization is enabled, it converts an input string to be an array to facilitate altering.
 */
Parser.prototype.contextualize = function (input, endsWithEOF) {
    this.setInitState(this.getInitState());
    if (this.config.enableInputPreProcessing || this.config.enableCanonicalization) {
        input = input.split('');
        FastParser.prototype.contextualize.call(this, input, endsWithEOF);
        return input.join('');
    } else {
        return FastParser.prototype.contextualize.call(this, input, endsWithEOF);
    }
};

/**
 * @function Parser#setCurrentState
 *
 * @param {integer} state - The state of HTML5 page.
 *
 * @description
 * Set the current state of the HTML5 Context Parser.
 *
 */
Parser.prototype.setCurrentState = function(state) {
    this.states.pop();
    this.states.push(this.state = state);
    return this;
};

/**
 * @function Parser#getCurrentState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
Parser.prototype.getCurrentState = function() {
    return this.state;
};

/**
 * @function Parser#getStates
 *
 * @returns {Array} An array of states.
 *
 * @description
 * Get the states of the HTML5 page
 *
 */
Parser.prototype.getStates = function() {
    return this.states.slice();
};

/**
 * @function Parser#setInitState
 *
 * @param {integer} state - The initial state of the HTML5 Context Parser.
 *
 * @description
 * Set the init state of HTML5 Context Parser.
 *
 */
Parser.prototype.setInitState = function(state) {
    this.states = [state];
    return this;
};

/**
 * @function Parser#getInitState
 *
 * @returns {integer} The initial state of the HTML5 Context Parser.
 *
 * @description
 * Get the init state of HTML5 Context Parser.
 *
 */
Parser.prototype.getInitState = function() {
    return this.states[0];
};

/**
 * @function Parser#getLastState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
Parser.prototype.getLastState = function() {
    // * undefined if length = 0 
    return this.states[ this.states.length - 1 ];
};

/**
* The implementation of Strict Context Parser functions
* 
* - InputPreProcessing
* - ConvertBogusCommentToComment
* - PreCanonicalizeConvertBogusCommentEndTag
* - Canonicalize
* - DisableIEConditionalComments
*
*/

// Perform input stream preprocessing
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#preprocessing-the-input-stream
function InputPreProcessing (state, i) {
    var input = this.input,
        chr = input[i],
        nextChr = input[i+1];

    // equivalent to inputStr.replace(/\r\n?/g, '\n')
    if (chr === '\r') {
        if (nextChr === '\n') {
            input.splice(i, 1);
            this.inputLen--;
        } else {
            input[i] = '\n';
        }
    }
    // the following are control characters or permanently undefined Unicode characters (noncharacters), resulting in parse errors
    // \uFFFD replacement is not required by the specification, we consider \uFFFD character as an inert character
    else if ((chr >= '\x01'   && chr <= '\x08') ||
             (chr >= '\x0E'   && chr <= '\x1F') ||
             (chr >= '\x7F'   && chr <= '\x9F') ||
             (chr >= '\uFDD0' && chr <= '\uFDEF') ||
             chr === '\x0B' || chr === '\uFFFE' || chr === '\uFFFF') {
        input[i] = '\uFFFD';
    }
    // U+1FFFE, U+1FFFF, U+2FFFE, U+2FFFF, U+3FFFE, U+3FFFF,
    // U+4FFFE, U+4FFFF, U+5FFFE, U+5FFFF, U+6FFFE, U+6FFFF,
    // U+7FFFE, U+7FFFF, U+8FFFE, U+8FFFF, U+9FFFE, U+9FFFF,
    // U+AFFFE, U+AFFFF, U+BFFFE, U+BFFFF, U+CFFFE, U+CFFFF,
    // U+DFFFE, U+DFFFF, U+EFFFE, U+EFFFF, U+FFFFE, U+FFFFF,
    // U+10FFFE, and U+10FFFF
    else if ((nextChr === '\uDFFE' || nextChr === '\uDFFF') &&
             (  chr === '\uD83F' || chr === '\uD87F' || chr === '\uD8BF' || chr === '\uD8FF' ||
                chr === '\uD93F' || chr === '\uD97F' || chr === '\uD9BF' || chr === '\uD9FF' ||
                chr === '\uDA3F' || chr === '\uDA7F' || chr === '\uDABF' || chr === '\uDAFF' ||
                chr === '\uDB3F' || chr === '\uDB7F' || chr === '\uDBBF' || chr === '\uDBFF')) {
        input[i] = input[i+1] = '\uFFFD';
    }
}

function ConvertBogusCommentToComment(i) {
    // convert !--. i.e., from <* to <!--*
    this.input.splice(i, 0, '!', '-', '-');
    this.inputLen += 3;

    // convert the next > to -->
    this.on('preCanonicalize', PreCanonicalizeConvertBogusCommentEndTag);
}

function PreCanonicalizeConvertBogusCommentEndTag(state, i, endsWithEOF) {
    if (this.input[i] === '>') {
        // remove itself from the listener list
        this.off('preCanonicalize', PreCanonicalizeConvertBogusCommentEndTag);

        // convert [>] to [-]->
        this.input.splice(i, 0, '-', '-');
        this.inputLen += 2;

        this.emit(this.listeners.bogusCommentCoverted, [state, i, endsWithEOF]);
    }
}

// those doctype states (52-67) are initially treated as bogus comment state, but they are further converted to comment state
// Canonicalize() will create no more bogus comment state except the fake (context-parser treats <!doctype as bogus) one hardcoded as <!doctype html> that has no NULL inside
var statesRequiringNullReplacement = [
//    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
/*0*/ 0, 0, 0, 1, 0, 1, 1, 1, 0, 0,
/*1*/ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
/*2*/ 0, 0, 1, 1, 1, 0, 0, 0, 0, 1,
/*3*/ 1, 1, 0, 0, 1, 1, 1, 1, 1, 1,
/*4*/ 1, 0, 0, 0, 1, 0, 1, 1, 1, 1,
/*5*/ 1, 1
];
// \uFFFD replacement is not required by the spec for DATA state
statesRequiringNullReplacement[htmlState.STATE_DATA] = 1;

function Canonicalize(state, i, endsWithEOF) {

    this.emit(this.listeners.preCanonicalize, [state, i, endsWithEOF]);

    var reCanonicalizeNeeded = true,
        input = this.input,
        chr = input[i], nextChr = input[i+1],
        potentialState = this._getNextState(state, i, endsWithEOF),
        nextPotentialState = this._getNextState(potentialState, i + 1, endsWithEOF);

    // console.log(i, state, potentialState, nextPotentialState, input.slice(i).join(''));

    // batch replacement of NULL with \uFFFD would violate the spec
    //  - for example, NULL is untouched in CDATA section state
    if (chr === '\x00' && statesRequiringNullReplacement[state]) {
        input[i] = '\uFFFD';
    }
    // encode < into &lt; for [<]* (* is non-alpha) in STATE_DATA, [<]% and [<]! in STATE_RCDATA and STATE_RAWTEXT
    else if ((potentialState === htmlState.STATE_TAG_OPEN && nextPotentialState === htmlState.STATE_DATA) ||  // [<]*, where * is non-alpha
             ((state === htmlState.STATE_RCDATA || state === htmlState.STATE_RAWTEXT) &&                            // in STATE_RCDATA and STATE_RAWTEXT
            chr === '<' && (nextChr === '%' || nextChr === '!'))) {   // [<]% or [<]!

        // [<]*, [<]%, [<]!
        input.splice(i, 1, '&', 'l', 't', ';');
        this.inputLen += 3;
    }
    // enforce <!doctype html>
    // + convert bogus comment or unknown doctype to the standard html comment
    else if (potentialState === htmlState.STATE_MARKUP_DECLARATION_OPEN) {            // <[!]***
        reCanonicalizeNeeded = false;

        // context-parser treats the doctype and [CDATA[ as resulting into STATE_BOGUS_COMMENT
        // so, we need our algorithm here to extract and check the next 7 characters
        var commentKey = input.slice(i + 1, i + 8).join('');

        // enforce <!doctype html>
        if (commentKey.toLowerCase() === 'doctype') {               // <![d]octype
            // extract 6 chars immediately after <![d]octype and check if it's equal to ' html>'
            if (input.slice(i + 8, i + 14).join('').toLowerCase() !== ' html>') {

                // replace <[!]doctype xxxx> with <[!]--!doctype xxxx--><doctype html>
                ConvertBogusCommentToComment.call(this, i);

                this.once('bogusCommentCoverted', function (state, i) {
                    [].splice.apply(this.input, [i + 3, 0].concat('<!doctype html>'.split('')));
                    this.inputLen += 15;
                });

                reCanonicalizeNeeded = true;
            }
        }
        // do not touch <![CDATA[ and <[!]--
        else if (commentKey === '[CDATA[' ||
                    (nextChr === '-' && input[i+2] === '-')) {
            // noop
        }
        // ends up in bogus comment
        else {
            // replace <[!]*** with <[!]--***
            // will replace the next > to -->
            ConvertBogusCommentToComment.call(this, i);
            reCanonicalizeNeeded = true;
        }
    }
    // convert bogus comment to the standard html comment
    else if ((state === htmlState.STATE_TAG_OPEN &&
             potentialState === htmlState.STATE_BOGUS_COMMENT) ||           // <[?] only from STATE_TAG_OPEN
            (potentialState === htmlState.STATE_END_TAG_OPEN &&             // <[/]* or <[/]> from STATE_END_TAG_OPEN
             nextPotentialState !== htmlState.STATE_TAG_NAME &&
             nextPotentialState !== -1)) {                                  // TODO: double check if there're any other cases requiring -1 check
        // replace <? and </* respectively with <!--? and <!--/*
        // will replace the next > to -->
        ConvertBogusCommentToComment.call(this, i);
    }
    // remove the unnecessary SOLIDUS
    else if (potentialState === htmlState.STATE_SELF_CLOSING_START_TAG &&             // <***[/]*
            nextPotentialState === htmlState.STATE_BEFORE_ATTRIBUTE_NAME) {           // input[i+1] is ANYTHING_ELSE (i.e., not EOF nor >)
        // if ([htmlState.STATE_TAG_NAME,                                             // <a[/]* replaced with <a[ ]*
        //     /* following is unknown to CP
        //     htmlState.STATE_RCDATA_END_TAG_NAME,
        //     htmlState.STATE_RAWTEXT_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME,
        //     */
        //     htmlState.STATE_BEFORE_ATTRIBUTE_NAME,                                 // <a [/]* replaced with <a [ ]*
        //     htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED].indexOf(state) !== -1)   // <a abc=""[/]* replaced with <a abc=""[ ]*
        input[i] = ' ';

        // given input[i] was    '/', nextPotentialState was htmlState.STATE_BEFORE_ATTRIBUTE_NAME
        // given input[i] is now ' ', nextPotentialState becomes STATE_BEFORE_ATTRIBUTE_NAME if current state is STATE_ATTRIBUTE_NAME or STATE_AFTER_ATTRIBUTE_NAME
        // to preserve state, remove future EQUAL SIGNs (=)s to force STATE_AFTER_ATTRIBUTE_NAME behave as if it is STATE_BEFORE_ATTRIBUTE_NAME
        // this is okay since EQUAL SIGNs (=)s will be stripped anyway in the STATE_BEFORE_ATTRIBUTE_NAME cleanup handling
        if (state === htmlState.STATE_ATTRIBUTE_NAME ||                               // <a abc[/]=abc  replaced with <a abc[ ]*
                state === htmlState.STATE_AFTER_ATTRIBUTE_NAME) {                     // <a abc [/]=abc replaced with <a abc [ ]*
            for (var j = i + 1; j < this.inputLen && input[j] === '='; j++) {
                input.splice(j, 1);
                this.inputLen--;
            }
        }
    }
    // remove unnecessary equal signs, hence <input checked[=]> become <input checked[>], or <input checked [=]> become <input checked [>]
    else if (potentialState === htmlState.STATE_BEFORE_ATTRIBUTE_VALUE &&   // only from STATE_ATTRIBUTE_NAME or STATE_AFTER_ATTRIBUTE_NAME
            nextPotentialState === htmlState.STATE_DATA) {                  // <a abc[=]> or <a abc [=]>
        input.splice(i, 1);
        this.inputLen--;
    }
    // insert a space for <a abc="***["]* or <a abc='***[']* after quoted attribute value (i.e., <a abc="***["] * or <a abc='***['] *)
    else if (potentialState === htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED &&        // <a abc=""[*] where * is not SPACE (\t,\n,\f,' ')
            nextPotentialState === htmlState.STATE_BEFORE_ATTRIBUTE_NAME &&
            this._getSymbol(i + 1) !== stateMachine.Symbol.SPACE) {
        input.splice(i + 1, 0, ' ');
        this.inputLen++;
    }
    // else here means no special pattern was found requiring rewriting
    else {
        reCanonicalizeNeeded = false;
    }

    // remove " ' < = from being treated as part of attribute name (not as the spec recommends though)
    switch (potentialState) {
        case htmlState.STATE_BEFORE_ATTRIBUTE_NAME:     // remove ambigious symbols in <a [*]href where * is ", ', <, or =
            if (nextChr === "=") {
                input.splice(i + 1, 1);
                this.inputLen--;
                reCanonicalizeNeeded = true;
                break;
            }
            /* falls through */
        case htmlState.STATE_ATTRIBUTE_NAME:            // remove ambigious symbols in <a href[*] where * is ", ', or <
        case htmlState.STATE_AFTER_ATTRIBUTE_NAME:      // remove ambigious symbols in <a href [*] where * is ", ', or <
            if (nextChr === '"' || nextChr === "'" || nextChr === '<') {
                input.splice(i + 1, 1);
                this.inputLen--;
                reCanonicalizeNeeded = true;
            }
            break;
    }

    if (reCanonicalizeNeeded) {
        return Canonicalize.call(this, state, i, endsWithEOF);
    }

    switch (state) {
    // escape " ' < = ` to avoid raising parse errors for unquoted value
        case htmlState.STATE_ATTRIBUTE_VALUE_UNQUOTED:
            if (chr === '"') {
                input.splice(i, 1, '&', 'q', 'u', 'o', 't', ';');
                this.inputLen += 5;
                break;
            } else if (chr === "'") {
                input.splice(i, 1, '&', '#', '3', '9', ';');
                this.inputLen += 4;
                break;
            }
            /* falls through */
        case htmlState.STATE_BEFORE_ATTRIBUTE_VALUE:     // treat < = ` as if they are in STATE_ATTRIBUTE_VALUE_UNQUOTED
            if (chr === '<') {
                input.splice(i, 1, '&', 'l', 't', ';');
                this.inputLen += 3;
            } else if (chr === '=') {
                input.splice(i, 1, '&', '#', '6', '1', ';');
                this.inputLen += 4;
            } else if (chr === '`') {
                input.splice(i, 1, '&', '#', '9', '6', ';');
                this.inputLen += 4;
            }
            break;

    // add hyphens to complete <!----> to avoid raising parsing errors
        // replace <!--[>] with <!--[-]->
        case htmlState.STATE_COMMENT_START:
            if (chr === '>') {                          // <!--[>]
                input.splice(i, 0, '-', '-');
                this.inputLen += 2;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;
        // replace <!---[>] with <!---[-]>
        case htmlState.STATE_COMMENT_START_DASH:
            if (chr === '>') {                          // <!---[>]
                input.splice(i, 0, '-');
                this.inputLen++;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;
    // replace --[!]> with --[>]
        case htmlState.STATE_COMMENT_END:
            if (chr === '!' && nextChr === '>') {
                input.splice(i, 1);
                this.inputLen--;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            // if (chr === '-'), ignored this parse error. TODO: consider stripping n-2 hyphens for ------>
            break;
    }

    if (reCanonicalizeNeeded) {
        return Canonicalize.call(this, state, i, endsWithEOF);
    }
}

// remove IE conditional comments
function DisableIEConditionalComments(state, i){
    var input = this.input;

    if (state === htmlState.STATE_COMMENT && input[i] === ']' && input[i+1] === '>') {
        input.splice(i, 0, ' ');
        this.inputLen++;
    }
}

module.exports = {
    Parser: Parser,
    FastParser: FastParser,
    StateMachine: stateMachine
};

})();
