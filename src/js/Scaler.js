export class Scaler {
  constructor(scale) {
    this.scale = scale;
  }
  inflate(value) {
		return value * this.scale;
	};
	deflate(value) {
		return value / this.scale;
	};
};