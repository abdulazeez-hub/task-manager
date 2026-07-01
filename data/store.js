const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

// Simple write queue so overlapping requests can't corrupt the JSON file
// (fine for a single-process local app; not meant for multi-instance deployments).
let writeChain = Promise.resolve();

async function readTasks() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeTasks(tasks) {
  writeChain = writeChain.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
  );
  return writeChain;
}

module.exports = { readTasks, writeTasks };
