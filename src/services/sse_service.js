const clients = [];

function addClient(res) {
  clients.push(res);
}

function removeClient(res) {
  const i = clients.indexOf(res);
  if (i !== -1) clients.splice(i, 1);
}

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;

  clients.forEach((res) => {
    try {
      res.write(msg);
    } catch (err) {
      // connection closed
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
};