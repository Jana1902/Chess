import $ from "jquery";
import Chessboard from "chessboardjs";
import { Chess } from "chess.js";

// Initialize Chess.js game logic
const game = new Chess();

// Initialize Chessboard.js with an onDrop handler
const board = Chessboard("myBoard", {
  position: "start",
  draggable: true,
  dropOffBoard: "snapback",
  pieceTheme: "img/chesspieces/wikipedia/{piece}.png",
  orientation: "white",
  onDrop: onDrop,
});

// Disable moves when the bot is thinking
let isBotThinking = false;

$("#startBtn").on("click", board.start);

// Initialize Stockfish as a Web Worker (adjust the path as needed)
const stockfishWorker = new Worker("stockfish.js/src/stockfish-17.js");

// Handle all messages from Stockfish
stockfishWorker.onmessage = function (event) {
  console.log("Stockfish message:", event.data);

  // If we get a "readyok" message, that means Stockfish is ready for a go command.
  if (event.data === "readyok") {
    // When ready, send a command to start thinking. Here we use movetime of 1000ms.
    // You might consider using depth instead if preferred.
    stockfishWorker.postMessage("go movetime 1000");
  }

  // When Stockfish returns its best move, parse and apply it.
  if (event.data.startsWith("bestmove")) {
    const bestMove = event.data.split(" ")[1];
    console.log("Best move from Stockfish:", bestMove);
    makeBotMove(bestMove);
    isBotThinking = false; // Re-enable human moves.
  }
};

// Send initial UCI commands to Stockfish
stockfishWorker.postMessage("uci");
stockfishWorker.postMessage("isready");

// When the user drops a piece, handle the move.
function onDrop(source, target) {
  if (isBotThinking) {
    // Prevent user from moving while bot is thinking.
    return "snapback";
  }

  const move = game.move({ from: source, to: target, promotion: "q" });
  if (move === null) {
    return "snapback"; // Illegal move.
  }

  board.position(game.fen());

  // After a valid human move, check whose turn it is.
  if (game.turn() === "b") {
    // Now it's the bot's turn. Set a flag and ask Stockfish for a move.
    isBotThinking = true;
    setTimeout(askStockfishForMove, 100);
  }
}

// Ask Stockfish for its move based on the current FEN.
function askStockfishForMove() {
  const fen = game.fen();
  console.log("Sending FEN to Stockfish:", fen);
  // Update Stockfish with the current position.
  stockfishWorker.postMessage("position fen " + fen);
  // Request readiness so that the onmessage handler can then issue "go movetime 1000"
  stockfishWorker.postMessage("isready");
}

// Apply the bot's move from Stockfish.
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
}
