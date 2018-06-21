var fs = require('fs');
var readLine = require('readline');
var JSONGenerator = require('./JSONGenerator');

function FileStream(filename,dataSchema) {
    this.filename = filename;
    this.extension = filename.split('.')[1];
    this.ignoreHeader = true;    
    this.fieldNames = null;
    this.reader = null;    
    this.paused = false;
    this.jsonGenerator = new JSONGenerator(dataSchema);
}

FileStream.prototype.startStream = function(lineListener,pauseListener,resumeListener,extraFields) {
    this.reader = readLine.createInterface(fs.createReadStream(this.filename,'utf8'), null);    
    
    var fileStream = this;

    this.reader.on('line', function (line) {
        if (fileStream.extension == "csv") {
            var fieldValues = line.split(',');

            if (fileStream.ignoreHeader) { // generate field names
                fileStream.fieldNames = fieldValues;
                
                for (var i = 0; i < extraFields.length; ++i) {
                    fileStream.fieldNames.push(extraFields[i]); // add extra json fields
                }

                fileStream.ignoreHeader = false;
            } else { 
                lineListener(fileStream.fieldNames,fieldValues,fileStream.jsonGenerator);
            }
        } else if (fileStream.extension == "json") {
            lineListener(line, fileStream.jsonGenerator);
        }
    });

    this.reader.on('pause', function(){
        if (pauseListener != null) {
            pauseListener();            
        }
    });

    this.reader.on('resume', function(){
        if (resumeListener != null) {
            resumeListener();
        }
    });
};

FileStream.prototype.pauseStream = function(timeout) {
    if (!this.paused) {
        this.reader.pause();        
        this.paused = true;

        if (timeout) {
            setTimeout(this.resumeStream.bind(this),timeout);
        }
    }
}

FileStream.prototype.resumeStream = function() {
    if (this.paused) {
        this.reader.resume();
        this.paused = false;
    }
}

module.exports = FileStream;
