import '/css/app.css';
import { Capacitor } from '@capacitor/core';
import {
	DisplayObject,
	GameBase,
	Scaler,
	setDocumentHeight,
	addDragListeners,
	createNode,
	makeArray,
	formatNumber,
	limit,
	isValidKey
} from '@jamesrock/rockjs';
import { Brick } from './Brick';
import { BrickFactory } from './BrickFactory';
import { BrickMakers } from './BrickMakers';

setDocumentHeight();

const scaler = new Scaler(window.devicePixelRatio);

class BottomBarrierBrick extends Brick {
	constructor(t, x, y) {
		super(t, x, y, [
			[[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0], [7, 0, 0], [8, 0, 0], [9, 0, 0]]
		], 'red', false, true);
	};
};

class SideBarrierBrick extends Brick {
	constructor(t, x, y) {
		super(t, x, y, [
			[[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0], [0, 4, 0], [0, 5, 0], [0, 6, 0], [0, 7, 0], [0, 8, 0], [0, 9, 0], [0, 10, 0], [0, 11, 0], [0, 12, 0], [0, 13, 0], [0, 14, 0], [0, 15, 0], [0, 16, 0], [0, 17, 0], [0, 18, 0], [0, 19, 0]]
		], 'red', false, true);
	};
};

class UpNext extends DisplayObject {
	constructor(t) {

		super();

		this.t = t;

		this.node = createNode('canvas', 'upnext');
		this.ctx = this.node.getContext('2d');

		this.node.width = this.t.inflate(this.size);
		this.node.height = this.t.inflate(this.size);
		this.node.style.width = `${scaler.deflate(this.t.inflate(this.size)) * 0.5}px`;

	};
	renderBrick(brick) {

		this.node.width = this.t.inflate(this.size);
		brick.render(this.ctx);
		return this;

	};
	size = 4;
};

class HexBlox extends GameBase {
	constructor() {

		super('hexblox');

		this.scoreNode = createNode('div', 'stat');
		this.linesNode = createNode('div', 'stat');
		this.levelNode = createNode('div', 'stat');
		this.boardNode = createNode('div', 'board');
		this.statsNode = createNode('div', 'stats');
		this.statsTopNode = createNode('div', 'stats-top');
		this.upNext = new UpNext(this);
		this.factory = new BrickFactory(this);

		this.canvas.width = this.inflate(this.width);
		this.canvas.height = this.inflate(this.height);
		this.canvas.style.width = `${scaler.deflate(this.canvas.width)}px`;

		this.upNext.appendTo(this.boardNode);

		this.node.appendChild(this.boardNode);
		this.node.appendChild(this.statsNode);

		this.statsNode.appendChild(this.statsTopNode);

		this.boardNode.appendChild(this.canvas);
		this.boardNode.appendChild(this.gameOverNode);

		this.statsTopNode.appendChild(this.scoreNode);
		this.statsTopNode.appendChild(this.linesNode);
		this.statsTopNode.appendChild(this.levelNode);

		this.showGameOverScreen();
		this.reset();
		this.render();

	};
	autoMove() {

		this.autoMoveTimer = setTimeout(() => {
			if(this.mode === 'standard') {
				this.move('down');
			};
			if(!this.gameOver) {
				this.autoMove();
			};
		}, (1000 - (35 * this.level)));

		return this;

	};
	resetAutoMove() {

		clearTimeout(this.autoMoveTimer);
		this.autoMove();
		return this;

	};
	render() {

		this.canvas.width = this.inflate(this.width);

		this.bricks.forEach((brick) => {
			brick.render(this.ctx);
		});

		this.upNext.renderBrick(this.factory.getUpNext());

		this.updateStats();
		this.checkForLines();
		this.checkForFallingBrick();
		this.checkForOldBricks();

		this.animationFrame = requestAnimationFrame(() => {
			this.render();
		});

		return this;

	};
	stop() {

		cancelAnimationFrame(this.animationFrame);
		return this;

	};
	reset() {

		this.bricks = [
			new BottomBarrierBrick(this, 0, this.height),
			new SideBarrierBrick(this, -1, 0),
			new SideBarrierBrick(this, this.width, 0)
		];

		this.score = 0;
		this.lines = 0;
		this.level = 0;
		this.gameOver = false;

		this.gameOverNode.dataset.active = false;

		this.factory.reset();
		this.addBrick();

		// this.showGameOverScreen();

	};
	rotate() {

		this.bricks.forEach((brick) => {
			brick.rotate();
		});

		return this;

	};
	move(direction) {

		this.bricks.forEach((brick) => {
			brick.move(direction);
		});

		return this;

	};
	getMatrix() {

		return this.bricks.flatMap((brick) => brick.getMatrix());

	};
	getYMatrix() {

		return this.bricks.flatMap((brick) => brick.getYMatrix());

	};
	getStaticBlocks() {

		return this.bricks.flatMap((brick) => brick.getStaticBlocks());

	};
	addBrick() {

		this.bricks.push(this.factory.getFirstInQueue().center());
		this.resetAutoMove();
		this.checkForEmptyBoard();
		return this;

	};
	destroyBlocks(lines, callback) {

		lines.forEach(([y, blocks], index) => {

			let flash = true;
			const count = 6;

			makeArray(count).forEach((a, i) => {

				setTimeout(() => {

					blocks.forEach((block) => {
						block.flash = flash;
					});

					flash = !flash;

					if(i===count-1) {

						blocks.forEach((block) => {
							block.hide();
						});

						callback(y, index === lines.length-1);

					};

				}, (this.flashDuration*i));

			});

		});

		return this;

	};
	checkForLines() {

		if(this.destroying) {return this};

		const matrix = this.getYMatrix();
		const blockMatrix = this.getStaticBlocks();
		let fullLines = [];

		for(var y=0;y<this.height;y++) {
			if(matrix.filter((value) => (value===y)).length===this.width) {
				fullLines.push([y, blockMatrix.filter((block) => (block.getRelativeY()===y))]);
			};
		};

		if(!fullLines.length) {return this};

		this.destroying = fullLines.length;

		this.destroyBlocks(fullLines, (y, updateScore) => {

			blockMatrix.filter((block) => block.getRelativeY()<y).forEach((block) => {
				block.y += 1;
			});

			this.lines += 1;

			if(this.lines % 10 === 0) {
				this.level += 1;
			};

			this.destroying -= 1;

			if(updateScore) {

				this.score += (this.scores[fullLines.length] * (this.level + 1));

			};

		});

		return this;

	};
	checkForFallingBrick() {

		const falling = this.bricks.filter((brick) => {
			return brick.falling;
		});

		if(!falling.length&&!this.destroying&&!this.gameOver) {
			this.addBrick();
		};

		return this;

	};
	checkForOldBricks() {

		const empty = this.bricks.filter((brick) => {
			const blocks = brick.getBlocks();
			const emptyBlocks = blocks.filter((block) => {
				return !block.visible;
			});
			return emptyBlocks.length === blocks.length;
		});

		empty.forEach((brick) => {
			this.bricks.splice(this.bricks.indexOf(brick), 1);
		});

		return this;

	};
	checkForEmptyBoard() {

		if(this.getYMatrix().length===0) {
			this.score = (this.score * 2);
		};
		return this;

	};
	query(x, y) {
		const blocks = this.getStaticBlocks();
		return blocks.filter((block) => {return block.getRelativeX()===x && block.getRelativeY()===y})[0];
	};
	updateLines() {

		this.linesNode.innerHTML = `<h2>lines</h2><p>${this.lines}</p>`;
		return this;

	};
	updateScore() {

		this.scoreNode.innerHTML = `<h2>score</h2><p>${formatNumber(this.score)}</p>`;
		return this;

	};
	updateLevel() {

		this.levelNode.innerHTML = `<h2>level</h2><p>${this.level}</p>`;
		return this;

	};
	updateStats() {

		this.updateLines();
		this.updateScore();
		this.updateLevel();
		return this;

	};
	inflate(value) {

		return value * this.scale;

	};
	setMode(mode) {

		this.mode = mode;
		return this;

	};
	setTheme(theme) {

		this.theme = theme;
		return this;

	};
	animationFrame = null;
	width = 10;
	height = 20;
	speed = 800;
	bricks = [];
	score = 0;
	lines = 0;
	level = 0;
	best = 0;
	scale = scaler.inflate(Math.floor(limit(window.innerWidth, 500) / 12));
	// scale = scaler.inflate(30);
	gap = scaler.inflate(1.5);
	destroying = 0;
	scores = [0, 40, 100, 300, 1200];
	direction = 'right';
	mode = 'standard';
	gameOver = false;
	flashDuration = 400;
	theme = 'light';
};

const
body = document.body,
root = document.documentElement,
resetKeys = ['Space'],
rotateKeys = ['Space', 'ArrowUp'],
directionKeys = ['ArrowDown', 'ArrowLeft', 'ArrowRight'],
directionKeysMap = {
	'ArrowDown': 'down',
	'ArrowLeft': 'left',
	'ArrowRight': 'right'
},
platform = Capacitor.getPlatform(),
isApp = window.navigator.standalone || platform==='ios',
tetris = window.tetris = new HexBlox(),
// makers = new BrickMakers(),
prevent = () => keydown && tetris.bricks.length > brickCount;

let keydown = false;
let brickCount = tetris.bricks.length;

// tetris.setTheme(isDarkMode() ? 'dark' : 'light');

tetris.appendTo(body);
// makers.appendTo(body);

console.log('tetris', tetris);

root.style.setProperty('--game-top-padding', isApp ? '30px' : '0');

document.addEventListener('keyup', () => {

	brickCount = tetris.bricks.length;
	keydown = false;

});

document.addEventListener('keydown', (e) => {

	if(prevent()) {
		return;
	};

	keydown = true;

	if(isValidKey(e.code, directionKeys)) {
		tetris.move(directionKeysMap[e.code]);
	};

	if(isValidKey(e.code, rotateKeys)) {
		tetris.rotate();
	};

	if(tetris.gameOver && isValidKey(e.code, resetKeys)) {
		tetris.reset();
	};

});

document.addEventListener('click', () => {

	if(tetris.gameOver) {
		tetris.reset();
	}
	else {
		tetris.rotate();
	};

});

addDragListeners(document, 40);

document.addEventListener('touchstart', (e) => {

	brickCount = tetris.bricks.length;
	keydown = true;

	e.preventDefault();

});

document.addEventListener('touchend', () => {

	keydown = false;

});

document.addEventListener('drag-down', () => {

  if(prevent()) {
		return;
	};

	tetris.move('down');

});

document.addEventListener('drag-right', () => {

  if(prevent()) {
		return;
	};

	tetris.move('right');

});

document.addEventListener('drag-left', () => {

  if(prevent()) {
		return;
	};

	tetris.move('left');

});

document.addEventListener('visibilitychange', () => {

	if(document.hidden) {
		tetris.stop();
	}
	else {
		tetris.render();
	};

});
