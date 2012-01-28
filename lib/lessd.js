module.exports = LessD;

var Less = require('less');
var Watch = require('watch');
var Fs = require('fs');
var Path = require('path');

function LessD(config) {

	var defaults = {
		compile_on_start: false,
		log: false
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
	this.watchedDirectories = [];
	this.loggers = [];

	for (var p in this.config.projects) {
		var current = this.config.projects[p];

		if (typeof current.watch === 'string') {
			current.watch = [ current.watch ];
		}

		for (var i = 0; i < current.watch.length; i++) {
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

		var project = new LessProject(p, current.watch, current.run, current.output, logger);
		this.projects[p] = project;
		if (current.compile_on_start) {
			project.compile();
		}

		for (var i = 0; i < current.watch.length; i++) {
			var path = current.watch[i];
			if (this.watchedDirectories.indexOf(path) === -1) {
				this.watchedDirectories.push(path);

				var watchOptions = {
					ignoreDotFiles: true
				};

				Watch.createMonitor(path, watchOptions, function(monitor) {
					monitor.on('created', function(f, stat) {
						self.onFileModified(f);
					});
					monitor.on('changed', function(f, curr, prev) {
						self.onFileModified(f);
					});
					monitor.on('removed', function(f, stat) {
						self.onFileModified(f);
					});
				});
			}
		}
	}
}

LessD.prototype.onFileModified = function onFileModified(f) {
	if (f === this.output) {
		return;
	}

	var compileList = [];
	for (var p in this.projects) {
		var project = this.projects[p];
		for (var i = 0; i < project.directories.length; i++) {
			var directory = project.directories[i];
			if (f.slice(0, directory.length) === directory) {
				if (compileList.indexOf(project.name) === -1) {
					compileList.push(project);
					break;
				}
			}
		}
	}
	for (var p in compileList) {
		compileList[p].compile();
	}
};

function LessProject(name, directories, run, output, logger) {
	this.name = name;
	this.directories = directories;
	this.run = run;
	this.output = output;
	this.logger = logger;

	this.parser = new (Less.Parser)({
		paths: [ Path.dirname(this.run) ],
		filename: this.run
	});
}

LessProject.prototype.compile = function compile() {
	var self = this;
	Fs.readFile(this.run, function(err, data) {
		if (err) {
			self.log(err);
			return;
		}

		self.parser.parse(data.toString(), function(err, tree) {
			if (err) {
				self.log(err);
				return;
			}

			try {
				var css = tree.toCSS({
					compress: true
				});
				Fs.writeFile(self.output, css);
			}
			catch (e) {
				self.log(e);
				return;
			}
		});
	});
};

LessProject.prototype.log = function log(text) {
	if (this.logger) {
		this.logger.log(text);
	}
};

function LessDLogger(path) {
	this.writer = Fs.createWriteStream(path, {
		flags: 'a'
	});
}

LessDLogger.prototype.log = function log(text) {
	this.writer.write(text + "\n");
};
