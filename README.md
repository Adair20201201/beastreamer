# **DataStreamer**

Data streamer for streaming analytics test platforms. Takes batch CSV,JSON data and streams to targets (Kafka,HTTP).

## Installation


![](https://team-of-developers.org/template/images/partn/npm.png)

[DataStreamer at NPM (version 1.2.7)](https://www.npmjs.com/package/datastreamer)

Install with NPM -> **npm install datastreamer**

## Details of DataStreamer
```javascript
DataStreamer(configName,lineListener,pauseListener,resumeListener,streamListener,extraFields);
```

### Parameters 
- **configName**: Name or path of config file in JSON format without extension (if your config file **'config.json'**,
  **configName** will be **'config'**)
  
- **lineListener**: Callback function which will be triggered when every line readed from file. This function takes these parameters:

    - **fileStream**: File stream for resume, pause and close the stream.
      
    - **fieldNames**: Field names of data. You can add extra fields via give field names as array to **extraFields**
      parameter of **DataStreamer** constructor.
      
    - **fieldValues**: Field values of data. You can add values of extra fields to this array
       
    - **jsonGenerator**: Json generator for corresponding data schema which has given with config file's **dataSchema**
      attribute.
      
```javascript
    function lineListener(fileStream,fieldNames,fieldValues,jsonGenerator) { /* your implementation */ }
```
          
- **pauseListener**: Callback function which will be triggered when stream paused.

```javascript
    function pauseListener() { /* your implementation */ }
```

- **resumeListener**: Callback function which will be triggered when stream resumed.
   
```javascript
    function resumeListener() { /* your implementation */ }
```

- **streamListener**: Callback function which will be triggered when data streamed to Kafka. These function takes **kafkaBuffer** and **fileStream** as parameters:
    
    + **kafkaBuffer**: File stream writes data to this buffer to send data to Kafka and DataStreamer reads this buffer and sends to Kafka.
    + **fileStream**: File stream for resume, pause and close the stream.
  
```javascript
    function streamListener(kafkaBuffer,fileStream) { /* your implementation */ }
```

## Usage of DataStreamer
```javascript
var DataStreamer = require('datastreamer');
var begin = Date.now();

var vars = {
    "queue": [],
    "timestamp": begin,
    "tx_id": 1
};

var dataStreamer = new DataStreamer("paysim-config", // config file name without file extension (.json mandatory)
                                    lineListener,
                                    null,
                                    null,
                                    null,
                                    ["timestamp","tx_id"]);
                                    
function lineListener(fileStream,fieldNames,fieldValues,jsonGenerator) {
    fieldValues.push(vars["timestamp"] + vars["tx_id"]);
    fieldValues.push(vars["tx_id"]);

    var now = Date.now();
    var timestamp = vars["timestamp"] + vars["tx_id"];

    if (timestamp < now) { 
       dataStreamer.pushToKafka(jsonGenerator.generateJSON(fieldNames, fieldValues));
    } else {
        vars["queue"].push({ "timestamp": timestamp, "data": jsonGenerator.generateJSON(fieldNames,fieldValues) });
    }

    ++vars["tx_id"];
}

function checkSendingTime() {
    var currentTime = Date.now();

    for (var i = 0; i >= 0 && i < vars["queue"].length; ++i) {
        if (vars["queue"][i]["timestamp"] <= currentTime) {
            dataStreamer.pushToKafka(vars["queue"][i]["data"]);
            vars["queue"].splice(i,1);
            --i;
        }
    }

    setTimeout(checkSendingTime,1);
}

dataStreamer.startStream();
checkSendingTime();
```

## **Configuration of DataStreamer**

### Config for Kafka target 
```json
{
  "filename": "nyc-fraud.json",
  "dataSchema": "integer,string,double,string,double,double,string,double,double,integer,integer",
  "chunkSize": 1000,
  "triggerInterval": 200,
  "loggerEnabled": false,
  "target": {
    "type": "kafka",
    "config": {
	    "topic": "nyc-fraud.poc",
	    "connectionString": "zookeeper1:2181,zookeeper2:2181,zookeeper3:2181",
	    "clientId": "nyc-fraud",
	    "zkOptions": {
	      "sessionTimeout": 30000,
	      "spinDelay": 1000,
	      "retries": 10
	    }
	}
  }
}
```
### Config for HTTP target 
```json
{
  "filename": "nyc-fraud.json",
  "dataSchema": "integer,string,double,string,double,double,string,double,double,integer,integer",
  "chunkSize": 1000,
  "triggerInterval": 200,
  "loggerEnabled": false,
  "target": {
    "type": "http",
    "config": {
      "hostname": "127.0.0.1",
      "port": 12345,
      "method": "POST",
      "path": "/nyc-fraud",
      "headers": {
        "contentType": "application/json"
      }
    }   
  }
}
```

### Configuration attributes: 

- **filename**: Name or path of the data

- **dataSchema**: Data types of data's columns 

- **target**: Configuration of stream target 

- **chunkSize**: Number of datas will be written in triggerInterval

- **triggerInterval**: Period of writing data

- **loggerEnabled**: Logging flag for log to file or console

- **loggerType**: Type of logger which can be **file** or **console**

- **logFilename**: If logger type is **file**, **logFilename** will be used by logger to create a log file with name **logFilename**.
