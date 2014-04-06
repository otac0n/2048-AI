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
  var depth = 0;
  var counts = [];
  var totalWeight = 0;
  for (var i = 0; i < scores.length; i++) {
    var score = scores[i];
    var weight = weights[i];

    totalWeight += weight;

    loss += score.loss * weight;
    depth += score.depth;

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

  return { loss: loss / totalWeight, counts: counts, depth: (depth / scores.length) + 1 };
}

var hashes = [];
for (var x = 0; x < 4; x++) {
  var a = [];
  hashes.push(a);
  for (var y = 0; y < 4; y++) {
    var b = [];
    a.push(b);
    for (var i = 0; i < 17; i++) {
      b.push(Math.random() * (-1 >>> 0) >>> 0);
    }
  }
}
hashes[true] = Math.random() * (-1 >>> 0) >>> 0;
hashes[false] = Math.random() * (-1 >>> 0) >>> 0;

var hashGrid = function(grid) {
  var hash = hashes[grid.playerTurn];
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var cell = grid.cells[x][y];
      var exp = cell ? Math.log(cell.value) / Math.LN2 : 0;
      hash = hash ^ hashes[x][y][exp];
    }
  }
  return hash;
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

  return { loss: 0, counts: counts, depth: 0 };
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  var startTime = +new Date();
  this.cache = {};
  move = this.getMove(this.grid, 4);
  var endTime = +new Date();
  console.log([move.score.counts.map(function (x) { var y = x ? x.toFixed(2) : '    '; return y.length < 5 ? ' ' + y : y; }).join(), move.score.loss, move.score.depth.toFixed(1), endTime - startTime]);
  return move;
}

AI.prototype.getMove = function(grid, depth) {
  var hash = hashGrid(grid);
  var result = this.cache[hash];
  if (result && result.score.depth >= depth) {
    return result;
  }

  if (grid.playerTurn) {
    if (depth == 0) {
      result = { score: scoreGrid(grid) };
    } else {
      var moves = [];
      for (var dir = 0; dir < 4; dir++) {
        var newGrid = grid.clone();
        if (!newGrid.move(dir).moved) continue;
        moves.push({ move: dir, score: this.getMove(newGrid, depth).score });
      }

      if (moves.length == 0) {
        var score = scoreGrid(newGrid);
        score.loss = 1;
        result = { score: score };
      } else {
        moves.sort(function (a, b) { return compareScores(a.score, b.score); });
        result = moves[0];
      }
    }
  } else {
    var emptyCells = grid.availableCells();

    var scores = [];
    var weights = [];
    for (var c = 0; c < emptyCells.length; c++) {
      var fourGrid = grid.clone();
      fourGrid.insertTile(new Tile(emptyCells[c], 4));
      fourGrid.playerTurn = true;
      scores.push(this.getMove(fourGrid, depth - 1).score);
      weights.push(1);

      var twoGrid = grid.clone();
      twoGrid.insertTile(new Tile(emptyCells[c], 2));
      twoGrid.playerTurn = true;
      scores.push(this.getMove(twoGrid, depth - 1).score);
      weights.push(9);
    }

    result = { score: combineScores(scores, weights) };
  }

  return this.cache[hash] = result;
}
