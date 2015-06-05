HTML5 Context Parser
====================
HTML5 Context Parser is a robust and small footprint HTML5 context parser that parses HTML 5 web pages and reports the execution context of each character seen.

[![npm version][npm-badge]][npm]
[![dependency status][dep-badge]][dep-status]

[npm]: https://www.npmjs.org/package/context-parser
[npm-badge]: https://img.shields.io/npm/v/context-parser.svg?style=flat-square
[dep-status]: https://david-dm.org/yahoo/context-parser
[dep-badge]: https://img.shields.io/david/yahoo/context-parser.svg?style=flat-square

## Overview

### Execution Context

Browsers use Javascript and CSS engine in order to construct the dynamic components of a page correctly. In order to determine which engine should be used, browsers use HTML parsing algorithm to determine the **context** of HTML blocks (aka tokens).  

### Cross Site Scripting 

Cross site scripting (XSS) can be prevented when input validation and filtering is performed aggressively such that it should remove all possible characters that could trigger changes in execution context in HTML. However, this has often proven as developer unfriendly and error prone. 

The other way to solve XSS is to apply the filtering at the time the output is rendered, and just remove the characters that would trigger changes in context based on the current context in the HTML. 

## Design Principles 

### Secure

Parser need to be aligning with browser [specification](http://www.w3.org/TR/html5/), in order to determine context accurately. One single parsing mistake would result in security exploit. 

### Keep It Simple and Straightforward

Keeping code simple and straightforward allows easier code review. Moreover, that would allow smaller compilation time (or JS code loading time in browser client side). 

Since we are only interested in analyzing the execution context of the HTML5 page, we focused on the [tokenization process](http://www.w3.org/TR/html5/syntax.html#tokenization) and dropped other parts that are not related to context parsing logics.


## Quick Start

Install the npm context-parser from the npm repo.
```
npm install -g context-parser
```

### Server-side (nodejs)

Analyze the execution context of HTML 5 web page in server side.
```
/* create the context parser */
var Parser = require("context-parser").Parser;
var parser = new Parser();

/* read the html web page */
var file = "...";
var data = fs.readFileSync(file, 'utf-8');

/* analyze the execution context */
parser.contextualize(data);

```

### Server-side (command line)

Run against the HTML5 file with our parser and the state defined in [HTML 5 Specification](http://www.w3.org/TR/html5/syntax.html#tokenization) and print out the state of each character.
```
./bin/context-dump <html file> <input preprocessing:0|1> <canonicalization:0|1>
  HTML-State { statesSize: 819 } +0ms
  HTML-State { ch: 0, state: 1, symbol: 0 } +1ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +1ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch: < [0x3c], state: 8, symbol: 7 } +0ms
...
```

It reports back the execution context of each character in the format explained below.
```
{ch: <Character>, state: <Execution Context Number>, symbol: <Symbol Type>}
```

For the execution context number and character type, please refer to the state number defined in the [specification](http://www.w3.org/TR/html5/syntax.html#tokenization) and [our code](src/html5-state-machine.js).

## Development

### How to build
```
npm install
npm run-script build
```

### How to test
```
npm test
```

### Build
[![Build Status](https://travis-ci.org/yahoo/context-parser.svg?branch=master)](https://travis-ci.org/yahoo/context-parser)

## License

This software is free to use under the Yahoo Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: ./LICENSE

## Related Works

* [parse5](https://github.com/inikulin/parse5) is an HTML5 compliant parser implemented in native javascript. It is used by [jsdom](https://github.com/tmpvar/jsdom) as the underlying HTML parsing engine. Parse5 has a larger code base and it exposes the parsing tree instead of execution context thus it may require some patching or trimming in order to provide context parsing functionality. 

* [htmlparser2](https://github.com/fb55/htmlparser2) is another HTML parser implemented in native javascript. It is used by [cheerio](https://github.com/cheeriojs/cheerio) as the underlying HTML parsing engine. HTMLparser2 is not a fully compliant parser thus it is less desirable to be used for application security related work.
