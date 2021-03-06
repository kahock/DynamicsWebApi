﻿var http = require('http');
var https = require('https');
var url = require('url');
var dateReviver = require('./helpers/dateReviver');
var parseResponseHeaders = require('./helpers/parseResponseHeaders');

/**
 * Sends a request to given URL with given parameters
 *
 * @param {string} method - Method of the request.
 * @param {string} uri - Request URI.
 * @param {Function} successCallback - A callback called on success of the request.
 * @param {Function} errorCallback - A callback called when a request failed.
 * @param {string} [data] - Data to send in the request.
 * @param {Object} [additionalHeaders] - Additional headers. IMPORTANT! This object does not contain default headers needed for every request.
 */
var httpRequest = function (method, uri, data, additionalHeaders, successCallback, errorCallback) {
    var headers = {
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    };

    if (data) {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = data.length;
    }

    //set additional headers
    if (additionalHeaders != null) {
        for (var key in additionalHeaders) {
            headers[key] = additionalHeaders[key];
        }
    }

    var parsedUrl = url.parse(uri);
    var isHttp = parsedUrl.protocol === 'http:';

    var options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: method,
        headers: headers,
        //agent: agent,
        //auth: auth
    };

    var interface = isHttp ? http : https;

    var request = interface.request(options, function (res) {
        var rawData = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            rawData += chunk;
        })
        res.on('end', function () {
            switch (res.statusCode) {
                case 200: // Success with content returned in response body.
                case 201: // Success with content returned in response body.
                case 204: // Success with no content returned in response body.
                case 304: {// Success with Not Modified
                    var responseData = null;
                    if (rawData.length) {
                        responseData = JSON.parse(rawData, dateReviver);
                    }

                    var response = {
                        data: responseData,
                        headers: res.headers,
                        status: res.statusCode
                    };

                    successCallback(response);
                    break;
                }
                default: // All other statuses are error cases.
                    var error;
                    try {
                        error = JSON.parse(rawData).error;
                    } catch (e) {
                        error = new Error("Unexpected Error");
                    }
                    error.status = res.statusCode;
                    errorCallback(error);
                    break;
            }
        });
    });

    request.on('error', function (error) {
        errorCallback(error);
    });

    if (data) {
        request.write(data);
    }

    request.end();
};

module.exports = httpRequest;