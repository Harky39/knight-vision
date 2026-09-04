let stockfish = null;

function startStockfish() {
    if (stockfish) {
        console.log("Stockfish worker already exists");
        return;
    }

    const jsUrl = chrome.runtime.getURL(
        "stockfish-18-lite-single.js"
    );

    const wasmUrl = chrome.runtime.getURL(
        "stockfish-18-lite-single.wasm"
    );

    console.log("Starting Stockfish 18");
    console.log("JS:", jsUrl);
    console.log("WASM:", wasmUrl);
    console.log("Creating Stockfish worker");

    try {
        stockfish = new Worker(
            "stockfish-18-lite-single.js",
            {
                type: "classic"
            }
        );

        console.log("Stockfish worker created");

    } catch (error) {
        console.error(
            "Failed to create Stockfish worker:",
            error
        );

        stockfish = null;
        return;
    }

    stockfish.addEventListener(
        "messageerror",
        function (error) {
            console.error(
                "Stockfish message error:",
                error
            );
        }
    );

    stockfish.onmessage = function (event) {

        console.log(
            "Stockfish output:",
            event.data
        );

        chrome.runtime.sendMessage({
            type: "stockfish-output",
            data: event.data
        }).then(function () {

            console.log(
                "Stockfish output sent to background"
            );

        }).catch(function (error) {

            console.error(
                "Could not send Stockfish output:",
                error
            );

        });
    };

    stockfish.onerror = function (error) {

        console.error(
            "Stockfish Worker error:"
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Filename:",
            error.filename
        );

        console.error(
            "Line:",
            error.lineno
        );

        console.error(
            "Column:",
            error.colno
        );

        chrome.runtime.sendMessage({
            type: "stockfish-output",
            data: "info string Stockfish worker error: " +
                error.message
        }).catch(function (sendError) {

            console.error(
                "Could not report Stockfish error:",
                sendError
            );

        });
    };
}


chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {

        if (!message) {
            return;
        }

        if (
            message.type ===
            "stockfish-command"
        ) {

            startStockfish();

            if (!stockfish) {

                console.error(
                    "Stockfish worker is not available"
                );

                if (sendResponse) {
                    sendResponse({
                        success: false,
                        error:
                            "Stockfish worker could not be started"
                    });
                }

                return;
            }

            console.log(
                "Sending to Stockfish:",
                message.command
            );

            try {

                stockfish.postMessage(
                    message.command
                );

                if (sendResponse) {

                    sendResponse({
                        success: true
                    });

                }

            } catch (error) {

                console.error(
                    "Failed to send command to Stockfish:",
                    error
                );

                if (sendResponse) {

                    sendResponse({
                        success: false,
                        error: error.message
                    });

                }

            }

            return true;
        }
    }
);


startStockfish();


chrome.runtime.sendMessage({
    type: "stockfish-offscreen-ready"
}).then(function () {

    console.log(
        "Offscreen document ready message sent"
    );

}).catch(function (error) {

    console.error(
        "Could not notify service worker that Stockfish is ready:",
        error
    );

});