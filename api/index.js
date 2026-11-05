/**
 * Vercel Serverless Function Entry Point for /api/*
 * Routes all API calls through the full-stack request handler
 */

const { handleRequest } = require('../server.js');

module.exports = async (req, res) => {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    console.error('Unhandled Vercel API error:', err);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: false,
      error: err.message,
      note: 'Fallback handled cleanly'
    }));
  }
};
