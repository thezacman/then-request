'use strict';

var assert = require('assert');
var test = require('testit');
var Promise = require('promise');
var createServer = require('./mock-server');
var mockDOM = require('./mock-dom');

test('./lib/handle-qs.js', function () {
  var handleQs = require('../lib/handle-qs.js').default;

  assert(handleQs('http://example.com/', {}) === 'http://example.com/');
  assert(handleQs('http://example.com/?foo=bar', {}) === 'http://example.com/?foo=bar');
  assert(handleQs('http://example.com/', {foo: 'bar'}) === 'http://example.com/?foo=bar');
  assert(handleQs('http://example.com/', {foo: {bar: 'baz'}}) === 'http://example.com/?foo%5Bbar%5D=baz');
  assert(handleQs('http://example.com/', {foo: 'bar', bing: 'bong'}) === 'http://example.com/?foo=bar&bing=bong');
  assert(handleQs('http://example.com/?foo=bar', {bing: 'bong'}) === 'http://example.com/?foo=bar&bing=bong');
  assert(handleQs('http://example.com/?foo=bar#ding', {bing: 'bong'}) === 'http://example.com/?foo=bar&bing=bong#ding');
});

var server = createServer();

function testEnv(env) {
  var request, FormData;
  test(env + ' - GET', function () {
    request = require(env === 'browser' ? '../lib/browser.js' : '../');
    FormData = request.FormData;
    return request('GET', 'http://localhost:3000').then(function (res) {
      assert(res.statusCode === 200);
      assert(res.headers['foo'] === 'bar');
      assert(res.body.toString() === 'body');
    });
  });
  test(env + ' - GET query', function () {
    return request('GET', 'http://localhost:3000', {qs: {foo: 'baz'}}).then(function (res) {
      assert(res.statusCode === 200);
      assert(res.headers['foo'] === 'baz');
      assert(res.body.toString() === 'body');
    });
  });
  test(env + ' - GET -> .getBody("utf8")', function () {
    return request('GET', 'http://localhost:3000').getBody('utf8').then(function (body) {
      assert(body === 'body');
    });
  });
  test(env + ' - POST json', function () {
    return request('POST', 'http://localhost:3000', {json: {foo: 'baz'}}).then(function (res) {
      assert(res.statusCode === 200);
      assert(res.body.toString() === 'json body');
    });
  });
  test(env + ' - POST form', function () {
    const fd = new FormData();
    fd.append('foo', 'baz');
    return request('POST', 'http://localhost:3000/form', {form: fd}).then(function (res) {
      assert(res.statusCode === 200);
      assert(res.body.toString() === 'form body');
    });
  });


  test(env + ' - invalid method', function () {
    return request({}, 'http://localhost:3000').then(function (res) {
      throw new Error('Expected an error');
    }, function (err) {
      assert(err instanceof TypeError);
    });
  });
  test(env + ' - invalid url', function () {
    return request('GET', {}).then(function (res) {
      throw new Error('Expected an error');
    }, function (err) {
      assert(err instanceof TypeError);
    });
  });
  test(env + ' - invalid options', function () {
    return request('GET', 'http://localhost:3000', 'options').then(function (res) {
      throw new Error('Expected an error');
    }, function (err) {
      assert(err instanceof TypeError);
    });
  });
}

if (!process.env.CI || /^v8/.test(process.version)) {
  test('enable dom', () => mockDOM.enable());
  testEnv('browser');
  test('disable dom', () => mockDOM.enable());
}
testEnv('server');

test('close mock server', () => {
  server.close();
});