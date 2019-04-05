// state
const opt = {
  'board': document.getElementById('board'),
  'boardSize': 100,
  'bombPosition': new Set(),
  'bombs': [],
  'emojiBomb': '💣',
  'emojiFlag': '🏴',
  'emojiLoss': ['💣', '😱'],
  'emojiWin': ['😊', '👻'],
  'flags': new Set(),
  'numBombs': 3,
  'visited': new Set()
};
opt.rowSize = Math.sqrt(opt.boardSize);

//
// util functions
//

// functional sum
const sum = (total, current) => total + current;
// random integer in range
const randomInt = (max) => Math.floor(Math.random() * max);
// set equality
const setEquals = (left, right) => {
  if (left.size !== right.size) {
    return false;
  }
  for (let l of left) {
    if (!right.has(l)) {
      return false;
    }
  }
  return true;
}

// manipulate html elements
const create = {
  // create block and attach click listener
  'block': (id) => {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'block';
    div.addEventListener('click', click, false);
    return div;
  },
  // create label to be displayed on block
  'label': (l) => {
    const span = document.createElement('span');
    const className = l === parseInt(l) ? 'label-num' : 'label-str';
    span.classList.add(className);
    span.textContent = l.toString();
    return span;
  }
};

const remove = {
  'flag': (block) => {
    const id = parseInt(block.id);
    if (opt.flags.has(id)) {
      opt.flags.delete(id);
    }
    if (block.classList.contains('flag')) {
      block.classList.remove('flag');
      block.removeChild(block.firstChild);
    }
    return block;
  },
  'children': (element) => {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    return element;
  },
  'classes': (element, newClass) => {
    element.className = 'block';
    element.classList.add(newClass);
    return element;
  }
}

const add = {
  'flag': (block) => {
    const id = parseInt(block.id);
    opt.flags.add(id);
    const flag = create.label(opt.emojiFlag);
    flag.classList.add('flag');
    block.classList.add('flag');
    block.append(flag);
    return block;
  },
  'num': (block) => {
    remove.children(block);
    const id = parseInt(block.id);
    const nearbyBombs = neighbor.valueSum(id);
    block.append(create.label(nearbyBombs));
    block.classList.add('empty');
    return block;
  }
}

// find edges
const edge = {
  'after': (id) => id + opt.rowSize,
  'previous': (id) => id - opt.rowSize,
  'endsWith': (value) => {
    return (num) => {
      const s = num.toString();
      const last = parseInt(s[s.length - 1]);
      return last === value;
    }
  }
}
edge.endsWithZero = edge.endsWith(0);
edge.endsWithNine = edge.endsWith(9);
edge.start = (id) => {
  return edge.endsWithZero(id) ? id : id - 1;
};
edge.end = (id) => {
  return edge.endsWithNine(id) ? id : id + 1;
};
edge.endInclusive = (id) => edge.end(id) + 1;

// moving around the board
const neighbor = {
  'parse': (blockId) => {
    const id = parseInt(blockId);
    return {
      'after': edge.after(id),
      'current': id,
      'previous': edge.previous(id)
    };
  }
};
neighbor.index = (blockId) => {
  const result = new Set();
  const id = neighbor.parse(blockId);
  // current row without current cell
  result.add(edge.start(id.current));
  result.add(edge.end(id.current));
  // previous row
  if (id.previous >= 0) {
    result.add(edge.start(id.previous));
    result.add(id.previous);
    result.add(edge.end(id.previous));
  }
  // after row
  if (id.after < opt.boardSize) {
    result.add(edge.start(id.after));
    result.add(id.after);
    result.add(edge.end(id.after));
  }
  return Array.from(result);
}
neighbor.value = (blockId) => {
  const id = neighbor.parse(blockId);
  const first = id.previous < 0 ? [] : opt.bombs.slice(edge.start(id.previous), edge.endInclusive(id.previous));
  const second = opt.bombs.slice(edge.start(id.current), edge.endInclusive(id.current));
  const third = id.after > opt.boardSize - 1 ? [] : opt.bombs.slice(edge.start(id.after), edge.endInclusive(id.after));
  return first.concat(second).concat(third);
};
neighbor.valueSum = (id) => neighbor.value(id).reduce(sum);

// search until bombs are found
const search = (block) => {
  const id = parseInt(block.id);
  const nearbyBombs = neighbor.valueSum(id);
  const notVisited = neighbor.index(id).filter(n => !opt.visited.has(n));
  if (nearbyBombs > 0) {
    opt.visited.add(id);
    return add.num(block);
  } else {
    block.classList.add('empty');
    opt.visited.add(id);
    // continue search
    return notVisited.map((index) => search(document.getElementById(index)));
  }
}


//
// The game!
//

// user interactions
const click = (event) => {
  const block = event.target;
  // don't add data twice in case of double click
  if (block.childElementCount === 0 && block.className === 'block') {
    add.flag(block);
  } else if (block.classList.contains('flag')) {
    const parentBlock = block.classList.contains('block') ? block : block.parentElement;
    // remove flag if it exists
    remove.flag(parentBlock);
    // loss if block is a bomb
    const id = parseInt(parentBlock.id)
    const isBomb = opt.bombs[id] === 1;
    if (isBomb) {
      parentBlock.classList.add('bomb');
      parentBlock.append(create.label(opt.emojiBomb));
      return end('loss', opt.emojiLoss);
    } else {
      const searched = search(parentBlock);
    }
  }
  if (isWin(opt)) {
    // increase difficulty on win
    opt.numBombs += 3;
    return end('win', opt.emojiWin);
  }
  return true;
};

// gameplay
const isWin = (state) => {
  return setEquals(state.bombPosition, state.flags) && state.visited.size + state.bombPosition.size === state.boardSize
}
const clear = (state) => {
  remove.children(state.board);
  state.bombPosition = new Set();
  state.bombs = [];
  state.flags = new Set(),
    state.visited = new Set()
};
const init = (state) => {
  for (let i = 0; i < state.boardSize; i++) {
    state.board.append(create.block(i));
    state.bombs.push(0);
  }
  for (let i = 0; i < state.numBombs; i++) {
    const index = randomInt(state.boardSize);
    state.bombs[index] = 1;
    state.bombPosition.add(index);
  }
};
const report = (state, outcome, label) => {
  for (let i = 0; i < state.boardSize; i++) {
    const block = document.getElementById(i);
    remove.children(block);
    remove.classes(block, outcome);
    block.append(create.label(label))
  }
};
const end = (outcome, emoji) => {
  setTimeout(function () { report(opt, outcome, emoji[0]); }, 250);
  setTimeout(function () { report(opt, outcome, emoji[1]); }, 1000);
  setTimeout(function () { start(opt); }, 2000);
}
const start = (state) => {
  clear(state);
  init(state);
};
start(opt);