var pick = function(array) {
  return array[Math.floor(Math.random() * array.length)];  // Yes, this is slightly biased.  No, I don't care.
}

var score = function(grid) {
  return grid.availableCells().length / 16 - 0.5;
}

function AI(grid) {
  this.grid = grid;
}

AI.prototype.getBest = function () {
  var endTime = (+new Date()) + 500; // in milliseconds
  var counts = [0, 0, 0, 0];
  var results = [0, 0, 0, 0];
  while (endTime > +new Date()) {
    var move = this.getMove();
    counts[move.direction]++;
    results[move.direction] += move.result;
  }

  console.log(counts, results);

  var max = Math.max();
  var maxes = [];
  for (var i = 0; i < 4; i++) {
    if (!counts[i]) continue;
    if (results[i] / counts[i] > max) {
      max = results[i] / counts[i];
      maxes = [i];
    } else if (results[i] == max) {
      maxes.push(i);
    }
  }

  return { move: pick(maxes) };
}

var randomMove = function(grid) {
  var moves = [];
  var grids = [];
  for (var direction = 0; direction < 4; direction++) {
    var newGrid;
    grids[direction] = newGrid = grid.clone();
    if (newGrid.move(direction).moved) {
      moves.push(direction);
    }
  }

  if (moves.length == 0) {
    return null;
  }

  direction = pick(moves);
  return { direction: direction, grid: grids[direction] };
}

AI.prototype.getMove = function() {
  var depth = 50;

  var move = randomMove(this.grid);
  var currentGrid = move.grid;
  while (depth-- > 0) {
    if (currentGrid.isWin()) {
      return { direction: move.direction, result: 1 };
    }

    var cell = pick(currentGrid.availableCells());
    var value = Math.random() < 0.9 ? 2 : 4;
    currentGrid.insertTile(new Tile(cell, value));

    var nextMove = randomMove(currentGrid);
    if (nextMove == null) {
      return { direction: move.direction, result: -1 };
    }

    currentGrid = nextMove.grid;
  }

  return { direction: move.direction, result: score(currentGrid) };
}
