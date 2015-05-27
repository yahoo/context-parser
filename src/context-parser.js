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

var stateMachine = require('./html5-state-machine.js');
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
    if (l) {
        l.push(listener);
    } else {
        this.listeners[eventType] = [listener];
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
FastParser.prototype.off = function (listeners, listener) {
    var i = listeners.length;
    while (--i) {
        if (listeners[i] === listener) {
            listeners.splice(i, 1);
            break;
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
    var i = -1, len;
    if ((len = listeners.length)) {
        while (++i < len) {
            listeners[i].apply(this, args || []);
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
    else if ((nextChr === '\uDFFE' || nextChr === '\uDFFF') && chr.charCodeAt(0) & 0xFC3F ^ 0xD83F === 0) {
             // (  chr === '\uD83F' || chr === '\uD87F' || chr === '\uD8BF' || chr === '\uD8FF' || 
             //    chr === '\uD93F' || chr === '\uD97F' || chr === '\uD9BF' || chr === '\uD9FF' || 
             //    chr === '\uDA3F' || chr === '\uDA7F' || chr === '\uDABF' || chr === '\uDAFF' || 
             //    chr === '\uDB3F' || chr === '\uDB7F' || chr === '\uDBBF' || chr === '\uDBFF')) {
        input[i] = input[i+1] = '\uFFFD';
    }
}

function NullReplacement(state, i) {
    // batch replacement of NULL with \uFFFD would violate the spec
    //  - for example, NULL is untouched in CDATA section state
    if (this.input[i] === '\x00' && stateMachine.lookupStateForNullReplacement[state]) {
        this.input[i] = '\uFFFD';
    }
}


function Parser (config, listeners) {
    var self = this, k;

    FastParser.call(self);

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
    !config.disableInputPreProcessing && self.on('preWalk', InputPreProcessing);

    // run through the input stream with state-aware null replacement
    !config.disableNullReplacement && self.on('preWalk', NullReplacement);

    // for bookkeeping the processed inputs and states
    if (!config.disableHistoryTracking) {
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
 * @function Parser#parsePartial
 *
 * @param {string} input - The HTML fragment
 * @returns {string} The processed HTML fragment, which might be altered by preWalk, reWalk or postWalk
 *
 * @description
 * It differs from contextualize() by converting input internally to be an array to facilitate altering
 */
Parser.prototype.parsePartial = function(input, endsWithEOF) {
    input = input.split('');
    FastParser.prototype.contextualize.call(this, input, endsWithEOF);
    return input.join('');
};

/**
 * @function Parser#contextualize
 * @param {string} input - the input stream
 *
 * @description
 * It is the same as the original contextualize() except that this method always resets to its initial state before processing
 */
Parser.prototype.contextualize = function (input, endsWithEOF) {
    this.setInitState(this.getInitState());
    return FastParser.prototype.contextualize.call(this, input, endsWithEOF);
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



module.exports = {
    Parser: Parser,
    FastParser: FastParser,
    StateMachine: stateMachine
};

})();
