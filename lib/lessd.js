module.exports = LessD;

var Fs = require('fs');
var Path = require('path');

var Inotify = require('inotify-plusplus');
var Walk = require('walk');

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

	this.inotify = Inotify.create(true);
	this.inotifyDirectives = {
		all_events: function(event) { self.onWatchedChanged(event); }
	};
	this.inotifyOptions = {
		all_events_is_catchall: true
	};
	this.watched = {};

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
				this.walkDirectory(path);
			}
		}
	}
}

LessD.prototype.walkDirectory = function walkDirectory(path) {
	var self = this;
	var walker = Walk.walk(path);
	self.watch(path);
	walker.on('file', function (path, stat, next) {
		if (stat.name.substr(-5) === '.less' || stat.name.substr(-4) === '.css') {
			path = path + '/' + stat.name;
			self.watch(path);
		}
		next();
	});
	walker.on('directory', function (path, stat, next) {
		path = path + '/' + stat.name;
		self.watch(path);
		next();
	});
};

LessD.prototype.watch = function watch(path) {
	this.watched[path] = this.inotify.watch(this.inotifyDirectives, path, this.inotifyOptions);
};

LessD.prototype.unwatch = function unwatch(path) {
	this.watched[path]();
	delete this.watched[path];
};

LessD.prototype.onWatchedChanged = function onWatchedChanged(event) {
	var self = this;
	var path = event.watch + (event.name ? '/' + event.name : '');

	if (event.masks.indexOf('create') !== -1) {
		this.watch(path);
	}
	else if (event.masks.indexOf('delete_self') !== -1 || event.masks.indexOf('moved_from') !== -1) {
		this.unwatch(path);
		self.onWatchedModified(path);
	}
	else {
		Fs.stat(path, function(err, stats) {
			if (!err) {
				if (stats.isFile() && event.masks.indexOf('modify') !== -1) {
					self.onWatchedModified(path);
				}
				else if (event.masks.indexOf('moved_to') !== -1) {
					this.watch(path);
					if (stats.isDirectory()) {
						this.walkDirectory(path);
					}
					self.onFileModified(path);
				}
			}
		});
	}
};

LessD.prototype.onWatchedModified = function onWatchedModified(f) {
	if (f === this.output) {
		return;
	}

	for (var p in this.projects) {
		var project = this.projects[p];
		for (var i = 0; i < project.directories.length; i++) {
			var directory = project.directories[i];
			if (f.slice(0, directory.length) === directory) {
				project.requestCompile();
			}
		}
	}
};
