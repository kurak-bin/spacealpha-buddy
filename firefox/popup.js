function sendMessage(command) {
  // Send message to content script
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { command: command });
  });
}

function clearStorage() {
  browser.storage.local.clear();
}

function setInvestmentOwner() {
  let value = document.getElementById('investmentOwner').value;
  browser.storage.local.set({investment_owner: value});
}

// Attach click event listener to the button
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('clearStorage').addEventListener('click', () => { sendMessage('clearStorage'); }); // delete local storage variables
  document.getElementById('storeEmpireInfo').addEventListener('click', () => { sendMessage('storeEmpireInfo'); }); // store report in local storage
  document.getElementById('exportResourceCsv').addEventListener('click', () => { sendMessage('exportResourceCsv'); }); // export rss info in CSV
  document.getElementById('storeInvestmentInfo').addEventListener('click', () => { sendMessage('storeInvestmentInfo'); });
  document.getElementById('exportInvestmentJson').addEventListener('click', () => { sendMessage('exportInvestmentJson'); }); // store market data in local storage
  document.getElementById('exportAllReports').addEventListener('click', () => { sendMessage('exportAllReports'); });

  document.getElementById('investmentOwner').addEventListener('input', setInvestmentOwner);
});
