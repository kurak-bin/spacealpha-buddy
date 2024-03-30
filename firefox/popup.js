function sendMessage(command) {
  // Send message to content script to find tables
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { command: command });
  });
}

function clearStorage() {
  browser.storage.local.remove('empire_data');
}

// Attach click event listener to the button
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('clearStorage').addEventListener('click', clearStorage); // delete local storage variables

  document.getElementById('storeEmpireInfo').addEventListener('click', () => { sendMessage('storeEmpireInfo') }); // store report in local storage
  document.getElementById('exportResourceCsv').addEventListener('click', () => { sendMessage('exportResourceCsv') }); // export rss info in CSV
  document.getElementById('exportResourceJson').addEventListener('click', () => { sendMessage('exportResourceJson') }); // export rss info in JSON
  document.getElementById('exportUnitCsv').addEventListener('click', () => { sendMessage('exportUnitCsv') });
  document.getElementById('exportUnitJson').addEventListener('click', () => { sendMessage('exportUnitJson') });
  document.getElementById('exportAllReports').addEventListener('click', () => { sendMessage('exportAllReports') });
});
