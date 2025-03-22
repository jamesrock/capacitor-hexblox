import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { testBricks } from './testBricks2.js';
import { Rounder } from './Rounder.js';
import { Scaler } from './Scaler.js';
import { Storage } from './Storage.js';

(function() {

	const createElement = (type, classNames) => {
		
		const node = document.createElement(type);
		classNames && classNames.split(' ').forEach((className) => {
			node.classList.add(className);
		});
		return node;

	};

	const scaler = new Scaler(window.devicePixelRatio);

	class Block {
		constructor(brick, x, y, color) {

			this.brick = brick;
			this.x = x;
			this.y = y;
			this.color = color[2];
			this.value = color[1];

		};
		render(ctx) {
			if(!this.visible) {return}; // omit from render if hidden
			ctx.fillStyle = this.flash ? 'transparent' : this.brick.t.colors[this.color][0];
			ctx.fillRect(
				(this.brick.t.inflate(this.brick.x + this.x) + this.brick.t.gap), 
				(this.brick.t.inflate(this.brick.y + this.y) + this.brick.t.gap), 
				(this.brick.t.inflate(1) - (this.brick.t.gap * 2)), 
				(this.brick.t.inflate(1) - (this.brick.t.gap * 2))
			);
			ctx.fillStyle = this.flash ? 'transparent' : '#FFF';
			ctx.font = `900 ${this.brick.t.inflate(this.value > 9 ? 0.7 : 0.8)}px Poppins`;
			ctx.textAlign = 'center';
  		ctx.fillText(
				this.value, 
				(this.brick.t.inflate(this.brick.x + this.x) + this.brick.t.gap + this.brick.t.inflate(0.45)), 
				(this.brick.t.inflate(this.brick.y + this.y) + this.brick.t.gap + this.brick.t.inflate(this.value > 9 ? 0.7 : 0.74))
			);
			return this;
		};
		getMatrix() {
			if(!this.visible) {return null}; // omit from matrix if hidden
			return `x${this.brick.x + this.x}y${this.brick.y + this.y}`;
		};
		getMovedMatrix(direction = 'down') {
			if(!this.visible) {return null}; // omit from matrix if hidden
			switch(direction) {
				case 'down':
					return `x${this.brick.x + this.x}y${this.brick.y + (this.y + 1)}`;
				case 'left':
					return `x${this.brick.x + (this.x - 1)}y${this.brick.y + this.y}`;
				case 'right':
					return `x${this.brick.x + (this.x + 1)}y${this.brick.y + this.y}`;
				case 'up':
					return `x${this.brick.x + this.x}y${this.brick.y + (this.y - 1)}`;
			};
		};
		move() {
			this.y += 1;
			this.moved = true;
		};
		getRelativeY() {
			return (this.brick.y + this.y);
		};
		getRelativeX() {
			return (this.brick.x + this.x);
		};
		isHidden() {
			return !this.visible;
		};
		hide() {
			this.visible = false;
			return this;
		};
		moved = false;
		visible = true;
		flash = false;
	};

	class Brick {
		constructor(t, x, y) {
			
			this.t = t;
			this.x = x;
			this.y = y;

		};
		init() {

			const blockColors = [
				this.t.getRandomColor(),
				this.t.getRandomColor(),
				this.t.getRandomColor(),
				this.t.getRandomColor()
			];

			this.blocks = this.blocks.map((state) => {
				return state.map((block) => {
					return new Block(this, block[0], block[1], blockColors[block[2]]);
				});
			});

			this.state = this.getRandomState();

			log && console.log('init', this);

			return this;

		};
		render(ctx) {

			log && console.log(this, 'render');

			this.getBlocks().forEach((block) => {
				block.render(ctx);
			});

			return this;

		};
		rotate() {

			log && console.log(this, 'rotate');

			if(!this.falling) {
				return this;
			};

			if(this.canRotate()) {
				this.state = this.getNextState();
			};

			return this;

		};
		move(direction) {
			
			if(this.isBarrier || !this.falling) {
				return;
			};

			log && console.log('move();', this, `${this.x} ${this.y}`);

			if(this.canMove(direction)) {

				switch(direction) {
					case 'down':
						this.y += 1;
					break;
					case 'left':
						this.x -= 1;
					break;
					case 'right':
						this.x += 1;
					break;
				};

			}
			else if(direction==='down') {

				this.falling = false;
				
				if(this.y===0) {
					this.t.showGameOverScreen();
				};

			};

			return this;

		};
		getMatrix() {
			
			if(this.falling) {return []}; // return empty matrix if falling
			
			return this.getBlocks().map((block) => {
				return block.getMatrix();
			}).filter((item) => {
				return item;
			});

		};
		getMovedMatrix(direction) {
			
			return this.getBlocks().map((block) => {
				return block.getMovedMatrix(direction);
			}).filter((item) => {
				return item;
			});

		};
		getRotatedMatrix() {

			return this.getBlocks(this.getNextState()).map((block) => {
				return block.getMatrix();
			}).filter((item) => {
				return item;
			});

		};
		getYMatrix() {

			if(this.falling || this.isBarrier) {return []}; // return empty matrix where brick is falling or is barrier
			
			return this.getBlocks().map((block) => {
				if(!block.visible) {return null}; // omit from matrix if hidden
				return block.getRelativeY();
			}).filter((item) => {
				return item;
			});

		};
		canMove(direction) {
			
			const matrix = this.t.getMatrix();
			const movedMatrix = this.getMovedMatrix(direction);
			let matches = 0;
			movedMatrix.forEach((coord) => {
				if(matrix.includes(coord)) {
					matches += 1;
				};
			});
			log && console.log('canMove()', this, matrix, movedMatrix, matches);
			return matches===0;

		};
		canRotate() {
			
			const matrix = this.t.getMatrix();
			const rotatedMatrix = this.getRotatedMatrix();
			let matches = 0;
			rotatedMatrix.forEach((coord) => {
				if(matrix.includes(coord)) {
					matches += 1;
				};
			});
			log && console.log('canRotate()', this, matrix, rotatedMatrix, matches);
			return matches===0;

		};
		getRandomState() {
			return Math.floor(Math.random() * (this.blocks.length));
		};
		getBlocks(override) {
			const state = override >= 0 ? override : this.state;
			return this.blocks[state];
		};
		getStaticBlocks() {
			
			if(this.falling || this.isBarrier) {return []}; // return empty matrix where brick is falling or is barrier
			
			return this.getBlocks().map((block) => {
				return block;
			}).filter((block) => {
				return block.visible;
			});

		};
		getNextState() {

			let out = 0;
			
			if(this.state===(this.blocks.length-1)) {
				out = 0;
			}
			else {
				out = (this.state + 1);
			};

			return out;

		};
		center() {
			this.x = 3;
			return this;
		};
		x = 0;
		y = 0;
		state = 0;
		blocks = [];
		falling = true;
		isBarrier = false;
	};

	class YellowBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[1, 1, 0], [2, 1, 1], [1, 2, 2], [2, 2, 3]],
			[[1, 1, 2], [2, 1, 0], [1, 2, 3], [2, 2, 1]],
			[[1, 1, 3], [2, 1, 2], [1, 2, 1], [2, 2, 0]],
			[[1, 1, 1], [2, 1, 3], [1, 2, 0], [2, 2, 2]],
		];
	};

	class RedBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[1, 0, 0], [1, 1, 1], [0, 1, 2], [0, 2, 3]],
			[[0, 0, 3], [1, 0, 2], [1, 1, 1], [2, 1, 0]],
			[[2, 0, 3], [2, 1, 2], [1, 1, 1], [1, 2, 0]],
			[[0, 1, 0], [1, 1, 1], [1, 2, 2], [2, 2, 3]],
		];
	};

	class GreenBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[0, 0, 0], [0, 1, 1], [1, 1, 2], [1, 2, 3]],
			[[0, 1, 3], [1, 1, 2], [1, 0, 1], [2, 0, 0]],
			[[1, 0, 3], [1, 1, 2], [2, 1, 1], [2, 2, 0]],
			[[0, 2, 0], [1, 2, 1], [1, 1, 2], [2, 1, 3]],
		];
	};

	class PurpleBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[1, 0, 0], [1, 1, 1], [1, 2, 2], [2, 1, 3]],
			[[0, 1, 2], [1, 1, 1], [2, 1, 0], [1, 2, 3]],
			[[1, 0, 2], [1, 1, 1], [1, 2, 0], [0, 1, 3]],
			[[1, 0, 3], [0, 1, 0], [1, 1, 1], [2, 1, 2]]
		];
	};

	class BlueBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[0, 2, 3], [1, 0, 0], [1, 1, 1], [1, 2, 2]],
			[[0, 0, 3], [0, 1, 2], [1, 1, 1], [2, 1, 0]],
			[[1, 0, 2], [1, 1, 1], [1, 2, 0], [2, 0, 3]],
			[[0, 1, 0], [1, 1, 1], [2, 1, 2], [2, 2, 3]]
		];
	};

	class OrangeBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[2, 0, 0], [0, 1, 1], [1, 1, 2], [2, 1, 3]],
			[[1, 0, 1], [1, 1, 2], [1, 2, 3], [2, 2, 0]],
			[[0, 1, 3], [1, 1, 2], [2, 1, 1], [0, 2, 0]],
			[[0, 0, 0], [1, 0, 3], [1, 1, 2], [1, 2, 1]]
		];
	};

	class CyanBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[0, 1, 0], [1, 1, 1], [2, 1, 2], [3, 1, 3]],
			[[2, 0, 0], [2, 1, 1], [2, 2, 2], [2, 3, 3]],
			[[0, 1, 3], [1, 1, 2], [2, 1, 1], [3, 1, 0]],
			[[2, 0, 3], [2, 1, 2], [2, 2, 1], [2, 3, 0]],
		];
	};

	class BottomBarrierBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0], [7, 0, 0], [8, 0, 0], [9, 0, 0]]
		];
		falling = false;
		isBarrier = true;
	};

	class SideBarrierBrick extends Brick {
		constructor(t, x, y) {
			super(t, x, y);
		};
		blocks = [
			[[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0], [0, 4, 0], [0, 5, 0], [0, 6, 0], [0, 7, 0], [0, 8, 0], [0, 9, 0], [0, 10, 0], [0, 11, 0], [0, 12, 0], [0, 13, 0], [0, 14, 0], [0, 15, 0], [0, 16, 0], [0, 17, 0], [0, 18, 0], [0, 19, 0]]
		];
		falling = false;
		isBarrier = true;
	};

	class BrickFactory {
		constructor(t) {

			log && console.log('BrickFactory', this);
			this.t = t;

		};
		addToQueue(override) {

			const type = override ? override : (this.test ? this.getTestBrick() : this.getRandomBrick());
			const brick = this.makers[type](this.t);
			this.queue.push(brick);
			return brick;

		};
		getRandomBrick() {
			return this.bricks[Math.floor(Math.random() * (this.bricks.length))];
		};
		getFirstInQueue() {
			return this.queue.shift(0);
		};
		getUpNext() {
			return this.queue[0];
		};
		getTestBrick() {
			
			const brick = testBricks[this.testBrickIndex];
			
			if(this.testBrickIndex===(testBricks.length - 1)) {
				this.testBrickIndex = 0;
			}
			else {
				this.testBrickIndex ++;
			};
			
			return brick;

		};
		bricks = [
			'Y', 
			'R', 
			'O', 
			'G', 
			'P', 
			'B', 
			'C'
		];
		makers = {
			Y: (t) => (new YellowBrick(t, 0, 0).init()),
			R: (t) => (new RedBrick(t, 0, 0).init()), 
			O: (t) => (new OrangeBrick(t, 0, 0).init()), 
			G: (t) => (new GreenBrick(t, 0, 0).init()), 
			P: (t) => (new PurpleBrick(t, 0, 0).init()), 
			B: (t) => (new BlueBrick(t, 0, 0).init()), 
			C: (t) => (new CyanBrick(t, 0, 0).init())
		};
		queue = [];
		test = false;
		testBrickIndex = 0;
	};

	class DisplayObject {
		appendTo(to) {

			to.appendChild(this.node);
			return this;

		};
		addEventListener(event, handler, passive = true) {
			
			this[this.eventTarget].addEventListener(event, handler, {passive});
			return this;
			
		};
		dispatchEvent(event) {
			
			this[this.eventTarget].dispatchEvent(new Event(event));
			return this;

		};
	};

	class UpNext extends DisplayObject {
		constructor(t) {

			super();

			this.t = t;
			
			this.node = createElement('canvas', 'upnext');
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

	class Toggle extends DisplayObject {
		constructor(id, variant, label, checked = false) {
			
			super();

			this.id = id;
			this.label = label;;
			this.variant = variant;
			this.node = createElement('div', 'toggle');
			this.inputNode = createElement('input');
			this.labelNode = createElement('label');

			this.labelNode.innerHTML = this.label;
			
			this.inputNode.setAttribute('type', 'checkbox');
			this.inputNode.setAttribute('data-variant', this.variant);
			this.inputNode.id = `toggle-${this.id}`;
			this.inputNode.checked = checked;
			
			this.labelNode.setAttribute('for', this.inputNode.id);

			this.node.appendChild(this.labelNode);
			this.node.appendChild(this.inputNode);

		};
		eventTarget = 'inputNode';
	};

	class Tetris extends DisplayObject {
		constructor() {

			super();

			const windowWidth = window.innerWidth > 500 ? 500 : window.innerWidth;
			
			this.gap = scaler.inflate(2);
			this.scale = scaler.inflate(Math.floor((windowWidth - (2 * 2)) / 10));

			this.node = createElement('div', 'tetris');
			this.canvas = createElement('canvas', 'game-canvas');
			this.ctx = this.canvas.getContext('2d');
			this.scoreNode = createElement('div', 'stat');
			this.linesNode = createElement('div', 'stat');
			this.levelNode = createElement('div', 'stat');
			this.bestNode = createElement('div', 'stat');
			this.gameOverNode = createElement('div', 'game-over');
			this.gameNode = createElement('div', 'game');
			this.controlsNode = createElement('div', 'controls');
			this.controlsTopNode = createElement('div', 'controls-top');
			this.controlsBottomNode = createElement('div', 'controls-bottom');
			this.upNext = new UpNext(this);
			this.factory = new BrickFactory(this);
			this.themeToggle = new Toggle('theme', 'b', 'L/D');
			this.storage = new Storage('me.jameserock.hexblox');

			this.canvas.width = this.inflate(this.width);
			this.canvas.height = this.inflate(this.height);
			this.canvas.style.width = `${scaler.deflate(this.inflate(this.width))}px`;

			this.upNext.appendTo(this.node);

			this.node.appendChild(this.gameNode);
			this.node.appendChild(this.controlsNode);

			this.controlsNode.appendChild(this.controlsTopNode);
			this.controlsNode.appendChild(this.controlsBottomNode);

			this.gameNode.appendChild(this.canvas);
			this.gameNode.appendChild(this.gameOverNode);
			
			this.controlsTopNode.appendChild(this.scoreNode);
			this.controlsTopNode.appendChild(this.linesNode);
			this.controlsTopNode.appendChild(this.levelNode);
			// this.controlsTopNode.appendChild(this.bestNode);

			this.themeToggle.appendTo(this.controlsBottomNode);

			const tetris = this;

			this.themeToggle.addEventListener('change', function() {
				tetris.setTheme(this.checked ? 'dark' : 'light');
			}).dispatchEvent('change');

			this.reset();
			this.checkForBest();
			this.autoMove();

		};
		autoMove() {
			
			this.autoMoveTimer = setTimeout(() => {
				if(this.mode === 'standard') {
					this.moveAll('down');
				};
				this.autoMove();
			}, ((1000 + 25) - (25 * this.level)));
			
			return this;

		};
		restartAutoMove() {
			
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
			this.checkForMerges();
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

			this.gameOverNode.setAttribute('data-active', false);

			this.bricks = [
				new BottomBarrierBrick(this, 0, this.height).init(),
				new SideBarrierBrick(this, -1, 0).init(),
				new SideBarrierBrick(this, this.width, 0).init()
			];

			this.score = 0;
			this.lines = 0;
			this.level = 1;
			this.gameOver = false;

			this.factory.addToQueue();
			this.addBrick();

		};
		rotateAll() {
			
			this.bricks.forEach((brick) => {
				brick.rotate();
			});

			return this;

		};
		moveAll(direction) {
			
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
			this.factory.addToQueue();
			this.checkForEmptyBoard();
			return this;

		};
		destroyBlocks(lines, callback) {

			log && console.log('destroyBlocks', lines);

			lines.forEach(([y, blocks]) => {

				let score = 0;

				blocks.forEach((block) => {
					score += block.value;
				});

				let flash = true;
				const flashHandler = () => {
					
					blocks.forEach((block) => {
						block.flash = flash;
					});

					flash = !flash;

				};

				flashHandler();

				const flashInterval = setInterval(flashHandler, this.flashDuration);

				setTimeout(() => {
					
					blocks.forEach((block) => {
						block.hide();
					});

					clearInterval(flashInterval);
					callback(y, score);

				}, (this.flashDuration*3));

				log && console.log('blocks', blocks);

			});

			log && console.log(`Tetris.destroyBlocks(${y})`, this, lines);

			return this;

		};
		checkForLines() {

			if(this.destroying) {return this};

			const matrix = this.getYMatrix();
			const blockMatrix = this.getStaticBlocks();
			let fullLines = [];

			for(var y=0;y<this.height;y++) {
				if(matrix.filter((value) => (value===y)).length===10) {
					fullLines.push([y, blockMatrix.filter((block) => (block.getRelativeY()===y))]);
				};
			};

			if(!fullLines.length) {return this};

			this.destroying = fullLines.length;

			this.destroyBlocks(fullLines, (y, score) => {

				log && console.log('MOVE', score);
				blockMatrix.filter((block) => block.getRelativeY()<y).forEach((block) => {
					block.y += 1;
				});

				this.lines += 1;

				if(this.lines % 10 === 0) {
					this.level += 1;
				};

				this.score += ((score * fullLines.length) * this.level);

				this.destroying -= 1;

			});

			return this;

		};
		checkForFallingBrick() {

			const falling = this.bricks.filter((brick) => {
				return brick.falling;
			});

			if(!falling.length&&!this.destroying&&!this.gameOver) {
				this.addBrick().restartAutoMove();
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
		checkForBest() {

			const best = this.storage.get('best');
			
			if(best) {
				this.best = best;
			};

			this.updateBest();

			return this;

		};
		query(x, y) {
			const blocks = this.getStaticBlocks();
			return blocks.filter((block) => {return block.getRelativeX()===x && block.getRelativeY()===y})[0];
		};
		checkForMerges() {
			if(this.brickCountCache===(this.bricks.length + this.destroying)) {return;}
			console.log('change to brickCountCache'); // need another caching method, since this prevents bricks from merging before line clear
			this.brickCountCache = (this.bricks.length + this.destroying);
			for(var y=(this.height-1);y>=0;y--) {
				for(var x=0;x<this.width;x++) {
					let first = this.query(x, y);
					if(!first) {continue;};
					let next = this.query(x, (first.getRelativeY() - 1));
					let value = first.value;
					while(next && next.color === first.color) {
						value += next.value;
						next.value = 0;
						next = this.query(x, (next.getRelativeY() - 1));
					};
					first.value = value;
				};
			};
			return this;
		};
		updateLines() {

			this.linesNode.innerHTML = `<h2>lines</h2><p>${this.lines}</p>`;
			return this;

		};
		updateScore() {

			this.scoreNode.innerHTML = `<h2>score</h2><p>${this.score}</p>`;
			return this;

		};
		updateLevel() {
			
			this.levelNode.innerHTML = `<h2>level</h2><p>${this.level}</p>`;
			return this;

		};
		setBest(value) {
			
			this.best = value;
			this.storage.set('best', this.best);
			this.updateBest();
			return this;

		};
		updateBest() {
			
			this.bestNode.innerHTML = `<h2>best</h2><p>${this.best}</p>`;
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
		showGameOverScreen() {

			this.gameOverNode.setAttribute('data-active', true);
			this.gameOverNode.innerHTML = `<div><h1>Game over!</h1><p>You scored ${this.score}</p><p class="smaller">Tap to try again.</p></div>`;
			this.gameOver = true;
			
			if(this.score > this.best) {
				this.setBest(this.score);
			};

			return this;

		};
		setMode(mode) {

			this.mode = mode;
			return this;

		};
		setTheme(theme) {
			
			this.theme = theme;
			root.style.setProperty('--background', this.getThemeBackgroundColor());
			root.style.setProperty('--foreground', this.getThemeForegroundColor());
			root.style.setProperty('--glass', theme === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)');
			return this;

		};
		getThemeForegroundColor() {
			return this.theme === 'light' ? 'rgb(125, 125, 125)' : 'snow';
		};
		getThemeBackgroundColor() {
			return this.theme === 'light' ? 'snow' : '#111';
		};
		getRandomColor() {
			return this.colors[Math.floor(Math.random() * (this.colors.length))];
		};
		setColor(color, value) {
			this.colors[color - 1][0] = value;
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
		scale = scaler.inflate(25);
		gap = scaler.inflate(1.5);
		destroying = 0;
		scores = [40, 100, 300, 1200];
		colors = [
			['crimson', 1, 0], // rgb(220, 20, 60)
			['dodgerblue', 2, 1], // rgb(30, 144, 255)
			['gold', 3, 2], // rgb(255, 215, 0)
			['green', 4, 3], // rgb(0, 128, 0)
			['darkorange', 5, 4], // rgb(255, 140, 0)
			['deeppink', 6, 5], // rgb(255, 20, 147)
			['darkturquoise', 7, 6], // rgb(0, 206, 209)
			['blueviolet', 8, 7], // rgb(138, 43, 226)
			['limegreen', 9, 8] // rgb(50, 205, 50)
		];
		direction = 'right';
		mode = 'standard';
		eventTarget = 'gameNode';
		gameOver = false;
		flashDuration = 300;
		theme = 'light';
		brickCountCache = 0;
	};

	var 
	body = document.body,
	root = document.querySelector(':root'),
	rotateKeys = ['Space'],
	directionKeys = ['ArrowDown', 'ArrowLeft', 'ArrowRight'],
	directionKeysMap = {
		'ArrowDown': 'down',
		'ArrowLeft': 'left',
		'ArrowRight': 'right'
	},
	isValidKey = (key, options) => (options.includes(key)),
	platform = Capacitor.getPlatform(),
	// platform = 'ios',
	safeArea = (platform==='ios' ? 50 : 0),
	nextUpTop = (safeArea + 20),
	log = false,
	tetris = window.tetris = new Tetris(),
	touch,
	xMovement = 0,
	yMovement = 0,
	rounder = new Rounder(40);

	tetris.appendTo(body).render();

	SplashScreen.hide();

	console.log('tetris', tetris);

	root.style.setProperty('--gap', `${tetris.gap / 2}px`);
	root.style.setProperty('--nextup-top', `${nextUpTop}px`);
	root.style.setProperty('--alignment', platform==='ios' ? 'start' : 'center');
	root.style.setProperty('--game-height', platform==='ios' ? '100%' : 'auto');
	root.style.setProperty('--game-gap', platform==='ios' ? '0' : '20px');

	document.addEventListener('keydown', function(e) {

		if(isValidKey(e.code, directionKeys)) {
			tetris.moveAll(directionKeysMap[e.code]);
		};

		if(isValidKey(e.code, rotateKeys)) {
			tetris.rotateAll();
		};

	});

	tetris.addEventListener('click', function() {
		
		if(tetris.gameOver) {
			tetris.reset();
		}
		else {
			tetris.rotateAll();
		};

	});

	tetris.addEventListener('touchstart', function(e) {
		
		touch = e.touches[0];
		xMovement = 0;
		yMovement = 0;

		e.preventDefault();

	}, false);

	tetris.addEventListener('touchmove', function(e) {
		
		const {clientX: originalClientX, clientY: originalClientY} = touch;
		const {clientX, clientY} = e.touches[0];
		const x = rounder.round(clientX - originalClientX);
		const y = rounder.round(clientY - originalClientY);

		if(x !== xMovement) {
			this.dispatchEvent(new Event(x > xMovement ? 'drag-right' : 'drag-left'));
		};

		if(y !== yMovement) {
			this.dispatchEvent(new Event(y > yMovement ? 'drag-down' : 'drag-up'));
		};

		xMovement = x;
		yMovement = y;

	});

	tetris.addEventListener('touchend', function() {

		const noMovement = (xMovement===0 && yMovement===0);

		if(noMovement && tetris.gameOver) {
			tetris.reset();
		}
		else if(noMovement) {
			tetris.rotateAll();
		};

	});

	tetris.addEventListener('drag-down', function() {
		tetris.moveAll('down');
	});

	tetris.addEventListener('drag-right', function() {
		tetris.moveAll('right');
	});

	tetris.addEventListener('drag-left', function() {
		tetris.moveAll('left');
	});

	document.addEventListener('visibilitychange', function() {

		if(document.hidden) {
			tetris.stop();
		} 
		else {
			tetris.render();
		};

	});

})();