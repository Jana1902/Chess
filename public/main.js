(function () {
  // Use the global Chess constructor provided by the CDN
  var game = new Chess();

  // Arrays to track captured pieces
  var capturedByWhite = []; // Black pieces captured by You
  var capturedByBlack = []; // White pieces captured by Stockfish

  // Initialize the chessboard
  var board = Chessboard("myBoard", {
    position: "start",
    draggable: false, // click-to-select interface
    pieceTheme: "img/chesspieces/wikipedia/{piece}.png",
    orientation: "white",
    onSnapEnd: function () {
      board.position(game.fen());
    },
  });

  // Modal popup functions
  function showResultPopup(resultText) {
    document.getElementById("resultText").textContent = resultText;
    document.getElementById("resultModal").style.display = "block";
  }

  function hideResultPopup() {
    document.getElementById("resultModal").style.display = "none";
  }

  document.querySelector(".close").addEventListener("click", hideResultPopup);
  window.addEventListener("click", function (event) {
    if (event.target.id === "resultModal") {
      hideResultPopup();
    }
  });

  // Move selection variables
  var selectedSquare = null;
  var legalMoves = [];

  function clearSelection() {
    selectedSquare = null;
    legalMoves = [];
    $(".square-55d63").removeClass("highlight legal-move error-highlight");
  }

  function highlightMoves(square) {
    clearSelection();
    selectedSquare = square;
    $("[data-square='" + square + "']").addClass("highlight");
    legalMoves = game.moves({ square: square, verbose: true });
    legalMoves.forEach(function (move) {
      $("[data-square='" + move.to + "']").addClass("legal-move");
    });
  }

  function onSquareClick() {
    // Only allow moves for White
    if (game.turn() !== "w") return;

    var square = $(this).attr("data-square");
    console.log("Square clicked:", square);
    var piece = game.get(square);

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

    var move = legalMoves.find(function (m) {
      return m.to === square;
    });
    if (move) {
      console.log("Making move from", selectedSquare, "to", square);
      var result = game.move({
        from: selectedSquare,
        to: square,
        promotion: "q",
      });
      if (result && result.captured) {
        // White move: captured piece is Black
        var capturedImg =
          '<img src="img/chesspieces/wikipedia/b' +
          result.captured.toUpperCase() +
          '.png" alt="' +
          result.captured +
          '">';
        capturedByWhite.push(capturedImg);
        $("#capturedByWhite").html(capturedByWhite.join(""));
      }
      board.position(game.fen());
      clearSelection();
      // After your move (White), if it's Black's turn, trigger Stockfish
      if (game.turn() === "b") {
        setTimeout(askStockfishForMove, 100);
      }
      checkGameOver();
    } else {
      if (piece && piece.color === "w") {
        highlightMoves(square);
      } else {
        $(this).addClass("error-highlight");
        setTimeout(
          function () {
            $(this).removeClass("error-highlight");
          }.bind(this),
          500
        );
        clearSelection();
      }
    }
  }

  $(document).on("click", ".square-55d63", onSquareClick);

  // Stockfish Integration
  var stockfishWorker = new Worker("./stockfish.js");
  stockfishWorker.onmessage = function (event) {
    console.log("Stockfish message:", event.data);
    if (event.data.indexOf("bestmove") === 0) {
      var bestMove = event.data.split(" ")[1];
      console.log("Best move from Stockfish:", bestMove);
      makeBotMove(bestMove);
      checkGameOver();
    }
  };
  stockfishWorker.onerror = function (error) {
    console.error("Stockfish worker error:", error);
  };
  stockfishWorker.postMessage("uci");
  stockfishWorker.postMessage("isready");

  function askStockfishForMove() {
    var fen = game.fen();
    console.log("Sending FEN to Stockfish:", fen);
    stockfishWorker.postMessage("position fen " + fen);
    stockfishWorker.postMessage("go movetime 1000");
  }

  function makeBotMove(bestMove) {
    console.log("Bot move received:", bestMove);
    var moveObj = {
      from: bestMove.substring(0, 2),
      to: bestMove.substring(2, 4),
      promotion: "q",
    };
    var result = game.move(moveObj);
    if (!result) {
      console.error("Failed to apply bot move:", moveObj);
    } else {
      if (result.captured) {
        // Black move: captured piece is White
        var capturedImg =
          '<img src="img/chesspieces/wikipedia/w' +
          result.captured.toUpperCase() +
          '.png" alt="' +
          result.captured +
          '">';
        capturedByBlack.push(capturedImg);
        $("#capturedByBlack").html(capturedByBlack.join(""));
      }
      board.position(game.fen());
    }
  }

  function checkGameOver() {
    if (game.game_over()) {
      var result = "Game Over: ";
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
      showResultPopup(result);
    }
  }

  // Restart Button Handler
  document.getElementById("restartBtn").addEventListener("click", function () {
    game.reset();
    board.position(game.fen());
    clearSelection();
    capturedByWhite = [];
    capturedByBlack = [];
    $("#capturedByWhite").html("");
    $("#capturedByBlack").html("");
    $("#gameResult").text("");
  });
})();
