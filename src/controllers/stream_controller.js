const sse = require('../services/sse_service');

exports.stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  sse.addClient(res);

  req.on('close', () => {
    sse.removeClient(res);
  });
};