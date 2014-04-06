var compareScores = function(a, b) {
  if (a.loss != b.loss) {
    return a.loss - b.loss;
  }

  var ac = a.counts;
  var bc = b.counts;
  var al = ac.length;
  var bl = bc.length;
  var len = Math.max(al, bl);
  for (var i = 0; i < len; i++) {
    var av = ac[i] || 0;
    var bv = bc[i] || 0;
    if (av != bv) {
      return bv - av;
    }
  }

  return 0;
}

var combineScores = function(scores, weights) {
  var loss = 0;
  var counts = [];
  var totalWeight = 0;
  for (var i = 0; i < scores.length; i++) {
    var score = scores[i];
    var weight = weights[i];

    totalWeight += weight;

    loss += score.loss * weight;

    var c = score.counts;
    var l = c.length;
    while (counts.length < l) counts.push(0);
    for (var j = 0; j < l; j++) {
      counts[j] += c[j] * weight;
    }
  }

  for (var i = 0; i < counts.length; i++) {
    counts[i] /= totalWeight;
  }

  return { loss: loss / totalWeight, counts: counts };
}

var scoreGrid = function(grid) {
  var counts = [ 0 ];
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var cell = grid.cells[x][y];
      if (cell) {
        var exp = Math.log(cell.value) / Math.LN2;
        while (counts.length <= exp) counts.push(0);
        counts[exp] += 1;
      } else {
        counts[0] += 1;
      }
    }
  }

  return { loss: 0, counts: counts };
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  var startTime = +new Date();
  move = getMove(this.grid, 3);
  var endTime = +new Date();
  console.log([move.score.counts.map(function (x) { var y = x ? x.toFixed(2) : '    '; return y.length < 5 ? ' ' + y : y; }).join(), move.score.loss, endTime - startTime]);
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
