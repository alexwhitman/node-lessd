module.exports = LessD;

var Fs = require('fs');
var Path = require('path');

var hound = require('hound');

var LessProject = require('./lessproject.js');
var LessDLogger = require('./lessdlogger.js');

function LessD(config) {

	var defaults = {
		compile_on_start: false,
		log: false,
		compress: false
	};

	for (var opt in defaults) {
		if (!config[opt]) {
			config[opt] = defaults[opt];
		}
	}

	this.config = config;

	if (!this.config.projects) {
		console.log('No projects defined, exiting');
		process.exit(1);
	}

	var self = this;
	this.projects = {};
	this.rootDirectories = [];
	this.loggers = [];
	this.watchers = [];

	var i = null;

	for (var p in this.config.projects) {
		var current = this.config.projects[p];

		if (typeof current.watch === 'string') {
			current.watch = [ current.watch ];
		}

		for (i = 0; i < current.watch.length; i++) {
			current.watch[i] = Path.resolve(this.config.path, current.watch[i]);
		}
		current.run = Path.resolve(this.config.path, current.run);
		current.output = Path.resolve(this.config.path, current.output);
		if (!current.compile_on_start) {
			current.compile_on_start = this.config.compile_on_start;
		}
		if (!current.log) {
			current.log = this.config.log;
		}
		var logger = null;
		if (typeof current.log === 'string') {
			current.log = Path.resolve(this.config.path, current.log);
			if (this.loggers[current.log]) {
				logger = this.loggers[current.log];
			}
			else {
				logger = new LessDLogger(current.log);
				this.loggers[current.log] = logger;
			}
		}
		if (!current.compress) {
			current.compress = this.config.compress;
		}

		var project = new LessProject(p, {
			directories: current.watch,
			run: current.run,
			output: current.output,
			logger: logger,
			compress: current.compress
		});
		this.projects[p] = project;
		if (current.compile_on_start) {
			project.compile();
		}

		for (i = 0; i < current.watch.length; i++) {
			var path = current.watch[i];
			if (this.rootDirectories.indexOf(path) === -1) {
				this.rootDirectories.push(path);
				this.watch(path);
			}
		}
	}
}

LessD.prototype.watch = function watch(path) {
	if (this.watchers[path]) {
		return;
	}

	var self = this;
	var watcher = hound.watch(path);
	watcher.on('create', function (file, stats) {
		self.onWatchedChanged(file, stats);
	});
	watcher.on('change', function (file, stats) {
		self.onWatchedChanged(file, stats);
	});
	watcher.on('delete', function (file) {
		self.onWatchedDeleted(file);
	});
	this.watchers[path] = watcher;
};

LessD.prototype.onWatchedChanged = function onWatchedChanged(file, stats) {
	if (file === this.output) {
		return;
	}

	for (var p in this.projects) {
		var project = this.projects[p];
		for (var i = 0; i < project.directories.length; i++) {
			var directory = project.directories[i];
			if (file.slice(0, directory.length) === directory) {
				project.requestCompile();
			}
		}
	}
};

LessD.prototype.onWatchedDeleted = function onWatchedDeleted(file) {
	if (this.watchers[file]) {
		this.watchers[file].clear();
		delete this.watchers[file];
	}
	else {
		this.onWatchedChanged(file);
	}
};
