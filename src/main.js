import $ from "jquery";
import Chessboard from "chessboardjs";
import { Chess } from "chess.js";

// ------------------------
// Game & Timer Setup
// ------------------------
const game = new Chess();

// Timers: both sides have 10 minutes (600 seconds)
let playerTime = 600;
let botTime = 600;
let timerInterval = null;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (game.turn() === "w") {
      playerTime = Math.max(0, playerTime - 1);
    } else {
      botTime = Math.max(0, botTime - 1);
    }
    updateTimerDisplay();
    if (playerTime === 0 || botTime === 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function resetTimers() {
  playerTime = 600;
  botTime = 600;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const formatTime = (time) => {
    const m = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const s = (time % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  $("#playerTimer").text(formatTime(playerTime));
  $("#botTimer").text(formatTime(botTime));
}

function endGame() {
  let result = "Game Over: ";
  if (game.in_checkmate()) {
    result +=
      game.turn() === "w"
        ? "Stockfish wins by checkmate"
        : "You win by checkmate";
  } else if (game.in_stalemate()) {
    result += "Stalemate";
  } else if (game.in_draw()) {
    result += "Draw";
  } else if (game.insufficient_material()) {
    result += "Draw due to insufficient material";
  } else {
    result += "Game over";
  }
  $("#gameResult").text(result);
}

startTimer();

// ------------------------
// UI Setup (Bot Mode Only)
// ------------------------
// Always playing with bot (Stockfish as Black)
const botMode = true; // Remove two-player mode

// ------------------------
// Board Setup (Click-to-Select Moves)
// ------------------------
const board = Chessboard("myBoard", {
  position: "start",
  draggable: false, // disable drag-and-drop
  pieceTheme: "img/chesspieces/wikipedia/{piece}.png",
  orientation: "white",
  // We'll update board and rebind events in onSnapEnd
  onSnapEnd: function () {
    board.position(game.fen());
    bindSquareClicks();
  },
});

// Initially bind clicks on board squares
bindSquareClicks();

let selectedSquare = null;
let legalMoves = [];

// Clear selection and remove highlights
function clearSelection() {
  selectedSquare = null;
  legalMoves = [];
  $(".square-55d63").removeClass("highlight legal-move error-highlight");
}

// Highlight the selected square and add a dot to legal moves
function highlightMoves(square) {
  clearSelection();
  selectedSquare = square;
  $(`[data-square='${square}']`).addClass("highlight");
  legalMoves = game.moves({ square: square, verbose: true });
  legalMoves.forEach((move) => {
    $(`[data-square='${move.to}']`).addClass("legal-move");
  });
}

// Click handler for board squares
function onSquareClick() {
  const square = $(this).attr("data-square");
  console.log("Square clicked:", square);
  const piece = game.get(square);

  // If no piece is selected and the clicked square has a piece of the mover
  if (!selectedSquare) {
    if (piece && piece.color === game.turn()) {
      highlightMoves(square);
    }
    return;
  }

  // If clicking the same square cancels selection
  if (square === selectedSquare) {
    clearSelection();
    return;
  }

  // If clicked square is a legal destination, make the move
  const move = legalMoves.find((m) => m.to === square);
  if (move) {
    const moveObj = { from: selectedSquare, to: square, promotion: "q" };
    console.log("Making move:", moveObj);
    const result = game.move(moveObj);
    if (!result) {
      // Illegal move (shouldn't happen if legalMoves is correct)
      $(this).addClass("error-highlight");
      setTimeout(() => {
        $(this).removeClass("error-highlight");
      }, 500);
    }
    board.position(game.fen());
    clearSelection();
    // In bot mode, after human move (White), trigger Stockfish for Black's move
    if (game.turn() === "b" && botMode && !game.game_over()) {
      setTimeout(askStockfishForMove, 100);
    }
    checkGameOver();
  } else {
    // If clicked square has a piece of mover, change selection; else, clear selection
    if (piece && piece.color === game.turn()) {
      highlightMoves(square);
    } else {
      clearSelection();
    }
  }
}

// Bind click events to squares (using delegation to ensure dynamic elements)
function bindSquareClicks() {
  // Remove any previous binding to avoid duplicates
  $(".square-55d63").off("click", onSquareClick);
  $(".square-55d63").on("click", onSquareClick);
}

// ------------------------
// Stockfish Integration
// ------------------------
let stockfishWorker = null;
function initStockfish() {
  stockfishWorker = new Worker("stockfish.js");
  stockfishWorker.onmessage = function (event) {
    console.log("Stockfish message:", event.data);
    if (event.data.startsWith("bestmove")) {
      const bestMove = event.data.split(" ")[1];
      console.log("Best move from Stockfish:", bestMove);
      makeBotMove(bestMove);
    }
  };
  stockfishWorker.onerror = function (error) {
    console.error("Stockfish worker error:", error);
  };
  stockfishWorker.postMessage("uci");
  stockfishWorker.postMessage("isready");
}
initStockfish();

function askStockfishForMove() {
  if (!stockfishWorker) return;
  const fen = game.fen();
  console.log("Sending FEN to Stockfish:", fen);
  stockfishWorker.postMessage("position fen " + fen);
  stockfishWorker.postMessage("go movetime 1000");
}

function makeBotMove(bestMove) {
  console.log("Bot move received:", bestMove);
  const moveObj = {
    from: bestMove.substring(0, 2),
    to: bestMove.substring(2, 4),
    promotion: "q",
  };
  const move = game.move(moveObj);
  if (!move) {
    console.error("Failed to apply bot move:", moveObj);
  } else {
    board.position(game.fen());
  }
  checkGameOver();
}

function checkGameOver() {
  if (game.game_over()) {
    clearInterval(timerInterval);
    endGame();
  }
}

// ------------------------
// Restart Game
// ------------------------
$("#restartBtn").click(function () {
  game.reset();
  board.position(game.fen());
  clearSelection();
  resetTimers();
  startTimer();
  $("#gameResult").text("");
});
