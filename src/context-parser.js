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
            if(this.tagNames[0] === this.tagNames[1]) {
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
        if( this.states) {
            // This is error prone. May need to change the way we walk the stream to avoid this.
            this.states[i] = this.state; 
        }
        return this.walk(i, input);
    }

    return i;
};

FastParser.prototype.createStartTag = function (ch) {
    this.tagNameIdx = 0;
    this.tagNames[0] = ch.toLowerCase();
};

FastParser.prototype.createEndTag = function (ch) {
    this.tagNameIdx = 1;
    this.tagNames[1] = ch.toLowerCase();
};

FastParser.prototype.appendTagName = function (ch) {
    this.tagNames[this.tagNameIdx] += ch.toLowerCase();
};

FastParser.prototype.resetEndTag = function (ch) {
    this.tagNameIdx = 1;
    this.tagNames[1] = '';
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
        this.tagNames[0] = '';
        this.tagNames[1] = '';
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
    if ( this.tagNames[1] === 'script') {
        this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
    }
};

FastParser.prototype.processTagName = function (ch) {
    /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
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
};

FastParser.prototype.createAttributeNameAndValueTag = function (ch) {
    /* new attribute name and value token */
    this.attributeValue = '';
    this.attributeName = ch.toLowerCase();
};

FastParser.prototype.appendAttributeNameTag = function (ch) {
    /* append to attribute name token */
    this.attributeName += ch.toLowerCase();
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
};


function Parser () {
    FastParser.call(this);
    this.bytes = [];  /* Save the processed bytes */
    this.states = [stateMachine.State.STATE_DATA]; /* Save the processed status */
    this.contexts = [];
    this.buffer = []; /* Save the processed character into the internal buffer */
    this.symbols = []; /* Save the processed symbols */

}

// as in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
Parser.prototype = Object.create(FastParser.prototype);
Parser.prototype.constructor = FastParser;

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




// <iframe srcdoc=""> is a scriptable attribute too
// Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-srcdoc
var scriptableTags = {
    script:1,style:1,
    svg:1,xml:1,math:1,
    applet:1,object:1,embed:1,link:1,
    scriptlet:1                  // IE-specific
};

/**
 * @function Parser#isScriptableTag
 *
 * @returns {boolean} true if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
Parser.prototype.isScriptableTag = function() {
    return scriptableTags[this.getStartTagName()] === 1;
};



// Reference: http://www.w3.org/TR/html-markup/elements.html
Parser.ATTRTYPE_GENERAL = 0;
Parser.ATTRTYPE_URI = 1;
Parser.ATTRTYPE_CSS = 2;
Parser.ATTRTYPE_EVENT = 3;
Parser.ATTRTYPE_MIME = 4;


/**
 * @function Parser#getAttributeType
 *
 * @returns {integer} the attribute type defined for different handling (Paser.ATTRTYPE_GENERAL | Paser.ATTRTYPE_URI | Paser.ATTRTYPE_CSS | Paser.ATTRTYPE_EVENT | Paser.ATTRTYPE_MIME)
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
Parser.prototype.getAttributeType = function() {

    var attrName = this.getAttributeName(), 
        startTagName = this.getStartTagName();


    /* assuming it is from Strict Context Parser.
         and o{{placeholder}}n* can bypass the check.
         anyway, we are good to throw error in atttribute name state. 
         note: CP has lowerCase the attributeName */
    if (attrName[0] === 'o' && attrName[1] === 'n') { 
        return this.ATTRTYPE_EVENT;
    }

    // TODO: support compound uri context at <meta http-equiv="refresh" content="seconds; url">, <img srcset="url 1.5x, url 2x">


    // we generally do not differentiate whether these attribtues are tag specific during matching for simplicity
    switch (attrName) {
        case 'href':            // for a, link, img, area, iframe, frame, video, object, embed ...
        case 'src':             // for img, iframe, frame, etc
        case 'background':      // for body, table, tbody, tr, td, th, etc? (obsolete)
        case 'action':          // for form, input, button
        case 'formaction':
        case 'cite':            // for blockquote, del, ins, q
        case 'poster':          // for img, object, video, source
        case 'usemap':          // for image
        case 'longdesc':  
        case 'folder':          // for a
        case 'manifest':        // for html
        case 'classid':         // for object
        case 'codebase':        // for object, applet
        case 'icon':            // for command
        case 'profile':         // for head
        // TODO: we allow content before we implement the stack in CP for tracking attributeName
        // case 'content':         // for meta http-equiv=refresh

        // http://www.w3.org/TR/xmlbase/#syntax
        case 'xmlns':           // for svg, etc?
        case 'xml:base':  
        case 'xmlns:xlink':
        case 'xlink:href':      // for xml-related

        // srcdoc is the STRING type, not URI
        case 'srcdoc':          // for iframe

            return this.ATTRTYPE_URI;

        case 'style':
            return this.ATTRTYPE_CSS;     // for global attributes list


        // TODO: any potential loophole for the MIME type?
        case 'type':
            return this.ATTRTYPE_MIME;

        // tag-specific matching
        case 'data':
            return startTagName === 'object' ? this.ATTRTYPE_URI : this.ATTRTYPE_GENERAL;
        case 'rel':
            return startTagName === 'link' ? this.ATTRTYPE_URI : this.ATTRTYPE_GENERAL;
        case 'value':
            return startTagName === 'param' ? this.ATTRTYPE_URI : this.ATTRTYPE_GENERAL;
    }
    return this.ATTRTYPE_GENERAL;
};

module.exports = {
    Parser: Parser,
    FastParser: FastParser,
    StateMachine: stateMachine
};

})();
