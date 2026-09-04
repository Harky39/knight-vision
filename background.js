const extpay = ExtPay('knightvision');
extpay.startBackground();

// Plan-based engine strength. Free is intentionally capped; Pro searches deeper.
const FREE_ENGINE_DEPTH = 15;
const PRO_ENGINE_DEPTH = 25;

/* Stockfish 18 runs inside an MV3 offscreen document. */

var last_fen_string = "";
var engine_evaluation = null;
var max_solve_depth = 25;
var best_move = "";
var is_solving = false;
var solve_start_time = 0;
var fen_solve_queue = [];
var _stockfish = null;

var stockfish_ready = false;
var stockfish_command_queue = [];

function ensure_stockfish_offscreen() {
    return chrome.offscreen.hasDocument().then(function (exists) {
        if (exists) {
            return;
        }

        return chrome.offscreen.createDocument({
            url: "stockfish-offscreen.html",
            reasons: ["WORKERS"],
            justification: "Run the Stockfish chess engine in a dedicated Web Worker."
        });
    });
}

function StockfishProxy() {
    this.onmessage = null;

    this.postMessage = function (command) {

        console.log("StockfishProxy received:", command);

        stockfish_command_queue.push(command);

        ensure_stockfish_offscreen()
            .then(function () {

                console.log("Offscreen document is ready");

                while (stockfish_command_queue.length > 0) {

                    var cmd = stockfish_command_queue.shift();

                    console.log("Sending command to offscreen:", cmd);

                    chrome.runtime.sendMessage({
                        type: "stockfish-command",
                        command: cmd
                    })
                    .then(function () {
                        console.log("Command sent successfully");
                    })
                    .catch(function (error) {
                        console.error(
                            "Stockfish command error:",
                            error
                        );
                    });
                }
            })
            .catch(function (error) {
                console.error(
                    "Could not create Stockfish offscreen document:",
                    error
                );
            });
    };
}

chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.type !== "stockfish-output") {
        return;
    }

    if (_stockfish && typeof _stockfish.onmessage === "function") {
        _stockfish.onmessage(message.data);
    }
});

function load_stockfish() {

    if (_stockfish) {
        _stockfish.postMessage("quit");
    }

    _stockfish = new StockfishProxy();

    fen_solve_queue = [];
    is_solving = false;

    chrome.storage.local.set({
        "isSolving": false
    });

    _stockfish.onmessage = function (line) {

        console.log("Stockfish:", line);

        if (typeof line !== "string") {
            return;
        }

        var tokens = line.split(" ");

        if (tokens[0] == "bestmove") {

            chrome.storage.local.set({
                "isSolving": false
            });

            is_solving = false;

            if (fen_solve_queue.length > 0) {
                startSolve(fen_solve_queue.shift());
            }
        }

        else if (
            tokens[0] == "info"
            && tokens[1] == "depth"
            && (
                (Date.now() - solve_start_time > 200)
                || (tokens[2] == max_solve_depth)
            )
        ) {

            var new_evaluation = null;

            for (var i = 0; i < tokens.length; i++) {

                if (tokens[i] == "score") {

                    var score_type = tokens[i + 1];
                    var score = tokens[i + 2];

                    if (score_type == "cp") {
                        new_evaluation = score;
                    }

                    else if (score_type == "mate") {

                        new_evaluation = "M" + Math.abs(score);

                        if (score < 0) {
                            new_evaluation = "-" + new_evaluation;
                        }
                    }
                }

                if (tokens[i] == "pv") {

                    if (
                        engine_evaluation == null
                        || (new_evaluation && new_evaluation.includes("M"))
                        || (
                            new_evaluation != null
                            && engine_evaluation != null
                            && new_evaluation - engine_evaluation >= 10
                        )
                    ) {
                        best_move = tokens[i + 1];
                    }

                    engine_evaluation = new_evaluation;

                    chrome.storage.local.get(["enabled"], function (result) {

                        if (result.enabled) {

                            chrome.storage.local.set({
                                "solver_result": {
                                    best_move: best_move,
                                    fen: last_fen_string,
                                    evaluation: engine_evaluation,
                                    depth: tokens[2],
                                    solve_start_time: solve_start_time
                                }
                            });
                        }
                    });

                    break;
                }
            }
        }
    };

    _stockfish.postMessage("uci");

    return _stockfish;
}

// Checks if user is giving check
// Do not request a move here, as it will break stockfish
function isPlayerGivingCheck(fen_string) {
	split_fen = fen_string.split(" ");
	split_fen[1] = split_fen[1] == "w" ? "b" : "w";
	fen_string = split_fen.join(" ");
	const chess = new Chess(fen_string);
	return chess.inCheck()
}

var stockfish = load_stockfish();

function startSolve(fen_string) {

    chrome.storage.local.get(
        ['enabled', 'max_depth', 'isLocked', 'isPro'],
        function (result) {

            // Do not allow analysis when the free limit has been reached.
            if (
    result.isLocked === true &&
    result.isPro !== true
) {

    console.log(
        "KnightVision is locked — free limit reached."
    );

    chrome.storage.local.set({
        isSolving: false,
        solver_result: null
    });

    is_solving = false;

    return;
}

            if (result.enabled) {
			chrome.storage.local.set({ 'isSolving': true });
			is_solving = true;

			last_fen_string = fen_string;

			if (isPlayerGivingCheck(fen_string)) {
				console.log("Player is giving check, not solving");
				setTimeout(function () {
					chrome.storage.local.set({ 'isSolving': false });
					is_solving = false;
					console.log("set solving to false...")
				}, 100);
				return;
			}

			engine_evaluation = null;
			max_solve_depth = result.isPro === true ? PRO_ENGINE_DEPTH : FREE_ENGINE_DEPTH;

			solve_start_time = Date.now();

			stockfish.postMessage(`position fen ${fen_string} moves`);
			stockfish.postMessage(`go movetime 8000 depth ${max_solve_depth}`);
			chrome.storage.local.get(
    [
        'num_all_time_solves',
        'isPro'
    ],
    function (result) {
        /*
         * Pro users have unlimited solves.
         */
        if (result.isPro === true) {
            console.log(
                "KnightVision Pro solve - unlimited"
            );
            return;
        }
        /*
         * Free user solve counter.
         */
        var currentSolves =
            Number(
                result.num_all_time_solves
            ) || 0;
        var solves =
            Math.min(
                currentSolves + 1,
                FREE_SOLVE_LIMIT
            );
        chrome.storage.local.set({
            num_all_time_solves:
                solves
        });
        /*
         * Lock immediately after
         * the final free solve.
         */
        if (
            solves >= FREE_SOLVE_LIMIT
        ) {
            console.log(
                "KnightVision Free limit reached."
            );
            chrome.storage.local.set({
                isLocked: true,
                isSolving: false
            });
        }
    }
);
			console.log(`position fen ${fen_string} moves`);
		}
	});
}

chrome.runtime.onMessage.addListener(
	function (message, sender, sendResponse) {
		switch (message.type) {
			case "startSolve":
				stockfish.postMessage("stop");
				if (is_solving) {
					fen_solve_queue.push(message.fen_string);
				} else {
					startSolve(message.fen_string);
				}
				break;
			case "newGame":
				stockfish.postMessage("stop");
				stockfish.postMessage('ucinewgame');
				break;
			case "stopSolve":
				stockfish.postMessage('stop');
				break;
			case "signupClicked":
				console.log("KnightVision upgrade clicked");
				extpay.openPaymentPage();
				break;
			case "reloadStockfish":
				stockfish = load_stockfish();
				break;
			default:
			// Do nothing

		}
		console.log(message.type);
	}
)

chrome.storage.onChanged.addListener(function (changes, namespace) {
	if ("enabled" in changes) {
		if (changes.enabled.newValue == false) {
			stockfish.postMessage("stop");
		}
	}
	if ("isSolving" in changes) {
		is_solving = changes.isSolving.newValue;
	}
});

// Initial settings
chrome.storage.local.get(['enabled'], result => {
	if (result.enabled == undefined) {
		chrome.storage.local.set({ enabled: true })
	}
});
chrome.storage.local.get(['num_all_time_solves'], result => {
	if (result.num_all_time_solves == undefined) {
		chrome.storage.local.set({ num_all_time_solves: 0 })
	}
});
chrome.storage.local.get(['engine_highlight_color'], result => {
	if (result.engine_highlight_color == undefined) {
		chrome.storage.local.set({ engine_highlight_color: "#1BACB0" })
	}
});
chrome.storage.local.get(['max_depth'], result => {
	if (result.max_depth == undefined) {
		chrome.storage.local.set({ max_depth: PRO_ENGINE_DEPTH })
	}
});
// =========================================================
// KNIGHTVISION FREE / PRO ACCESS CONTROL
// =========================================================

const FREE_SOLVE_LIMIT = 50;


function checkKnightVisionAccess() {

    extpay.getUser()

        .then(function (user) {

            console.log(
                "KnightVision payment status:",
                user.paid
            );


            // =============================================
            // PRO USER
            // =============================================

            if (user.paid === true) {

                console.log(
                    "KnightVision Pro: Unlimited access"
                );

                chrome.storage.local.set({

                    isLocked: false,

                    isPro: true,

                    enabled: true

                });

                return;
            }


            // =============================================
            // FREE USER
            // =============================================

            chrome.storage.local.get(
                ["num_all_time_solves"],

                function (result) {

                    var solves =
                        Number(
                            result.num_all_time_solves
                        ) || 0;


                    var locked =
                        solves >= FREE_SOLVE_LIMIT;


                    console.log(

                        "KnightVision Free:",

                        solves + "/" +
                        FREE_SOLVE_LIMIT

                    );


                    chrome.storage.local.set({
                        isLocked: locked,
                        isPro: false
                    });

                    if (locked) {
                        chrome.storage.local.set({
                            isSolving: false
                        });
                        is_solving = false;
                    }

                }

            );

        })

        .catch(function (error) {

            console.error(

                "Could not check KnightVision payment status:",

                error

            );


            /*
             * If ExtensionPay cannot be reached,
             * use the existing stored state.
             */

        });

}


// =========================================================
// CHECK ACCESS WHEN SERVICE WORKER STARTS
// =========================================================

checkKnightVisionAccess();


// =========================================================
// PAYMENT COMPLETED
// =========================================================

extpay.onPaid.addListener(
    function (user) {

        console.log(
            "KnightVision: user paid!"
        );

        console.log(
            "KnightVision Pro activated"
        );


        chrome.storage.local.set({

            isLocked: false,

            isPro: true,

            enabled: true,

            isSolving: false

        });


        is_solving = false;

    }
);