var fs = require('fs');

function Logger(logFilename) {
    this.logFilename = logFilename;
}

Logger.prototype.writeLog = function(logMessage) {
    fs.appendFile(this.logFilename, logMessage + "\n", function(err) {
        if (err) throw err;
    });
}

module.exports = Logger;