// var fs = require('fs');
// var html = fs.readFileSync('tests/samples/tests/1m.html', "utf8");  

// var parsers = [
//     ['context-parser', 'Parser', 'contextualize'],
//     ['parse5', 'Parser', 'parse'],
//     ['gumbo-parser'],
//     ['high5', '', 'end'],
//     ['htmlparser2', 'Parser', 'end'],
// ];

// parsers.forEach(function(parser) {

//     var start, end;
//     var classname = parser[0];
//     var name = parser[1];
//     var method = parser[2];

//     try {
//         if ( name || method ) {
//             var Parser = name ? require(classname)[name] : require(classname);
//             start = +new Date();
//             for(var i=0; i<10; i++) {
//                 var parser = new Parser();
//                 parser[method](html);
//             }
//             end = +new Date();
//         } else {
//             start = +new Date();
//             var method = require(classname);
//             for(var i=0; i<10; i++) {
//                 method(html);
//             }
//             end = +new Date();
//         }


//         console.log(classname + " runs at a speed of " + 10/((end - start)/1000) + " MB per seconds [" + (end-start)/10/1000 + " second per MB].")
//     } catch (e) {
//         console.log(e);

//     }
// });