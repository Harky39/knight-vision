const toggle = document.getElementById('switch');

const FREE_SOLVE_LIMIT = 50;


/* =========================================================
   KNIGHTVISION ACCESS / FREE & PRO
========================================================= */

function updateKnightVisionAccess() {
  chrome.storage.local.get(
    ['num_all_time_solves', 'isLocked', 'isPro'],
    function (result) {

      const solves = Number(result.num_all_time_solves) || 0;
      const isLocked = result.isLocked === true;
      const isPro = result.isPro === true;

      const usageText = document.getElementById('usage-text');
      const usageBar = document.getElementById('usage-progress-bar');
      const usageCard = document.getElementById('usage-card');
      const lockedCard = document.getElementById('locked-card');
      const upgradeSection = document.getElementById('upgrade-section');
      const planBadge = document.getElementById('plan-badge');

      console.log(
        'KnightVision popup access:',
        {
          isPro,
          isLocked,
          solves
        }
      );

      /*
       * ==============================
       * PRO USER
       * ==============================
       */
      if (isPro) {

        if (planBadge) {
          planBadge.textContent = 'PRO';
        }

        if (usageText) {
          usageText.textContent = 'Unlimited analyses';
        }

        if (usageBar) {
          usageBar.style.width = '100%';
        }

        if (usageCard) {
          usageCard.style.display = 'block';
        }

        if (lockedCard) {
          lockedCard.style.display = 'none';
        }

        if (upgradeSection) {
          upgradeSection.style.display = 'none';
        }

        return;
      }

      /*
       * ==============================
       * FREE USER - LOCKED
       * ==============================
       */
      if (isLocked) {

        if (planBadge) {
          planBadge.textContent = 'FREE';
        }

        if (usageText) {
          usageText.textContent =
            solves + ' / ' + FREE_SOLVE_LIMIT + ' used';
        }

        if (usageBar) {
          usageBar.style.width = '100%';
        }

        if (usageCard) {
          usageCard.style.display = 'none';
        }

        if (lockedCard) {
          lockedCard.style.display = 'flex';
        }

        if (upgradeSection) {
          upgradeSection.style.display = 'flex';
        }

        return;
      }

      /*
       * ==============================
       * FREE USER - HAS USES LEFT
       * ==============================
       */

      if (planBadge) {
        planBadge.textContent = 'FREE';
      }

      if (usageText) {
        usageText.textContent =
          solves + ' / ' + FREE_SOLVE_LIMIT + ' used';
      }

      if (usageBar) {
        const percentage = Math.min(
          (solves / FREE_SOLVE_LIMIT) * 100,
          100
        );

        usageBar.style.width = percentage + '%';
      }

      if (usageCard) {
        usageCard.style.display = 'block';
      }

      if (lockedCard) {
        lockedCard.style.display = 'none';
      }

      if (upgradeSection) {
        upgradeSection.style.display = 'flex';
      }
    }
  );
}


/* =========================================================
   STATUS LIGHT
========================================================= */

function setDisabledStatusLight() {

  $('.blob').css(
    'background',
    'yellow'
  );

  $('.blob').css(
    'animation',
    'none'
  );

  $('#status').text(
    'Disabled'
  );
}


function setIdleStatusLight() {

  $('.blob').css(
    'animation',
    'none'
  );

  $('.blob').css(
    'background',
    'limegreen'
  );

  $('#status').text(
    'Idle'
  );
}


function setSolvingStatusLight() {

  $('.blob').css(
    'animation',
    'pulse-green 0.5s infinite'
  );

  $('.blob').css(
    'background',
    'limegreen'
  );

  $('#status').text(
    'Analysing...'
  );
}


/* =========================================================
   INITIALISE TOGGLE
========================================================= */

chrome.storage.local.get(
  ['enabled', 'isLocked', 'isPro'],
  function (result) {

    /*
     * PRO USERS
     */
    if (result.isPro === true) {

      toggle.disabled = false;

      toggle.checked =
        result.enabled !== false;

      return;
    }

    /*
     * FREE USER - LOCKED
     */
    if (result.isLocked === true) {

      toggle.checked = false;
      toggle.disabled = true;

      setDisabledStatusLight();

      return;
    }

    /*
     * FREE USER - AVAILABLE
     */
    toggle.disabled = false;

    toggle.checked =
      result.enabled !== false;
  }
);


/* =========================================================
   SEND MESSAGE TO ACTIVE TAB
========================================================= */

function messageActiveTab(
  message,
  callback = () => {}
) {

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },

    function (tabs) {

      if (
        !tabs ||
        !tabs[0]
      ) {
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        message,
        callback
      );

    }
  );
}


/* =========================================================
   INITIAL STATUS LIGHT
========================================================= */

messageActiveTab(
  {
    type: "isBoardPresent"
  },

  function (response) {

    if (!response) {

      $('.blob').css(
        'background',
        'red'
      );

      $('#status').text(
        'No board'
      );

      toggle.checked = false;

      return;
    }


    chrome.storage.local.get(
      ['isSolving', 'isLocked', 'enabled', 'isPro'],

      function (result) {

  /*
   * PRO users are never locked by the free limit.
   */
  if (result.isPro === true) {

    toggle.disabled = false;

    if (result.isSolving === true) {
      setSolvingStatusLight();
      toggle.checked = true;
    }
    else if (result.enabled === false) {
      setDisabledStatusLight();
      toggle.checked = false;
    }
    else {
      setIdleStatusLight();
      toggle.checked = true;
    }

    return;
  }

  /*
   * FREE USER
   */
  if (result.isLocked === true) {

    setDisabledStatusLight();
    toggle.checked = false;
    toggle.disabled = true;

    return;
  }

  if (result.enabled === false) {

    setDisabledStatusLight();
    toggle.checked = false;

  }
  else if (result.isSolving === true) {

    setSolvingStatusLight();
    toggle.checked = true;

  }
  else {

    setIdleStatusLight();
    toggle.checked = true;
  }
}
    );

  }
);


/* =========================================================
   ENGINE EVALUATION
========================================================= */

function sigmoid(z) {

  return 1 /
    (
      1 +
      Math.exp(-z / 300)
    );

}


function updateEngineEvaluationBar() {

  chrome.storage.local.get(
    [
      'player_color',
      'solver_result',
      'isPro'
    ],

    function (result) {

      if (!result.player_color) {
        return;
      }


      const left =
        result.player_color === 'w'
          ? 'white'
          : '#403d39';


      const right =
        result.player_color === 'w'
          ? '#403d39'
          : 'white';

      const engineDepth = result.isPro === true ? 25 : 15;
      const depthBadge = document.getElementById('engine-depth-badge');
      if (depthBadge) {
        depthBadge.textContent = `Stockfish 18 • Depth ${engineDepth}`;
      }

      let score = 0;
      let text = '+0.00';


      if (
        result.solver_result &&
        result.solver_result.evaluation != null
      ) {

        const evaluation =
          result.solver_result.evaluation;


        if (
          typeof evaluation === 'string' &&
          evaluation.includes("M")
        ) {

          score =
            evaluation[0] === '-'
              ? -10000
              : 10000;

          text = evaluation;

        }

        else {

          score =
            Number(evaluation) || 0;

          const sign =
            score > 0
              ? '+'
              : '';

          text =
            sign +
            (score / 100).toFixed(2);

        }

      }


      const cutoff =
        sigmoid(score) * 100;


      $('.evaluation-bar').css(
        'background',

        `linear-gradient(
          to right,
          ${left} 0%,
          ${left} ${cutoff}%,
          ${right} ${cutoff}%,
          ${right} 100%
        )`
      );


      $('.evaluation').text(
        text
      );

    }
  );
}


updateEngineEvaluationBar();


/* =========================================================
   STORAGE CHANGES
========================================================= */

chrome.storage.onChanged.addListener(
  function (changes, namespace) {


    /* -------------------------
       Solving state
    ------------------------- */

    if ("isSolving" in changes) {

      if (
        toggle.checked &&
        !toggle.disabled
      ) {

        messageActiveTab(
          {
            type: "isBoardPresent"
          },

          function (response) {

            if (!response) {
              return;
            }


            if (
              changes.isSolving.newValue
            ) {

              setSolvingStatusLight();

            }

            else {

              setIdleStatusLight();

            }

          }
        );

      }

    }


    /* -------------------------
       Evaluation
    ------------------------- */

    if ("solver_result" in changes) {

      updateEngineEvaluationBar();

    }


    /* -------------------------
       Opening book
    ------------------------- */

    if ("openings" in changes || "isPro" in changes) {

      updateOpeningBookMoves();

    }


    /* -------------------------
       Enabled state
    ------------------------- */

    if ("enabled" in changes) {

      chrome.storage.local.get(
        ['isLocked', 'isPro'],
        function (result) {

          /* FREE locked only; PRO is exempt. */
          if (result.isLocked === true && result.isPro !== true) {

            toggle.checked = false;
            toggle.disabled = true;

            setDisabledStatusLight();

            return;
          }


          toggle.disabled = false;


          if (
            changes.enabled.newValue === true
          ) {

            toggle.checked = true;

            setIdleStatusLight();

          }

          else {

            toggle.checked = false;

            setDisabledStatusLight();

          }

        }
      );

    }


    /* -------------------------
       FREE / LOCKED status
    ------------------------- */

    if (
        changes.isLocked ||
        changes.num_all_time_solves ||
        changes.isPro
    ) {
        updateKnightVisionAccess();
    }

  }
);


/* =========================================================
   ENABLED TOGGLE
========================================================= */

toggle.addEventListener(
  "change",

  function () {

    chrome.storage.local.get(
      ['isLocked', 'isPro'],
      function (result) {

        /* FREE locked only; PRO is exempt. */
        if (result.isLocked === true && result.isPro !== true) {

          toggle.checked = false;
          toggle.disabled = true;

          setDisabledStatusLight();

          return;
        }


        /*
         * User turned extension ON.
         */

        if (toggle.checked === true) {

          chrome.storage.local.set(
            {
              enabled: true
            }
          );

        }


        /*
         * User turned extension OFF.
         */

        else {

          chrome.storage.local.set(
            {
              enabled: false
            }
          );

        }

      }
    );

  }
);


/* =========================================================
   OPENING BOOK / PRO FEATURE
========================================================= */

function generateOpeningBookElement(opening_move, player_color) {
  var left_color = player_color == 'w' ? '#fff' : '#403d39';
  var right_color = player_color == 'w' ? '#403d39' : '#fff';
  var total_games = opening_move.black + opening_move.draws + opening_move.white;
  var player_wins = player_color == 'w' ? opening_move.white : opening_move.black;
  var opponent_wins = player_color == 'w' ? opening_move.black : opening_move.white;
  var perc_player_win = player_wins / total_games * 100;
  var perc_draw = opening_move.draws / total_games * 100;
  var perc_opponent_win = opponent_wins / total_games * 100;

  bar_divs = "";
  if (perc_player_win > 0) {
    bar_divs += `
    <div id='win-stats' class="opening-win-stats-white" style="flex-grow: ${perc_player_win.toFixed(1)}; background-color: ${left_color};">
      <span class="opening-win-stats-percent-label">${perc_player_win > 15 ? perc_player_win.toFixed(0) + "%" : ''}</span>
    </div> 
    `
  }
  if (perc_draw > 0) {
    bar_divs += `
    <div id='win-stats' class="opening-win-stats-draw" style="flex-grow: ${perc_draw.toFixed(1)};">
      <span class="opening-win-stats-percent-label">${perc_draw > 15 ? perc_draw.toFixed(0) + "%" : ''}</span>
    </div> 
    `
  }
  if (perc_opponent_win > 0) {
    bar_divs += `
    <div id='win-stats' class="opening-win-stats-black" style="flex-grow: ${perc_opponent_win.toFixed(1)}; background-color: ${right_color};">
      <span class="opening-win-stats-percent-label">${perc_opponent_win > 15 ? perc_opponent_win.toFixed(0) + "%" : ''}</span>
    </div>
    `
  }

  element = $(`
  <li class="opening-moves-list-item" uci_move="${opening_move.uci}" title="">
  <span class="opening-move-san">${opening_move.san}</span>
  <span class="opening-move-total-games">${Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(total_games)}</span>
  <div class="opening-win-stats-bar">
    ${bar_divs}
  </div>
  </li>`);

  if (perc_draw == 100 | perc_player_win == 100 | perc_opponent_win == 100) {
    element.find('#win-stats').css('border-radius', '0.2rem');
  }

  return element;
}


function updateOpeningBookMoves() {
  chrome.storage.local.get(
    ['openings', 'player_color', 'isPro'],
    function (result) {
      const openingBookMoves = $('#opening-moves-list');
      openingBookMoves.empty();

      /* Opening recognition and book data are PRO-only. */
      if (result.isPro !== true) {
        openingBookMoves.append(`
          <li class="opening-pro-card">
            <span class="opening-pro-icon">♞</span>
            <div>
              <strong>Opening Intelligence</strong>
              <p>Recognise the opening and explore common book moves with KnightVision Pro.</p>
            </div>
          </li>
        `);
        return;
      }

      if (!result.openings) {
        openingBookMoves.append('<p class="opening-empty">Play a few moves to identify the opening.</p>');
        return;
      }

      if (result.openings.opening) {
        const opening = result.openings.opening;
        openingBookMoves.append(`
          <li class="opening-name-card">
            <span class="opening-name">${opening.name}</span>
            ${opening.family ? `<span class="opening-family">${opening.family}</span>` : ''}
          </li>
        `);
      }

      const moves = Array.isArray(result.openings.moves) ? result.openings.moves : [];
      if (moves.length > 0) {
        openingBookMoves.append('<li class="opening-continuations-label">COMMON MASTER CONTINUATIONS</li>');
      }
      for (const opening of moves) {
        const element = generateOpeningBookElement(opening, result.player_color);

        element.mouseover(function () {
          const move = $(this).attr('uci_move');
          messageActiveTab({ type: 'highlightBookMove', move: move });
        });

        openingBookMoves.append(element);
      }

      if (moves.length > 0) {
        openingBookMoves.mouseleave(function () {
          messageActiveTab({ type: 'unhighlightBookMove' });
        });
      } else if (!result.openings.opening) {
        openingBookMoves.append('<p class="opening-empty">Opening not identified yet.</p>');
      }
    }
  );
}

updateOpeningBookMoves();

/* =========================================================
   UPGRADE BUTTON
========================================================= */

const upgradeButton =
  document.getElementById(
    'upgrade-button'
  );


if (upgradeButton) {

  upgradeButton.addEventListener(
    "click",

    function () {

      chrome.runtime.sendMessage(
        {
          type: "signupClicked"
        }
      );

    }
  );

}


/* =========================================================
   INITIAL UI
========================================================= */

updateKnightVisionAccess();