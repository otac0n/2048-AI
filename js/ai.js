var forEachCell = function (grid, func) {
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var cell = grid.cells[x][y];
      func(cell ? cell.value : 0, x, y, cell);
    }
  }
}

var compareScores = function(a, b) {
  return b.sum - a.sum;
}

var combineScores = function(scores, weights) {
  var depth = 0;
  var sum = 0;
  var totalWeight = 0;
  for (var i = 0; i < scores.length; i++) {
    var score = scores[i];
    var weight = weights[i];

    totalWeight += weight;
    depth += score.depth;
    sum += score.sum * weight;
  }

  return { sum: sum / totalWeight, depth: (depth / scores.length) + 1 };
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
  var sums = [0, 0, 0, 0];

  forEachCell(grid, function (value, x, y) {
    if (value) {
      var adj = [
        x == 0 ? 'edge' : grid.cells[x - 1][y],
        y == 0 ? 'edge' : grid.cells[x][y - 1],
        x == 3 ? 'edge' : grid.cells[x + 1][y],
        y == 3 ? 'edge' : grid.cells[x][y + 1]
      ];

      adj = adj.map(function (i) { return i == 'edge' ? i : i ? (i.value > value ? 1 : i.value < value ? -1 : 0) : 'empty'; });

      var lr = 1
      var ud = 1;

      switch (adj[0] + ',' + adj[2])
      {
        case '-1,-1':
        case '1,1':
        case '1,edge':
        case 'edge,1':
          lr = 0.9;
      }

      switch (adj[1] + ',' + adj[3])
      {
        case '-1,-1':
        case '1,1':
        case '1,edge':
        case 'edge,1':
          ud = 0.9;
      }

      var exp = Math.pow(10, Math.log(value) / Math.LN2);
      sums[0] += ud * exp / (1 + x);
      sums[1] += lr * exp / (1 + y);
      sums[2] += ud * exp / (4 - x);
      sums[3] += lr * exp / (4 - y);
    }
  });

  return { sum: Math.max.apply(null, sums), depth: 0 };
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

  var depth = 3;
  var move;
  var endTime;
  do
  {
    move = this.getMove(this.grid, depth++);
    endTime = +new Date();
  } while ((endTime - startTime) < (move.score.sum > 0 ? 150 : 1000));

  var currentScore = scoreGrid(this.grid);
  var delta = move.score.sum - currentScore.sum;
  console.log(move.score.depth.toFixed(1) + ', ' + (endTime - startTime) + 'ms, ' + Math.round(100 * this.cache.hit / (this.cache.hit + this.cache.miss)) + '%, ' + move.score.sum + ' (' + (delta > 0 ? '+' : '') + delta.toExponential(2) + ')');
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
        score.sum = -Math.pow(10, 100);
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
