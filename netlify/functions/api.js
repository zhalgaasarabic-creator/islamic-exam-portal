const serverless = require('serverless-http');
const app = require('../../server.js');

const expressHandler = serverless(app);

const FUNCTION_PREFIX = '/.netlify/functions/api';

// netlify.toml redirects "/api/*" here as "/.netlify/functions/api/:splat";
// restore the "/api" prefix the Express app's routes expect before delegating.
exports.handler = async (event, context) => {
  if (event.path && event.path.startsWith(FUNCTION_PREFIX)) {
    event.path = '/api' + event.path.slice(FUNCTION_PREFIX.length);
  }
  return expressHandler(event, context);
};
