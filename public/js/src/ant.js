
/**
 * Ant namespace exposes JS implementation of Langton's Ant.
 */
var Ant = new function () {

  // Internal enum.
  var DIR = Object.freeze({
    RIGHT: 0,
    UP: 1,
    LEFT: 2,
    DOWN: 3
  });

  /**
   * World is a sparse matrix (only holds references to occupied cells).
   * @param {Instance} instance reference to running simulation
   */
  var World = function (instance) {
    if (!(instance instanceof Instance)) throw new Error('no instance');
    this.instance = instance;
    this.cells = {};
  };
  // Returns the hash string that cooresponds to the position given.
  // This function is internal use.
  World.prototype.hash = function (x, y) {
    return x.toString(10) + '_' + y.toString(10);
  };
  // Returns the Cell object contained at this position. If no cell exists
  // there, a new one is created.
  World.prototype.at = function (x, y) {
    var hash = this.hash(x, y);
    if (typeof this.cells[hash] === 'undefined') {
      var cell = new Cell(x, y);
      if (this.instance.graphics) cell.graphicsHandle = this.instance.graphics.addCell(x, y);
      this.cells[hash] = cell;
    }
    return this.cells[hash];
  };

  /**
   * One cell that the ant has previously visited. Only holds color and x, y.
   * @param {Number} x
   * @param {Number} y
   */
  var Cell = function (x, y) {
    this.x = x;
    this.y = y;
    this.color = 0;
  };
  // Changes the color of this cell. Returns whether or not the color was
  // actually changed.
  Cell.prototype.setColor = function (color) {
    if (this.color === color) return false;
    this.color = color;
    return true;
  }

  /**
   * Instance represents a simulation with an ant running on a specific behavior.
   * @param {String} behavior the name of this multi-color ant
   */
  var Instance = function (behavior) {
    this.behavior = behavior.toUpperCase();
    this.world = new World(this);
    this.enabled = false;
  };
  // Starts running the simulation from the beginning. This should only be
  // called once. If you want to re-run this, create a new instance.
  Instance.prototype.start = function () {
    // the ant starts at 0, 0
    this.ant = {
      x: 0,
      y: 0,
      direction: DIR.DOWN,
      forward: function () {
        this.x += [1, 0, -1, 0][this.direction];
        this.y += [0, 1, 0, -1][this.direction];
      }
    };
    this.enabled = true;
  };
  // Moves the ant one cell and updates color. Optionally, the first argument
  // is the number of steps to take.
  Instance.prototype.step = function (n) {
    if (typeof n === 'undefined') n = 1;

    for (var i = 0; i < n; i++) {
      // change the color of the cell directly under the ant.
      var cellUnderAnt = this.world.at(this.ant.x, this.ant.y);
      var colorUnderAnt = cellUnderAnt.color;

      var turnDirection = this.behavior[colorUnderAnt];

      if (turnDirection === 'R') {
        this.ant.direction = (this.ant.direction + 3) % 4;
      } else if (turnDirection === 'L') {
        this.ant.direction = (this.ant.direction + 1) % 4;
      } else {
        throw new Error('behavior string should be Rs and Ls')
      }
      var newColor = (colorUnderAnt + 1) % this.behavior.length;
      var changed = cellUnderAnt.setColor(newColor);
      if (changed && this.graphics) this.graphics.setCell(cellUnderAnt.graphicsHandle, newColor);

      // move ant
      this.ant.forward();
    }
  };

  /**
   * Returns an array of size n where element 0 is color a, element n-1 is
   * b, and the elements in-between comprise a linear interpolation between
   * the two colors. Useful for an easy way to initialize Graphics with variable
   * lengths of behavior.
   * @param  {Number} a Color in 0xFF0000 format
   * @param  {Number} b Color in 0xFF0000 format
   * @param  {Number} n length of array
   * @return {Array}
   */
  var colorLerp = function (a, b, n) {
    var ar = (0xFF0000 & a) >> 16;
    var ag = (0x00FF00 & a) >> 8;
    var ab = (0x0000FF & a);
    var br = (0xFF0000 & b) >> 16;
    var bg = (0x00FF00 & b) >> 8;
    var bb = (0x0000FF & b);

    var array = [];
    for (var i = 0; i < n; i++) {
      var r = ar + (br - ar) * (i / (n-1))
      var g = ag + (bg - ag) * (i / (n-1));
      var b = ab + (bb - ab) * (i / (n-1));
      var c = (r << 16) | (g << 8) | (b);
      array.push(c);
    }

    return array;
  };


  /**
   * PIXI.js plugin to render an Instance's World onto a HTML5 canvas.
   * An instance of Graphics can be added directly to a PIXI stage.
   * Width and height provided constrain the PIXI container to a max size.
   * @param {Array}  colors colors used to draw the cells
   * @param {Number} w
   * @param {Number} h
   */
  var Graphics = function (colors, w, h) {
    if (colors.length < 1) throw new Error('need at least one color');
    PIXI.SpriteBatch.apply(this);

    this.maxw = w / 16;
    this.maxh = h / 16;
    this.cells = [];
    this.colors = colors;

    this.scaleTarget = 1;

    this.position.x = w / 2 - 8;
    this.position.y = h / 2 - 8;

    // Spend some time pre-rendering a bunch of circles. This allows us
    // to extend SpriteBatch and take advantage of GL optimizations somehow.
    this.textures = [];
    var that = this;
    colors.forEach(function (rgb) {
      var g = new PIXI.Graphics;
      g.beginFill(rgb);
      g.drawCircle(8, 8, 6);
      g.endFill();
      that.textures.push(g.generateTexture());
    });
  };
  Graphics.prototype = Object.create(PIXI.SpriteBatch.prototype);
  Graphics.prototype.constructor = Graphics;
  // Creates a new cell with the initial color. Returns a handle that should
  // be provided when changing the color of this new cell.
  Graphics.prototype.addCell = function (x, y) {
    var cell = new PIXI.Sprite(this.textures[0]);
    cell.position = { x: x * 16, y: y * 16 };
    var i = this.cells.length;
    this.cells.push(cell);
    // SpriteBatch.addChild
    this.addChild(cell);
    // Then check if this cell is out of the constrained area.
    if (x >= +this.maxw/2 || x <= -this.maxw/2 || y >= +this.maxh/2 || y <= -this.maxh/2) {
      this.maxw *= 1.25;
      this.maxh *= 1.25;
      this.scaleTarget *= 0.8;
    }
    return i;
  };
  // Change the color of an existing cell, by the specified handle. Takes a
  // color index (0, 1, 2..), not an actual RGB color.
  Graphics.prototype.setCell = function (i, color) {
    if (typeof this.cells[i] === 'undefined') throw new Error('nonexistant cell');
    if (color >= this.colors.length) throw new Error('colors and behavior have mismatching length');
    var cell = this.cells[i];
    cell.setTexture(this.textures[color]);
  };
  // If the runtime allows a callback to fire at 60 fps or on each canvas update,
  // call this function for some smooth transitions.
  Graphics.prototype.draw = function () {
    if (this.scale.x !== this.scaleTarget) {

      var d = this.scale.x - this.scaleTarget;
      if (d < 0.01)
        this.scale.x = this.scaleTarget;
      else
        this.scale.x -= d * 0.1;

      this.scale.y = this.scale.x;
    }
  };

  // Expose classes in Ant namespace
  this.Instance = Instance;
  this.Graphics = Graphics;
  this.colorLerp = colorLerp;
};
