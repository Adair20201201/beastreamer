function ConsoleLogger() {

}

ConsoleLogger.prototype.writeLog = function(logMessage) {
    console.log(logMessage);
}

module.exports = ConsoleLogger;