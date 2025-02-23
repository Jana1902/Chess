import $ from "jquery";
import Chessboard from "chessboardjs";
import { Chess } from "chess.js";

// ------------------------
// Game & Timer Setup (Bot-Only Mode)
// ------------------------
const game = new Chess();
let playerTime = 600; // 10 minutes for You (White)
let botTime = 600; // 10 minutes for Stockfish (Black)
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
// Board Setup (Click-to-Select Moves, Bot-Only Mode)
// ------------------------
const board = Chessboard("myBoard", {
  position: "start",
  draggable: false, // Use click-to-select interface
  pieceTheme: "img/chesspieces/wikipedia/{piece}.png",
  orientation: "white",
  onSnapEnd: () => board.position(game.fen()),
});

// Use delegated binding for click events on squares
$(document).on("click", ".square-55d63", onSquareClick);

let selectedSquare = null;
let legalMoves = [];

function clearSelection() {
  selectedSquare = null;
  legalMoves = [];
  $(".square-55d63").removeClass("highlight legal-move error-highlight");
}

function highlightMoves(square) {
  clearSelection();
  selectedSquare = square;
  $(`[data-square='${square}']`).addClass("highlight");
  legalMoves = game.moves({ square: square, verbose: true });
  legalMoves.forEach((move) => {
    $(`[data-square='${move.to}']`).addClass("legal-move");
  });
}

function onSquareClick() {
  // Only allow moves for White
  if (game.turn() !== "w") return;

  const square = $(this).attr("data-square");
  console.log("Square clicked:", square);
  const piece = game.get(square);

  if (!selectedSquare) {
    if (piece && piece.color === "w") {
      highlightMoves(square);
    }
    return;
  }

  if (square === selectedSquare) {
    clearSelection();
    return;
  }

  const move = legalMoves.find((m) => m.to === square);
  if (move) {
    console.log("Making move from", selectedSquare, "to", square);
    game.move({ from: selectedSquare, to: square, promotion: "q" });
    board.position(game.fen());
    clearSelection();
    // checkGameOver();
    // // After your move (White), if it's Black's turn, trigger Stockfish
    // if (game.turn() === "b" && !game.game_over()) {
    //   setTimeout(askStockfishForMove, 100);
    // }
  } else {
    if (piece && piece.color === "w") {
      highlightMoves(square);
    } else {
      $(this).addClass("error-highlight");
      setTimeout(() => {
        $(this).removeClass("error-highlight");
      }, 500);
      clearSelection();
    }
  }
}

// ------------------------
// Stockfish Integration (Bot-Only Mode)
// ------------------------
// Since you're using Vite, place stockfish.js in your public folder
// and reference it with an absolute path.
let stockfishWorker = null;
function initStockfish() {
  stockfishWorker = new Worker("/stockfish.js");
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

// function checkGameOver() {
//   if (game.game_over()) {
//     clearInterval(timerInterval);
//     endGame();
//   }
// }

// ------------------------
// Play & Restart Button Handlers
// ------------------------
$("#playBtn").click(function () {
  game.reset();
  board.position(game.fen());
  clearSelection();
  resetTimers();
  startTimer();
  $("#gameResult").text("");
});

$("#restartBtn").click(function () {
  game.reset();
  board.position(game.fen());
  clearSelection();
  resetTimers();
  startTimer();
  $("#gameResult").text("");
});
