var forEachCell = function (grid, func) {
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var cell = grid.cells[x][y];
      func(cell ? cell.value : 0, x, y, cell);
    }
  }
}

var compareScores = function(a, b) {
  if (a.loss != b.loss) {
    return a.loss - b.loss;
  }

  var ac = a.counts;
  var bc = b.counts;
  var len = Math.max(ac.length, bc.length);
  for (var i = len - 1; i >= 0; i--) {
    if (i == 1) continue;
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
      b.push(Math.random() * (-1 >>> 0) >> 0);
    }
  }
}
hashes[true] = Math.random() * (-1 >>> 0) >> 0;
hashes[false] = Math.random() * (-1 >>> 0) >> 0;

var hashGrid = function(grid) {
  var hash = hashes[grid.playerTurn];
  forEachCell(grid, function (value, x, y) {
    var exp = Math.log(value || 1) / Math.LN2;
    hash = hash ^ hashes[x][y][exp];
  });
  return hash;
}

var scoreGrid = function(grid) {
  var counts = [ 0, 0 ];
  forEachCell(grid, function (value) {
    var exp = Math.log(value || 1) / Math.LN2;
    while (counts.length <= exp) counts.push(0);
    counts[exp] += 1;
  });

  return { loss: 0, counts: counts, depth: 0 };
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  var startTime = +new Date();
  this.cache = { hit: 0, miss: 0 };

  var empty = 0;
  forEachCell(this.grid, function (value) {
    empty += value ? 0 : 1;
  });

  move = this.getMove(this.grid, empty < 4 ? 4 : empty < 6 ? 3 : 2);
  var endTime = +new Date();
  console.log(move.score.loss.toFixed(1) + ', ' + move.score.depth.toFixed(1) + ', ' + (endTime - startTime)/1000 + ', ' + Math.round(100 * this.cache.hit / (this.cache.hit + this.cache.miss)) + ', ' + move.score.counts.join(', '));
  return move;
}

AI.prototype.getMove = function(grid, depth) {
  var hash = hashGrid(grid);
  var result = this.cache[hash];
  if (result && result.score.depth >= depth) {
    this.cache.hit += 1;
    return result;
  } else {
    this.cache.miss += 1;
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
        var min = moves[0];
        for (var i = 1; i < moves.length; i++) {
          var move = moves[i];
          if (compareScores(min.score, move.score) > 0) {
            min = move;
          }
        }
        result = min;
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
