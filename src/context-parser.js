/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function() {
"use strict";

var debug = require('debug')('context-parser');
var trace = require('debug')('context-parser-trace');
var stateMachine = require('./html5-state-machine.js');

/**
 * @class FastParser
 * @constructor FastParser
 */
function FastParser() {
    this.state = stateMachine.State.STATE_DATA;  /* Save the current status */
    this.tagNames = ['', '']; /* Save the current tag name */
    this.tagNameIdx = '';
    this.attributeName = ''; /* Save the current attribute name */
    this.attributeValue = ''; /* Save the current attribute value */
}

/**
 * @function FastParser#contextualize
 *
 * @param {string} input - The byte stream of the HTML5 web page.
 * @returns {integer} The return code of success or failure of parsing.
 *
 * @description
 * <p>The context analyzing function, it analyzes the output context of each character based on
 * the HTML5 WHATWG - https://html.spec.whatwg.org/multipage/</p>
 *
 */
FastParser.prototype.contextualize = function(input) {
    var len = input.length;
    for(var i = 0; i < len; ++i) {
        i = this.beforeWalk(i, input);
        if ( i >= len ) { break; }
        i = this.walk(i, input);
        if ( i >= len ) { break; }
        this.afterWalk(input[i], i);
    }
};

/*
 * @function FastParser#walk
 *
 * @param {integer} i - the position of the current character in the input stream
 * @param {string} input - the input stream
 * @returns {integer} the new location of the current character.
 *
 */
FastParser.prototype.walk = function(i, input) {

    var ch = input[i],
        len = input.length,
        symbol = this.lookupChar(ch),
        extraLogic = stateMachine.lookupAltLogicFromSymbol[symbol][this.state],
        reconsume = stateMachine.lookupReconsumeFromSymbol[symbol][this.state];

    // trace('Enter the walk');
    // trace({i: i, ch: ch, symbol: symbol, state: this.state, extraLogic: extraLogic, reconsume: reconsume });
    // trace({states: this.states});
    // trace({bytes: this.bytes});
    // trace({contexts: this.contexts});

    /* Set state based on the current head pointer symbol */
    this.state = stateMachine.lookupStateFromSymbol[symbol][this.state];

    /* See if there is any extra logic required for this state transition */
    switch (extraLogic) {
        case 1:                       /* new start tag token */
            this.tagNameIdx = 0;
            this.tagNames[0] = ch.toLowerCase();
            break;
        case 2:                       /* new end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] = ch.toLowerCase();
            break;
        case 3:                       /* append to the current start|end tag token */
            this.tagNames[this.tagNameIdx] += ch.toLowerCase();
            break;
        case 4:                       /* remove the end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] = '';
            break;
        // case 5:                       /* new end tag token */
        //     this.tagNameIdx = 1;
        //     this.tagNames[1] = ch.toLowerCase();
        //     break;
        case 6:                       /* match end tag token with start tag token's tag name */
            if(this.tagNames[0] === this.tagNames[1]) {
                /* Extra Logic #6 :
                WHITESPACE: If the current end tag token is an appropriate end tag token, then switch to the before attribute name state.
                        Otherwise, treat it as per the 'anything else' entry below.
                SOLIDUS (/): If the current end tag token is an appropriate end tag token, then switch to the this.closing start tag state.
                        Otherwise, treat it as per the 'anything else' entry below.
                GREATER-THAN SIGN (>): If the current end tag token is an appropriate end tag token, then switch to the data state and emit the current tag token.
                        Otherwise, treat it as per the 'anything else' entry below.
                */
                reconsume = 0;  /* see 12.2.4.13 - switch state for the following case, otherwise, reconsume. */
                this.tagNames[0] = '';
                this.tagNames[1] = '';
                switch (ch) {
                    case ' ': /** Whitespaces */
                        this.state = stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME;
                        break;
                    case '/': /** [/] */
                        this.state = stateMachine.State.STATE_SELF_CLOSING_START_TAG;
                        break;
                    case '>': /** [>] */
                        this.state = stateMachine.State.STATE_DATA;
                        break;
                }
            }
            break;

        case 8:                       /* switch to the script data double escaped state if we see <script> inside <script><!-- */
            if ( this.tagNames[1] === 'script') {
                this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
            }
            break;

        case 11:                      /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
            switch (this.tagNames[0]) {
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
            break;

        case 12:                      /* new attribute name and value token */
            this.attributeValue = '';
            this.attributeName = ch.toLowerCase();
            break;
        case 13:                      /* append to attribute name token */
            this.attributeName += ch.toLowerCase();
            break;
        case 14:                      /* append to attribute value token */
            this.attributeValue += ch.toLowerCase();
            break;
    }

    if (reconsume) {                  /* reconsume the character */
        // trace('Reconsuming...');
        if( this.states) {
            this.states[i] = this.state; // This is buggy. May need to change the way we walk the stream to avoid this.
        }
        return this.walk(i, input);
    }

    return i;
};

/**
 * @function FastParser#extractContext
 *
 * @param {integer} before - the state before the selected character
 * @param {integer} after - the state after the selected character
 * @returns {integer} the context of the character.

 */
FastParser.prototype.extractContext = function(before, after) {

    if ( before === after ) {     /* context that are encapsulated by operators. e.g. bar in <foo>bar</far> */
        switch (after) {
            case stateMachine.State.STATE_DATA:
                return stateMachine.Context.HTML;
            case stateMachine.State.STATE_RCDATA:
                return stateMachine.Context.RCDATA;
            case stateMachine.State.STATE_RAWTEXT:
                return stateMachine.Context.RAWTEXT;
            case stateMachine.State.STATE_SCRIPT_DATA:
                return stateMachine.Context.SCRIPT;
            case stateMachine.State.STATE_PLAINTEXT:
                return stateMachine.Context.PLAINTEXT;
            case stateMachine.State.STATE_TAG_NAME:
            case stateMachine.State.STATE_RCDATA_END_TAG_NAME:
            case stateMachine.State.STATE_RAWTEXT_END_TAG_NAME:
                return stateMachine.Context.TAG_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_NAME:
                return stateMachine.Context.ATTRIBUTE_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_SINGLE_QUOTED;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_UNQUOTED;
            case stateMachine.State.STATE_BOGUS_COMMENT:
                return stateMachine.Context.BOGUS_COMMENT;
            case stateMachine.State.STATE_COMMENT:
                return stateMachine.Context.COMMENT;
            case stateMachine.State.STATE_SCRIPT_DATA_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END:                
                return stateMachine.Context.SCRIPT;                
        }
    } else {                   /* context that are determined by previous operator. e.g. bar in <bar quz=...> */
        switch (after) {
            case stateMachine.State.STATE_TAG_NAME:
            case stateMachine.State.STATE_RCDATA_END_TAG_NAME:
            case stateMachine.State.STATE_RAWTEXT_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
                return stateMachine.Context.TAG_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_NAME:
                return stateMachine.Context.ATTRIBUTE_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_UNQUOTED;
            case stateMachine.State.STATE_BOGUS_COMMENT:
                return stateMachine.Context.BOGUS_COMMENT;

            // TODO... 
            case stateMachine.State.STATE_SCRIPT_DATA:                
            case stateMachine.State.STATE_SCRIPT_DATA_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END:                
                return stateMachine.Context.SCRIPT;
        }
    }

    return stateMachine.Context.OPERATOR;

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

    // console.log(' - ' + ch + ' - ')
    var o = ch.charCodeAt(0);

    if( o >= stateMachine.Char.SMALL_A && o <= stateMachine.Char.SMALL_Z ) { return 11; }
    if( o >= stateMachine.Char.CAPTIAL_A && o <= stateMachine.Char.CAPTIAL_Z ) { return 11; }

    if( o ===  stateMachine.Char.TAB) { return 0; } 
    if( o ===  stateMachine.Char.LF) { return 0; } 
    if( o ===  stateMachine.Char.FF) { return 0; } 
    if( o ===  stateMachine.Char.SPACE) { return 0; } 
    if( o ===  stateMachine.Char.EXCLAMATION) { return 1; } 
    if( o ===  stateMachine.Char.DOUBLE_QUOTE) { return 2; } 
    if( o ===  stateMachine.Char.AMPERSAND) { return 3; } 
    if( o ===  stateMachine.Char.SINGLE_QUOTE) { return 4; } 
    if( o ===  stateMachine.Char.DASH) { return 5; } 
    if( o ===  stateMachine.Char.SLASH) { return 6; } 
    if( o ===  stateMachine.Char.GREATER) { return 7; } 
    if( o ===  stateMachine.Char.EQUAL) { return 8; } 
    if( o ===  stateMachine.Char.LESS) { return 9; } 
    if( o ===  stateMachine.Char.QUESTION) { return 10; } 

    return 12;
    
};

/**
 * @function FastParser#beforeWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @return {integer} the new location of the head pointer.
 *
 * @description
 * Interface function for subclass to implement logics before parsing the character.
 *
 */
FastParser.prototype.beforeWalk = function( i, input ) {
    // debug('in html5 token beforeWalk');
    return i;
};

/**
 * @function FastParser#afterWalk
 *
 * @param {string} ch - The character consumed.
 * @param {integer} i - the head pointer location of this character
 *
 * @description
 * Interface function for subclass to implement logics after parsing the character.
 *
 */
FastParser.prototype.afterWalk = function( ch, i ) {
    // debug('in html5 token afterWalk');
};


function Parser () {
    FastParser.call(this);
    this.bytes = [];  /* Save the processed bytes */
    this.states = [stateMachine.State.STATE_DATA]; /* Save the processed status */
    this.contexts = [];
    this.buffer = []; /* Save the processed character into the internal buffer */
    this.symbols = []; /* Save the processed symbols */
}

Parser.prototype = Object.create(FastParser.prototype);

Parser.prototype.walk = function(i, input) {
    i = FastParser.prototype.walk.call(this, i, input);
    var ch = input[i];
    this.bytes[i + 1] = ch;
    this.states[i + 1] = this.state;
    this.symbols[i + 1] = this.lookupChar(ch);
    return i;
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
    this.state = state;
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
    return this.states;
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
    this.states[0] = state;
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
 * @function Parser#getBuffer
 *
 * @returns {string} The characters of the html page.
 *
 * @description
 * Get the characters from the buffer with _saveToBuffer = true.
 *
 */
Parser.prototype.getBuffer = function() {
    return this.bytes;
};

/**
 * @function Parser#getAttributeName
 *
 * @returns {string} The current handling attribute name.
 *
 * @description
 * Get the current handling attribute name of HTML tag.
 *
 */
Parser.prototype.getAttributeName = function() {
    return this.attributeName;
};

/**
 * @function Parser#getAttributeValue
 *
 * @returns {string} The current handling attribute name's value.
 *
 * @description
 * Get the current handling attribute name's value of HTML tag.
 *
 */
Parser.prototype.getAttributeValue = function() {
    return this.attributeValue;
};

/**
 * @function Parser#getStartTagName
 *
 * @returns {string} The current handling start tag name
 *
 */
Parser.prototype.getStartTagName = function() {
    return this.tagNames[0];
};

module.exports = {
    Parser: Parser,
    FastParser: FastParser,
    StateMachine: stateMachine
};

})();
