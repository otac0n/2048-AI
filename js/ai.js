var compareScores = function(a, b) {
  if (a.win != b.win) {
    return b.win - a.win;
  } else if (a.loss != b.loss)  {
    return a.loss - b.loss;
  } else if (a.wasted != b.wasted) {
    return a.wasted - b.wasted;
  } else if (a.average != b.average) {
    return b.average - a.average;
  } else {
    return 0;
  }
}

var combineScores = function(scores, weights) {
  var s = scores.length;
  var c = { };
  var w = 0;
  for (var i = 0; i < s; i++) {
    var weight = weights[i];
    for (var p in scores[i]) {
      c[p] = (c[p] || 0) + scores[i][p] * weight;
    }
    w += weight;
  }
  for (var p in c) {
    c[p] /= w;
  }
  return c;
}

var hammingWeight = function (x) {
  var sum = 0;
  for (x = x | 0; x > 0; x = x >> 1) {
    if (x & 1) sum++;
  }
  return sum;
}

var scoreGrid = function(grid) {
  var vectors = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  var empty = 0;
  var sum = 0;
  var win = 0;
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var cell = grid.cells[x][y];
      if (cell) {
        var value = cell.value;
        sum += value;
        if (value == 2048) {
          win = 1;
        }
      } else {
        empty += 1;
      }
    }
  }

  var maxEmpty = 16 - hammingWeight(sum);
  var wasted = maxEmpty - empty;

  return { win: win, loss: 0, wasted: wasted, average: Math.log(sum / (16 - empty)) / Math.LN2 };
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  var startTime = +new Date();
  move = getMove(this.grid, 3);
  var endTime = +new Date();
  console.log([endTime - startTime, move.score.win, move.score.loss, move.score.wasted, move.score.average]);
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
      var score = scoreGrid(newGrid);
      if (score.win) {
        moves.push({ move: dir, score: score });
      } else {
        moves.push({ move: dir, score: getMove(newGrid, depth).score });
      }
    }

    if (moves.length == 0) {
      var score = scoreGrid(newGrid);
      score.loss = 1;
      return { score: score };
    }

    moves.sort(function (a, b) { return compareScores(a.score, b.score); });
    return moves[0];
  } else {
    var emptyCells = grid.availableCells();

    var pruneFours = false; /*(depth > 2 && emptyCells.length > 2);
    while (emptyCells.length > 4) {
      emptyCells.splice(Math.floor(Math.random() * emptyCells.length), 1);
    }*/

    var scores = [];
    var weights = [];
    for (var c = 0; c < emptyCells.length; c++) {
      var twoGrid = grid.clone();
      twoGrid.insertTile(new Tile(emptyCells[c], 2));
      twoGrid.playerTurn = true;
      scores.push(getMove(twoGrid, depth - 1).score);
      weights.push(9);

      if (pruneFours) {
        continue;
      }

      var fourGrid = grid.clone();
      fourGrid.insertTile(new Tile(emptyCells[c], 4));
      fourGrid.playerTurn = true;
      scores.push(getMove(fourGrid, depth - 1).score);
      weights.push(1);
    }

    return { score: combineScores(scores, weights) };
  }
}
