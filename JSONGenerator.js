function JSONGenerator(dataSchema) {
    this.dataTypes = dataSchema.split(',');    
}

JSONGenerator.prototype.generateJSON = function(fieldNames,fieldValues) {
    var jsonData = { };

    for (var i = 0; i < fieldValues.length; ++i) {
        fieldValues[i] = this.convertTo(fieldValues[i],this.dataTypes[i]);
        jsonData[fieldNames[i]] = fieldValues[i];
    }

    return JSON.stringify(jsonData);
}

JSONGenerator.prototype.convertTo = function(fieldValue,dataType) {
    if (dataType == "integer") {
        return parseInt(fieldValue);
    } else if (dataType == "double") {
        return parseFloat(fieldValue);
    } else if (dataType == "date") {
        return new Date(fieldValue).getTime();
    } else {
        return fieldValue;
    }
}

module.exports = JSONGenerator;
