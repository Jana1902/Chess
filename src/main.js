import $ from "jquery";
import Chessboard from "chessboardjs";
import { Chess } from "chess.js";

// Initialize Chess.js game logic
const game = new Chess();
let isBotThinking = false;

// Initialize Chessboard.js
const board = Chessboard("myBoard", {
  position: "start",
  draggable: true,
  dropOffBoard: "snapback",
  pieceTheme: "img/chesspieces/wikipedia/{piece}.png",
  orientation: "white",
  onDrop: onDrop,
});

$("#startBtn").on("click", board.start);

// Load Stockfish
const stockfishWorker = new Worker("stockfish.js");

// Log all messages from Stockfish
stockfishWorker.onmessage = function (event) {
  console.log("Stockfish message:", event.data);

  if (event.data.startsWith("bestmove")) {
    const bestMove = event.data.split(" ")[1];
    console.log("Best move from Stockfish:", bestMove);
    makeBotMove(bestMove);
    isBotThinking = false;
  }
};

// Initialize Stockfish
stockfishWorker.postMessage("uci");
stockfishWorker.postMessage("isready");

// Handle human move
function onDrop(source, target) {
  if (isBotThinking) return "snapback";

  const move = game.move({ from: source, to: target, promotion: "q" });
  if (!move) return "snapback";

  board.position(game.fen());

  if (game.turn() === "b") {
    isBotThinking = true;
    askStockfishForMove();
  }
}

// Ask Stockfish for a move
function askStockfishForMove() {
  const fen = game.fen();
  console.log("Sending FEN to Stockfish:", fen);
  stockfishWorker.postMessage("position fen " + fen);
  stockfishWorker.postMessage("go movetime 1000");
}

// Apply Stockfish's move
function makeBotMove(bestMove) {
  console.log("Bot move received:", bestMove);
  const moveObj = {
    from: bestMove.substring(0, 2),
    to: bestMove.substring(2, 4),
    promotion: "q",
  };

  if (!game.move(moveObj)) {
    console.error("Invalid bot move:", bestMove);
    return;
  }

  board.position(game.fen());
}
