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

var findBestScore = function(moves) {
  var min, move;
  var minDepth = Math.min();
  var avgDepth = 0;
  var isFinal = true;
  var count = 0;

  for (var m in moves) {
    count++;
    var score = moves[m].score;
    minDepth = Math.min(minDepth, score.minDepth);
    avgDepth += score.avgDepth;
    isFinal = isFinal && score.isFinal;
    if (!min || compareScores(min, score) > 0) {
      move = m;
      min = score;
    }
  }

  return { move: move, loss: min.loss, isFinal: isFinal, counts: min.counts, minDepth: minDepth + 1, avgDepth: avgDepth / count + 1 };
}

var combineScores = function(moves, weights) {
  var loss = 0;
  var minDepth = Math.min();
  var avgDepth = 0;
  var isFinal = true;
  var count = 0;
  var counts = [];
  var totalWeight = 0;
  for (var i in moves) {
    count++;
    var score = moves[i].score;
    var weight = weights[i];

    totalWeight += weight;

    minDepth = Math.min(minDepth, score.minDepth);
    avgDepth += score.avgDepth;
    isFinal = isFinal && score.isFinal;
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

  return { move: '*', loss: loss / totalWeight, isFinal: isFinal, counts: counts, minDepth: minDepth + 1, avgDepth: avgDepth / count + 1 };
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

  return { loss: 0, isFinal: false, counts: counts, minDepth: 0, avgDepth: 0 };
}

function AI(grid) {
  this.grid = grid;
  this.table = { moves: 0 };
}

AI.prototype.getBest = function () {
  var startTime = +new Date();
  this.cache = { hit: 0, miss: 0 };

  var empty = 0;
  forEachCell(this.grid, function (value) {
    empty += value ? 0 : 1;
  });

  var node = Node.getOrAdd(this.table, this.grid, /* clone: */ true);

  if (++this.table.moves > 5) {
    // console.log('GC');
    this.table = { moves: 0 };
    node.addTo(this.table);
  }

  score = node.deepen(this.table, (empty < 4 ? 4 : empty < 6 ? 3 : 2) * 2);
  var endTime = +new Date();
  console.log(score.loss.toFixed(1) + ', ' + (score.avgDepth / 2).toFixed(1) + ', ' + (endTime - startTime)/1000 + ', ' + score.counts.join(', '));
  return score;
}

function Node(grid, hash) {
  this.grid = grid;
  this.hash = hash || hashGrid(grid);
  this.score = undefined;
  this.moves = undefined;
}

Node.getOrAdd = function (table, grid, clone) {
  table = table || {};
  var hash = hashGrid(grid);
  return table[hash] || (table[hash] = new Node(clone ? grid.clone() : grid, hash));
}

Node.prototype.addTo = function (table) {
  if (!table[this.hash]) {
    table[this.hash] = this;
    if (this.moves) {
      for (var i in this.moves) {
        this.moves[i].addTo(table);
      }
    }
  }
}

Node.prototype.deepen = function (table, depth) {
  if (this.score && (this.score.isFinal || this.score.minDepth >= depth)) {
    return this.score;
  }

  if (this.grid.playerTurn) {
    if (depth <= 0) {
      this.score = scoreGrid(this.grid);
    } else {
      if (!this.moves) {
        this.moves = {};
        var any = false;
        for (var dir = 0; dir < 4; dir++) {
          var newGrid = this.grid.clone();
          if (!newGrid.move(dir).moved) continue;
          any = true;
          this.moves[dir] = Node.getOrAdd(table, newGrid, /* clone: */ false);
        }

        if (!any) {
          if (!this.score) {
            this.score = scoreGrid(this.grid);
          }

          this.score.loss = 1;
          this.score.isFinal = true;
          this.moves = undefined;
          this.grid = undefined;
          return this.score;
        }
      }

      for (var i in this.moves) {
        this.moves[i].deepen(table, depth - 1);
      }

      this.score = findBestScore(this.moves);
    }
  } else {
    if (!this.moves) {
      var emptyCells = this.grid.availableCells();

      this.moves = {};
      this.weights = {};
      for (var c = 0; c < emptyCells.length; c++) {
        var fourGrid = this.grid.clone();
        fourGrid.insertTile(new Tile(emptyCells[c], 4));
        fourGrid.playerTurn = true;
        this.moves[c + '-4'] = Node.getOrAdd(table, fourGrid, /* clone: */ false);
        this.weights[c + '-4'] = 1;

        var twoGrid = this.grid.clone();
        twoGrid.insertTile(new Tile(emptyCells[c], 2));
        twoGrid.playerTurn = true;
        this.moves[c + '-2'] = Node.getOrAdd(table, twoGrid, /* clone: */ false);
        this.weights[c + '-2'] = 9;
      }
    }

    for (var i in this.moves) {
      this.moves[i].deepen(table, depth - 1);
    }

    this.score = combineScores(this.moves, this.weights);
  }

  return this.score;
}
