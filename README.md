HTML5 Context Parser 
====================

HTML5 Context Parser - a fast and small footprint HTML5 context parser! It parse the HTML 5 web page and analyze the execution context of each character for you!

## Overview

- *Execution Context:* This is the important concept for the browser in which to determine what kind of parsers, like URI, CSS and JavaScript to be applied on the character (i.e. context) in the HTML5 web page.
- *Cross Site Scripting* In order to defense against XSS, input validation/filtering is the right way to do. However, the correct filtering rules depends on the execution context of the HTML5 page, and developers always pick the wrong filter as it is far more complex than we expect! This context parser is a fast and small footprint HTML5 context parser to analyze the execution context of the HTML5 page.

## Designs

- *Standard Compliant:* Our parser is built based on the specification of <a href="https://html.spec.whatwg.org/multipage/">WHATWG</a>.
- *Simplification:* We are only interested in analyzing the execution context of the HTML5 page, so we don't need to implement all the processes as defined in the specification, we focus on the <a href="https://html.spec.whatwg.org/multipage/syntax.html#tokenization">Tokenization</a> process in the parsing model and states related to XSS.
  - Handling less process as the full browser! We don't handle AST tree building, parser error, rendering etc.
  - Handling less state if we focus on XSS, not all the states make sense to be output context for web development.

## Quick Start

Install the npm context-parser from the npm repo.
```
npm install context-parser
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

Run against the HTML5 file with our parser and the <a href="https://html.spec.whatwg.org/multipage/syntax.html#tokenization">state defined in HTML 5 Specification</a> of each character is printed out!
```
./bin/contextparse <html file>
  HTML-State { statesSize: 819 } +0ms
  HTML-State { ch: 0, state: 1, symbol: 0 } +1ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +1ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch:   [0x20], state: 1, symbol: 0 } +0ms
  HTML-State { ch: < [0x3c], state: 8, symbol: 7 } +0ms
...
```

The contextparse reports back the execution context of each character in the format explained below.
```
{ch:<Character>,state:<Execution Context Number>,symbol:<Symbol Type>}
```

For the execution context number and character type, please refer to the state number defined in the <a href="https://html.spec.whatwg.org/multipage/syntax.html#tokenization">HTM 5 Specification</a> and src/html5-state-machine.js.

## Development

### How to build
```
npm install
grunt
```

### How to test
```
grunt test
```

## API Documentations

Check out /docs for the detailed usage.

## License

This software is free to use under the Yahoo Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: ./LICENSE
