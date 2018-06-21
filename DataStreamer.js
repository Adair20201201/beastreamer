var kafka = require('kafka-node');
var FileStream = require('./FileStream');
var FileLogger = require('./FileLogger');
var ConsoleLogger = require('./ConsoleLogger');
var http = require('http');

function DataStreamer(configName,lineListener,pauseListener,resumeListener,streamListener,extraFields) {
    this.config = require("../../" + configName + ".json"); // Loading config
    this.target = this.config.target; // Stream target
    this.fileStream = new FileStream(this.config.filename,this.config.dataSchema);
    this.streamBuffer = [];
    this.kafkaProducer = null;

    this.logger = null;
    if (this.config.loggerEnabled ) {
        if (this.config.loggerType == "console") {
            this.logger = new ConsoleLogger();
        } else if (this.config.loggerType == "file") {
            this.logger = new FileLogger(this.config.logFilename + "-" + new Date().toLocaleString() + ".log");            
        }
    }

    // If target is Kafka create instance of Producer
    if (this.target.type === "kafka") {
        var kafkaClient = kafka.Client(this.target.config.connectionString, this.target.config.clientId, this.target.config.zkOptions);
        this.kafkaProducer = new kafka.Producer(kafkaClient);
    }

    this.extraFields = extraFields;

    this.lineListener = lineListener;
    this.pauseListener = pauseListener;
    this.resumeListener = resumeListener;
    this.streamListener = streamListener;
}

DataStreamer.prototype.push = function(message) {
    this.streamBuffer.push(message);
}

DataStreamer.prototype.writeLog = function(logMessage) {
    if (this.logger == null) {
        console.error("You can't write log to file becasue loggerEnabled attribute in config is false");
    } else {
        this.logger.writeLog(logMessage);
    }
}

DataStreamer.prototype.pauseStream = function(timeout) {
    this.fileStream.pauseStream(timeout);
}

DataStreamer.prototype.resumeStream = function(timeout) {
    this.fileStream.resumeStream(timeout);
}

DataStreamer.prototype.startStream = function() {
    this.fileStream.startStream(this.lineListener,this.pauseListener,this.resumeListener,this.extraFields);
    this.streamToTarget();
}

DataStreamer.prototype.getChunkFromBuffer = function() {
    var size = this.streamBuffer.length < this.config.chunkSize ? this.streamBuffer.length : this.config.chunkSize;

    if (size != 0) {
        return this.streamBuffer.splice(0,size);
    } else {
        return null;
    }
}

DataStreamer.prototype.conditionalRebuffer = function(err,buffer) {
    if (err) {
        console.log("\n[ERROR - " + new Date().toLocaleString() +"] - Error occurred while sending data: " + err + "\n");

        if (buffer != null) {
            this.streamBuffer.push(buffer);
        }
    } else {
        console.log("\n[SUCCESS - " +  new Date().toLocaleString() + "] Data successfully has sended!\n");
    }
}

DataStreamer.prototype.streamToTarget = function () {
    if (this.target.type === "kafka") {
        this.stream(kafkaCallback);
    } else if (this.target.type === "http") {
        this.stream(httpCallback);
    }
}

DataStreamer.prototype.stream = function(streamCallback) {
    var buffer = this.getChunkFromBuffer();

    if (buffer != null) {
        streamCallback.bind(this)(buffer);
    }

    setTimeout(this.stream.bind(this,streamCallback.bind(this)), 200);
}

 function kafkaCallback(kafkaBuffer) {
    console.log("\n" + new Date().toLocaleString() + " - Writing filled buffer to Kafka topic \"" + this.target.config.topic + "\"");
    console.log(new Date().toLocaleString() + " - Buffer length: " + kafkaBuffer.length);
    console.log(new Date().toLocaleString() + " - Last Written data: " +  kafkaBuffer[kafkaBuffer.length - 1]);

    var dataStreamer = this;

    this.kafkaProducer.send([{
        topic: dataStreamer.target.config.topic,
        messages: kafkaBuffer
    }], function (err,data) {
        dataStreamer.conditionalRebuffer(err,data);
    });
}

function httpCallback(httpBuffer) {
    var buffer = Buffer.from(httpBuffer);


    var options = {
        "path": this.target.config.path,
        "hostname": this.target.config.hostname,
        "port": this.target.config.port,
        "method": this.target.config.method,
        "headers": {
            "Content-Type": this.target.config.headers.contentType,
            "Content-Length": Buffer.byteLength(buffer)
        }
    };

    var req = http.request(options, (res) => {
        console.log("\n" + new Date().toLocaleString() + " - Writing filled buffer to HTTP server on \"" + this.target.config.hostname + ":" + this.target.config.port + this.target.config.path + "\"");
        console.log(new Date().toLocaleString() + " - Buffer length: " + httpBuffer.length);
        console.log(new Date().toLocaleString() + " - Last Written data: " +  httpBuffer[httpBuffer.length - 1]);
        console.log("[SUCCESS - " +  new Date().toLocaleString() + "] Sending data successfull.     HTTP STATUS CODE: " + res.statusCode);
    });

    req.on('error', (e) => {
        this.conditionalRebuffer(e,httpBuffer);
    });

    // write data to request body
    req.write(httpBuffer.toString());
    req.end();
}

module.exports = DataStreamer;
