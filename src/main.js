import $ from "jquery";
import Chessboard from "chessboardjs";
import { Chess } from "chess.js";

// ------------------------
// Game Setup (Bot-Only Mode)
// ------------------------
const game = new Chess();

// Arrays to track captured pieces
let capturedByWhite = []; // Black pieces captured by You
let capturedByBlack = []; // White pieces captured by Stockfish

// ------------------------
// Board Setup (Click-to-Select Moves)
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
  legalMoves.forEach(move => {
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
  
  const move = legalMoves.find(m => m.to === square);
  if (move) {
    console.log("Making move from", selectedSquare, "to", square);
    const result = game.move({ from: selectedSquare, to: square, promotion: "q" });
    // If a capture occurs, update captured pieces UI
    if (result && result.captured) {
      // For a white move, captured piece is Black
      const capturedImg = `<img src="img/chesspieces/wikipedia/b${result.captured.toUpperCase()}.png" alt="${result.captured}">`;
      capturedByWhite.push(capturedImg);
      $("#capturedByWhite").html(capturedByWhite.join(""));
    }
    board.position(game.fen());
    clearSelection();
    // After your move, if it's Black's turn, trigger Stockfish
    if (game.turn() === "b") {
      setTimeout(askStockfishForMove, 100);
    }
  } else {
    if (piece && piece.color === "w") {
      highlightMoves(square);
    } else {
      $(this).addClass("error-highlight");
      setTimeout(() => { $(this).removeClass("error-highlight"); }, 500);
      clearSelection();
    }
  }
}

// ------------------------
// Stockfish Integration (Bot-Only Mode)
// ------------------------
let stockfishWorker = null;
function initStockfish() {
  // With Vite, stockfish.js is served from the public folder at the root.
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
    promotion: "q"
  };
  const result = game.move(moveObj);
  if (!result) {
    console.error("Failed to apply bot move:", moveObj);
  } else {
    // If Stockfish captures a piece, update captured pieces UI (White's piece captured)
    if (result.captured) {
      const capturedImg = `<img src="img/chesspieces/wikipedia/w${result.captured.toUpperCase()}.png" alt="${result.captured}">`;
      capturedByBlack.push(capturedImg);
      $("#capturedByBlack").html(capturedByBlack.join(""));
    }
    board.position(game.fen());
  }
}

// ------------------------
// Restart Button Handler
// ------------------------
$("#restartBtn").click(function () {
  game.reset();
  board.position(game.fen());
  clearSelection();
  capturedByWhite = [];
  capturedByBlack = [];
  $("#capturedByWhite").html("");
  $("#capturedByBlack").html("");
  $("#gameResult").text("");
});
