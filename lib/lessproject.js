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
				var msg = [
					err.message,
					err.filename,
					'Line: ' + err.line + ', Column: ' + err.column
				];
				msg = msg.concat(err.extract);
				self.log(msg.join("\n"));
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
				var msg = [
					e.message,
					e.filename,
					'Line: ' + e.line + ', Column: ' + e.column
				];
				msg = msg.concat(e.extract);
				self.log(msg.join("\n"));
				return;
			}
		});
	});
};

LessProject.prototype.log = function log(text) {
	var now = new Date();
	text = '[' + now + '] ' + text;
	if (this.logger) {
		this.logger.log(text);
	}
	else {
		console.log(text);
	}
};
