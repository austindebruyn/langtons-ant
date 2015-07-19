
var boot, enabled, instance, renderer, stage;

// // Preset model
// var Preset = Backbone.Model.extend({
//
// });
//
// var PresetList = Backbone.Collection.extend({
//   model: Preset,
//   url: 'preset',
// });
// var SavedPresets = new PresetList;
//
// var PresetView = Backbone.View.extend({
//   tagName: 'li',
//   template: _.template('<%- name %>'),
//   render: function () {
//     this.$el.html(this.template(this.model.attributes));
//     return this;
//   }
// });
// var PresetsView = Backbone.View.extend({
//   tagName: 'div',
//   className: 'presets',
//   initialize: function () {
//     this.listenTo(SavedPresets, 'change', this.render);
//   },
//   render: function () {
//     var that = this;
//     SavedPresets.forEach(function (ant) {
//       var p = new PresetView;
//       p.model = ant;
//       p.render();
//       that.$el.append(p.$el);
//     });
//   }
// });

// Object representing the state of the visible ant-world.
var simulation = {
  enabled: false
};

// Options for when you just load the page for the first time.
var auto_start_simulation = true;
var starting_behavior = 'RLR';

/**
 * SIMULATION FUNCTIONS
 */

// Just pauses the simulation, but does not wipe the canvas.
var pauseSimulation = function () {
  simulation.enabled = false;
  simulation.paused = true;
};

// Resumes the simulation IF it has been paused.
var resumeSimulation = function () {
  if (!simulation.paused) return;
  simulation.paused = undefined;
  startSimulation();
};

// Clears the running simulation and wipes the canvas.
var clearSimulation = function () {
  if (simulation.paused) {
    // Set the button to say "Pause" again.
    pauseClick();
  }
  if (simulation.enabled) {
    // Make sure the old PIXI stuff gets picked up by GC.
    if (instance instanceof Ant.Instance && instance.graphics instanceof Ant.Graphics) {
      stage.removeChild(instance.graphics);
    }
    clearInterval(simulation.interval);
    simulation.enabled = false;
  }
};

// Clears the old simulation and re-initializes the running simulation with
// the new behavior.
var initSimulation = function (behavior) {
  clearSimulation();
  var colors = Ant.colorLerp(0x000000, 0x1177EE, behavior.length);
  // Create a new Langton's Ant Instance.
  instance = new Ant.Instance(behavior);
  var graphics = instance.graphics = new Ant.Graphics(colors, 500, 500);
  stage.addChild(graphics);
  instance.start();
  simulation.behavior = behavior;

  startSimulation();
};

// Starts a new simulation or unpauses the currently running simulation.
var startSimulation = function () {

  // Draw loop interval.
  var render = function () {
    if (!simulation.enabled) return;
    request = requestAnimFrame(render);
    renderer.render(stage);
    instance.graphics.draw();
  }
  requestAnimFrame(render);
  // Step loop interval.
  simulation.interval = setInterval(function () {
    if (!simulation.enabled) return;
    instance.step(8);
  }, 1); //1000.0 / 30);

  // main screen turn on
  simulation.enabled = true;
};

/**
 * UI FUNCTIONS
 */

// Click "Try" to start a new simulation. Pick up the new behavior, clear old
// simulation and try again.
var tryClick = function () {
  var behavior = $('input[name=behavior]').val();
  initSimulation(behavior);
};

// Click "Pause" and pause the running simulation.
var pauseClick = function () {
  if (simulation.paused)
    resumeSimulation();
  else
    pauseSimulation();

  $('button[name=pause]').html(simulation.enabled ? 'Pause' : 'Resume');
};

// Click "Save" and save the current ant's name.
var saveClick = function () {
  SavedPresets.create({ name: simulation.behavior });
};

// Should only be called once - boot the PIXI stage and canvas.
var bootCanvas = function () {
  stage = new PIXI.Stage(0x0)
  renderer = PIXI.autoDetectRenderer(500, 500, {
    view: $('#game')[0],
    antialias: true
  });
};

// Boots the app when the dom is
bootCanvas();

$('input[name=behavior]').val(starting_behavior);
$('button[name=try]').click(tryClick);
$('button[name=pause]').click(pauseClick)
$('button[name=save]').click(saveClick);

if (auto_start_simulation) initSimulation(starting_behavior);
