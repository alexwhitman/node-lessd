module.exports = LessProject;

var Fs = require('fs');
var Path = require('path');

var Less = require('less');

function LessProject(name, config) {
	this.name = name;
	this.directories = config.directories;
	this.run = config.run;
	this.output = config.output;
	this.logger = config.logger;
	this.compress = config.compress;
	this.compileTimeout = null;
}

LessProject.prototype.requestCompile = function requestCompile() {
	var self = this;
	if (this.compileTimeout) {
		clearTimeout(this.compileTimeout);
	}
	this.compileTimeout = setTimeout(function() {
		self.compileTimeout = null;
		self.compile();
	}, 1000);
};

LessProject.prototype.compile = function compile() {
	var self = this;
	this.log('Compiling ' + this.name);
	Fs.readFile(this.run, function(err, data) {
		if (err) {
			self.log(err);
			return;
		}

		new (Less.Parser)({
			paths: [ Path.dirname(self.run) ],
			filename: self.run
		}).parse(data.toString(), function(err, tree) {
			if (err) {
				self.log(err);
				return;
			}

			try {
				var css = tree.toCSS({
					compress: self.compress
				});
				Fs.writeFile(self.output, css, function() {
					self.log('Done compiling ' + self.name);
				});
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
	else {
		console.log(text);
	}
};
