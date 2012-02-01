module.exports = LessDLogger;

var Fs = require('fs');

function LessDLogger(path) {
	this.writer = Fs.createWriteStream(path, {
		flags: 'a'
	});
}

LessDLogger.prototype.log = function log(text) {
	this.writer.write(text + "\n");
};
