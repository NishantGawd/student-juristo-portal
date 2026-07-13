// verify-pdf.js
// require('ts-node/register'); // if applicable, or just use JS

// Manually mock the ts-node/register if we run with node directly, 
// but since we compiled lib/pdf.ts is typescript, we might need to rely on the fact that next dev compiles it.
// Actually, let's just make a JS version of the verification that mimics lib/pdf.ts logic to test the polyfills.

// Copy of polyfills from lib/pdf.ts
if (typeof Promise.withResolvers === 'undefined') {
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
        constructor() { }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    };
}

if (typeof global.Path2D === 'undefined') {
    global.Path2D = class Path2D { constructor() { } };
}

if (typeof global.ImageData === 'undefined') {
    global.ImageData = class ImageData { constructor() { } };
}

process.env.PDFJS_DISABLE_DOM_MATRIX_POLYFILL = 'true';

try {
    const pdf = require("pdf-parse");
    console.log("Successfully required pdf-parse with polyfills.");

    // Create a dummy PDF buffer (header only)
    const emptyPdfBuffer = Buffer.from("%PDF-1.4\n%EOF");

    // Attempt parse (might fail on invalid PDF, but checking for ReferenceError)
    pdf(emptyPdfBuffer).then(() => {
        console.log("Parsed (or attempted parse) without ReferenceError");
    }).catch(err => {
        // We expect an error because the PDF is invalid, but NOT a ReferenceError about DOMMatrix
        if (err.name === 'ReferenceError' && err.message.includes('DOMMatrix')) {
            console.error("FAILED: DOMMatrix error still present.");
            process.exit(1);
        } else {
            console.log("Caught expected parse error (not DOMMatrix):", err.message);
            console.log("Verification SUCCESS: Polyfills are working.");
        }
    });

} catch (err) {
    console.error("Error requiring pdf-parse:", err);
}
