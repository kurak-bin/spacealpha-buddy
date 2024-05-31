function handleInvestmentJson(file) {
    var reader = new FileReader();
    
    reader.onload = function(event) {
        var contents = event.target.result;
        var jsonData = JSON.parse(contents); // Parse JSON content
        chrome.storage.local.set({investment_data: jsonData});
    };
    
    reader.readAsText(file[0]); // Read file as text
}

document.getElementById('loadInvestmentJson').addEventListener('dragover', (e) => { e.preventDefault() });
document.getElementById('loadInvestmentJson').addEventListener('drop', (e) => {
  e.preventDefault();
  var files = e.dataTransfer.files;
  handleInvestmentJson(files);
});