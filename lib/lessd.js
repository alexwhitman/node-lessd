module.exports = LessD;

var Less = require('less');
var Watch = require('watch');
var Fs = require('fs');
var Path = require('path');

function LessD(config) {
	if (!config.projects) {
		console.log('No projects defined, exiting');
		process.exit(1);
	}

	var self = this;
	this.projects = {};
	this.watchedDirectories = [];

	for (var p in config.projects) {
		var current = config.projects[p];

		if (typeof current.watch === 'string') {
			current.watch = [ current.watch ];
		}

		for (var i = 0; i < current.watch.length; i++) {
			current.watch[i] = Path.resolve(config.path, current.watch[i]);
		}
		current.run = Path.resolve(config.path, current.run);
		current.output = Path.resolve(config.path, current.output);

		var project = new LessProject(p, current.watch, current.run, current.output);
		this.projects[p] = project;
		if (config.build_on_start) {
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

function LessProject(name, directories, run, output) {
	this.name = name;
	this.directories = directories;
	this.run = run;
	this.output = output;

	this.parser = new (Less.Parser)({
		paths: [ Path.dirname(this.run) ],
		filename: this.run
	});
}

LessProject.prototype.compile = function compile() {
	var self = this;

	Fs.readFile(this.run, function(err, data) {
		if (err) {
			console.log(err);
			return;
		}

		self.parser.parse(data.toString(), function(err, tree) {
			if (err) {
				console.log(err);
				return;
			}

			try {
				var css = tree.toCSS({
					compress: true
				});
				Fs.writeFile(self.output, css);
			}
			catch (e) {
				console.log(e);
				return;
			}
		});
	});
};
