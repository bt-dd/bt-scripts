var banyan = (function () {
    //--private: anything resued in public functions, or specific to Postman
    var _nullCheck = function (object, fieldName) {
		return object !== undefined && _.has(object, fieldName);
	}
	var _getTestingVariable = function(variableName) {
		return postman.getEnvironmentVariable(variableName);
	}
	var _setTestingVariable = function(variableName, variableValue) {
		postman.setEnvironmentVariable(variableName, variableValue);
	}
	var _setTestResult = function(name, value) {
		tests[name] = value;
		return value;
	}
	var _getResponseHeader = function(name) {
		return postman.getResponseHeader(name);
	}
	var _setNextRequest = function(request) {
		postman.setNextRequest(request);
	}
	
	//--extension functions
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.replace(new RegExp(search.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), replacement);
	};

	//--public: general functions, which can be used for any JS testing
    return {
		//--testing helpers
		check :{
			numberExists: function(object, fieldName)
			{
				banyan.setTestResult(fieldName, _nullCheck(object, fieldName) && _.get(object, fieldName).toNumber() > 0, "is a number");
			},	
			numbersExist: function(object, fieldNames) {
				_.forEach(fieldNames, function(fieldName) {
					banyan.check.numberExists(object, fieldName);
				});
			},
			fieldExists: function(object, fieldName)
			{
				banyan.setTestResult(fieldName, _nullCheck(object, fieldName), "field was found");
			},
			fieldsExist: function(object, fieldNames) {
				_.forEach(fieldNames, function(fieldName) {
					banyan.check.fieldExists(object, fieldName);
				});
			},
			fieldsExistForEach: function(object, types, fieldNames) {
				_.forEach(types, function(type) {
					banyan.check.fieldsExist(object,
					fieldNames.map(function(name) {
						return type + "." + name;
					}));
				});
			},
			fieldMatchesValue: function(object, fieldName, value) {
				banyan.setTestResult(fieldName, _nullCheck(object, fieldName) && _.get(object, fieldName) == value, "equals '" + value + "'");
			},
			fieldMatchesVariable: function(object, fieldName, testVariableName) {
				banyan.setTestResult(testVariableName, _nullCheck(object, fieldName) && _.get(object, fieldName) == _getTestingVariable(testVariableName), "equals '" + _getTestingVariable(testVariableName) + "'");
			},
			fieldMatchesVariableString: function(object, fieldName, testVariableName) {
				banyan.setTestResult(testVariableName, _nullCheck(object, fieldName) && _.get(object, fieldName) + "" === _getTestingVariable(testVariableName) + "", "equals '" + _getTestingVariable(testVariableName) + "'");
			}
		},
		setTestResult: function(name, value, detail) {
			var testName = name;
			//--if test name is (probably) an object field
			if(testName.includes('.') && !testName.includes(' ')) {
				testName = testName.replaceAll('.', ' > ');
			}
			
			if(detail !== undefined && detail != '') {
				testName += ' : ' + detail;
			}	
			
			return _setTestResult(testName.titleize(), value);
		},
		stopAllTests: function() {
			_setNextRequest(null);
		},
		setNextRequest: function(request) {
			_setNextRequest(request);
		},
		//--public accessors
		getTestingVariable: _getTestingVariable,
		setTestingVariable: _setTestingVariable,
		getResponseHeader: _getResponseHeader
    }
})();

var banyanWebServices = (function () {
	//--private
	
	//--public
	return {
		parseResponse: function(responseBody, responseCode, endpointName)
		{
			var parsedResult = '';
			if(responseCode.code === 200) {
				banyan.setTestResult("Status code is 200", true);

				if(banyan.getResponseHeader("Content-Type").includes("text/xml"))
				{
					banyan.setTestResult("Content-Type is XML", true);
					var response = xml2Json(responseBody)["soap:Envelope"]["soap:Body"];
					if(response !== undefined)
					{
						banyan.setTestResult("Response Found", true);
						if(response["soap:Fault"] === undefined)
						{
							var result = response[endpointName + "Response"][endpointName + "Result"];
							if(result !== undefined && (result.ErrorMessage === undefined || result.ErrorMessage === '') && (result.Error === undefined || result.Error === ''))
							{
								banyan.setTestResult("Result Found", true);
								parsedResult = result;
							}
							else
							{
								if(result.Error !== undefined && result.Error.Message !== undefined)
								{
									banyan.setTestResult(result.Error.Message, false);
								}
								else if(result.ErrorMessage !== undefined)
								{								
									banyan.setTestResult(result.ErrorMessage, false);
								}
							}
						}
						else
						{
							banyan.setTestResult("SOAP Fault Encountered", false);
						}
					}
					else
					{
						banyan.setTestResult("Response Found", false);
					}
				}
				else
				{
					banyan.setTestResult("Content-Type is XML", false);
				}
			}
			else 
			{
				banyan.setTestResult("Status code is 200", false);
			}
			
			return parsedResult;
		}
	}	
})();