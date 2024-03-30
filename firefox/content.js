// Inventory headers, I'm too lazy to get them otherwise
const rss_table_keys = ['credits', 'iron', 'coal', 'steel', 'tritium', 'gold'];

const planets_data = {
    "resources": [],
    "units": []
}

const rss_data = {
    "name": "",
    "credits": [],
    "iron": [],
    "coal": [],
    "steel": [],
    "tritium": [],
    "gold": []
}

const units_format = {
    "name": "",
    "untrained": 0,
    "slaves": 0,
    "industrial workers": 0,
    "commercial workers": 0,
    "mine workers": 0,
    "mine slaves": 0,
    "farmers": 0,
    "doctors": 0,
    "scientists": 0,
    "engineers": 0,
    "assassins": 0,
    "spies": 0,
    "security officers": 0,
    "defensive soldiers": 0,
    "defensive corporals": 0,
    "defensive majors": 0,
    "defensive champions": 0,
    "attack soldiers": 0,
    "attack corporals": 0,
    "attack majors": 0,
    "attack champions": 0,
    "teachers": 0,
    "professors": 0,
    "tacticians": 0,
    "foresters": 0,
    "factory workers": 0
}

let empire_data = null;

function combineAmountText(element) {
    if (element.children.length === 0) {
        if (element.innerText != '+') {
            return element.innerText.trim();
        }
    }

    let combined_val = '';

    for (let child of element.children) {
        combined_val += combineAmountText(child);
    }

    return combined_val;
}

function createJSONDict(keys, values) {
    const dictionary = {};
    for (let i = 0; i < keys.length; i++) {
        dictionary[keys[i]] = values[i];
    }
    return dictionary;
}

// Function to find and return all table elements in the DOM
function findAllPlanets() {
    return Array.from(document.querySelector('empire-page').querySelector('table').children).slice(1);
}
  
// Function to handle the click event on the popup button
function extractEmpireInfo() {
    // Find all table elements
    const planets = findAllPlanets();

    const rss_report = [];
    const units_report = [];

    planets.forEach((planet) => {
        let planet_addr = planet.querySelector('span.clickable').innerText;
        let planet_tables = planet.querySelectorAll('table');

        let units_data = structuredClone(units_format);
        
        let rss_table = planet_tables[0];
        let units = planet.querySelectorAll('[style*="float: left; width: 55px; height: 65px; margin-bottom: 5px;"]');

        rss_data['name'] = planet_addr;
        units_data['name'] = planet_addr;

        // go thru planet inventory table
        for (let i = 1; i < rss_table.rows.length; i++) {
            for (let j = 0; j < rss_table.rows[i].cells.length; j++) {
                let resource = rss_table_keys[j];

                let cell = rss_table.rows[i].cells[j];
                let combined_val = combineAmountText(cell);

                rss_data[resource][i-1] = symbolToNumber(combined_val);
            }
        }

        if (units.length > 0) {
            // go thru planet units
            for (let i = 0; i < units.length; i++) {
                let unit_type = units[i].firstChild.firstChild.firstChild.innerText.toLowerCase();
                let unit_amt = symbolToNumber(units[i].querySelector('amount').firstChild.innerText);
                units_data[unit_type] = unit_amt;
            }
            units_report.push(units_data);
        }

        rss_report.push(structuredClone(rss_data));
    })
    planets_data["resources"] = [rss_report, createTimestamp()];
    if (units_report.length > 0) planets_data["units"] = [units_report, createTimestamp()]; // include only if unit info is present
}

function symbolToNumber(value) {
    value = value.replace(',','').toLowerCase();

    let value_parts = value.split(' ');
    let multipler = 1;
    if (value_parts.length < 2) {
        return parseFloat(value_parts[0]);
    }
    switch (value_parts[1]) {
        case 'm':
            multipler = 10**6;
            break;
        case 'b':
            multipler = 10**9;
            break;
        case 't':
            multipler = 10**12;
            break;
        case 'quadrillion':
            multipler = 10**15;
            break;
        case 'quintillion':
            multipler = 10**18;
            break;
        case 'sextillion':
            multipler = 10**21;
            break;
        case 'septillion':
            multipler = 10**24;
            break;
        default:
            throw new Error('Unidentified multipler for value found! Value is ', value);
    }
    return parseFloat(value_parts[0]) * multipler;
}

function createTimestamp() {
    return new Date().toLocaleString();
}

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector))
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    })
}

function convertToCsv(report_arr, type) {
    let report_csv = "";

    report_csv += report_arr[1]; // add timestamp
    if (type === 'resources') {
        report_arr[0].forEach((planet) => {
        for (let key in planet) {
            if (key !== 'name') {
                report_csv += ',' + planet[key][0]; // inventory
                report_csv += ',' + planet[key][1]; // produced per tick
            } else {
                report_csv += ',' + planet[key];
            }
        }
        report_csv += ',';
        })
    }
    else if (type === 'units') { // bad code because bad code is easy
        report_arr[0].forEach((planet) => {
        for (let key in planet) {
            report_csv += ',' + planet[key];
        }
        report_csv += ',';
        })
    }
  
    return report_csv;
  }

function exportSingleReport(topic, format) {
    if (planets_data !== null) {
        let topic_data;
        if (topic === 'resources') {
            topic_data = planets_data['resources'];
        } else if (topic === 'units') {
            topic_data = planets_data['units'];
            console.log(topic_data);
        }

        if (format === 'csv') topic_data = convertToCsv(topic_data, topic)
        else if (format === 'json') topic_data = JSON.stringify(topic_data);
        navigator.clipboard.writeText(topic_data);
    }
}

function exportAllData() {
    if (empire_data !== null) {
        navigator.clipboard.writeText( JSON.stringify(empire_data) );
    } else {
        alert("SpaceAlpha-Buddy: Please store data before exporting all reports");
    }
}

async function loadLocalData(key) {
    let data = await browser.storage.local.get(key);
    console.log(data);

    if (Object.keys(data).length === 0) return null;
    else return data[key];
}

async function storeEmpireInfo() {
    empire_data = await loadLocalData('empire_data');

    if (empire_data === null) empire_data = [];

    empire_data.push(planets_data);
    browser.storage.local.set({empire_data: empire_data});
}

browser.runtime.onMessage.addListener((message) => {
    switch (message.command) {
        case 'storeEmpireInfo':
            extractEmpireInfo();
            storeEmpireInfo();
            break;
        case 'deleteStorage':
            deleteStorage();
            break;
        case 'exportResourceCsv':
            extractEmpireInfo();
            exportSingleReport('resources', 'csv');
            break;
        case 'exportResourceJson':
            extractEmpireInfo();
            exportSingleReport('resources', 'json');
            break;
        case 'exportUnitCsv':
            extractEmpireInfo();
            exportSingleReport('units', 'csv');
            break;
        case 'exportUnitJson':
            extractEmpireInfo();
            exportSingleReport('units', 'json');
            break;
        case 'exportAllReports': // Get all JSON data stored in local storage
            exportAllData();
            break;
    }
});
