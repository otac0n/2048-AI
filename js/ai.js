var pick = function(array) {
  return array[Math.floor(Math.random() * array.length)];  // Yes, this is slightly biased.  No, I don't care.
}

var scoreGrid = function(grid) {
  return grid.availableCells().length / 16;
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  move = getMove(this.grid, 4);
  console.log(move);
  return move;
}

function getMove(grid, depth) {
  if (grid.playerTurn && depth == 0) {
    return { score: scoreGrid(grid) };
  } else if (grid.playerTurn) {
    var moves = [];
    for (var dir = 0; dir < 4; dir++) {
      var newGrid = grid.clone();
      if (!newGrid.move(dir).moved) continue;
      if (newGrid.isWin()) {
        moves.push({ move: dir, score: 1000 });
      } else {
        moves.push({ move: dir, score: getMove(newGrid, depth).score });
      }
    }

    if (moves.length == 0) {
      return { score: 0 };
    }

    moves.sort(function (a, b) { return b.score - a.score; });
    return moves[0];
  } else {
    var score = 0;
    var emptyCells = grid.availableCells();

    while (emptyCells.length > 4) {
      emptyCells.splice(Math.floor(Math.random() * emptyCells.length), 1);
    }

    for (var c = 0; c < emptyCells.length; c++) {

      var twoGrid = grid.clone();
      twoGrid.insertTile(new Tile(emptyCells[c], 2));
      twoGrid.playerTurn = true;
      var two = getMove(twoGrid, depth - 1).score;

      if (emptyCells.length > 2) {
        score += two;
        continue;
      }

      var fourGrid = grid.clone();
      fourGrid.insertTile(new Tile(emptyCells[c], 4));
      fourGrid.playerTurn = true;
      var four = getMove(fourGrid, depth - 1).score;

      score += two * 0.9 + four * 0.1;
    }

    return { score: score / emptyCells.length };
  }
}
