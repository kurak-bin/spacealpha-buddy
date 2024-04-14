// Fair warning, all this code is despicable but I'm not getting paid for it

// Inventory headers, I'm too lazy to get them otherwise
const rss_table_keys = ["credits", "iron", "coal", "steel", "tritium", "gold"];

const planets_data = {
  resources: [],
  units: [],
};

const rss_data = {
  name: "",
  credits: [],
  iron: [],
  coal: [],
  steel: [],
  tritium: [],
  gold: [],
};

let investment_data = {};
let investment_name = "";

const units_format = {
  name: "",
  untrained: 0,
  slaves: 0,
  "industrial workers": 0,
  "commercial workers": 0,
  "mine workers": 0,
  "mine slaves": 0,
  farmers: 0,
  doctors: 0,
  scientists: 0,
  engineers: 0,
  assassins: 0,
  spies: 0,
  "security officers": 0,
  "defensive soldiers": 0,
  "defensive corporals": 0,
  "defensive majors": 0,
  "defensive champions": 0,
  "attack soldiers": 0,
  "attack corporals": 0,
  "attack majors": 0,
  "attack champions": 0,
  teachers: 0,
  professors: 0,
  tacticians: 0,
  foresters: 0,
  "factory workers": 0,
};

let empire_data = null;
let current_url = "";

function copyText(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

function combineAmountText(element) {
  if (element.children.length === 0) {
    if (element.innerText != "+") {
      return element.innerText.trim();
    }
  }

  let combined_val = "";

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
  return Array.from(
    document.querySelector("empire-page").querySelector("table").children
  ).slice(1);
}

// Function to handle the click event on the popup button
function extractEmpireInfo() {
  // Find all table elements
  const planets = findAllPlanets();

  const rss_report = [];
  const units_report = [];

  planets.forEach((planet) => {
    let planet_addr = planet.querySelector("span.clickable").innerText;
    let planet_tables = planet.querySelectorAll("table");

    let units_data = structuredClone(units_format);

    let rss_table = planet_tables[0];
    let units = planet.querySelectorAll(
      '[style*="float: left; width: 55px; height: 65px; margin-bottom: 5px;"]'
    );

    rss_data["name"] = planet_addr;
    units_data["name"] = planet_addr;

    // go thru planet inventory table
    for (let i = 1; i < rss_table.rows.length; i++) {
      for (let j = 0; j < rss_table.rows[i].cells.length; j++) {
        let resource = rss_table_keys[j];

        let cell = rss_table.rows[i].cells[j];
        let combined_val = combineAmountText(cell);

        rss_data[resource][i - 1] = symbolToNumber(combined_val);
      }
    }

    if (units.length > 0) {
      // go thru planet units
      for (let i = 0; i < units.length; i++) {
        let unit_type =
          units[i].firstChild.firstChild.firstChild.innerText.toLowerCase();
        let unit_amt = symbolToNumber(
          units[i].querySelector("amount").firstChild.innerText
        );
        units_data[unit_type] = unit_amt;
      }
      units_report.push(units_data);
    }

    rss_report.push(structuredClone(rss_data));
  });
  planets_data["resources"] = [rss_report, createTimestamp()];
  if (units_report.length > 0)
    planets_data["units"] = [units_report, createTimestamp()]; // include only if unit info is present
}

async function calculatePlayerShares(investmentData) {
  // Object to store total shares and stake of each player
  const playerShares = {};
  let totalShares = 0;

  let investment_owner = await loadLocalData("investment_owner");
  playerShares[investment_owner] = {totalShares: 990, totalInvested: 0};
  playerShares["#SYSTEM#"] = {totalShares: 10, totalInvested: 0};

  // Calculate total shares across all players
  investmentData.forEach(entry => {
    let type = 1;
    if (entry.order_type === 'sell') { type = -1; }
    totalShares += entry.shares * type;
  });
  totalShares += 990 + 10;

  // Iterate through each investment entry
  investmentData.forEach(entry => {
      let { player, shares, share_price, order_type } = entry;

      if (order_type === 'sell') shares *= -1;

      // Update player's total shares
      if (player in playerShares) {
          playerShares[player].totalShares += shares;
          playerShares[player].totalInvested += shares * share_price;
      } else {
          playerShares[player] = { totalShares: shares, totalInvested: shares * share_price };
      }
  });

  // Convert playerShares object to an array of [player, data] pairs
  const playerSharesArray = Object.entries(playerShares);

  // Sort playerSharesArray in descending order based on total invested
  playerSharesArray.sort((a, b) => b[1].totalInvested - a[1].totalInvested);

  let output = "";

  // Print player data in descending order of investment
  playerSharesArray.forEach(([player, data]) => {
      const shares = data.totalShares;
      const percentage = (shares / totalShares) * 100;
      output += `${player}: ${shares} shares (${percentage.toFixed(2)}%) | ${data.totalInvested.toExponential(2)}\n\n`
  });
  output += `Total shares: ${totalShares}`

  copyText(output);
}

function isWithinOneMinute(time1, time2) {
    // Parse time strings into Date objects
    const date1 = new Date(`2000-01-01T${time1}`);
    const date2 = new Date(`2000-01-01T${time2}`);

    // Calculate the difference in milliseconds
    const difference = Math.abs(date1 - date2);

    // Check if the difference is less than or equal to 1 minute
    return difference <= 61 * 1000;
}

async function extractInvestmentInfo() {
  let popup = document.querySelector("investment-popup");
  let name = popup.querySelector(".cdk-drag-handle.popupTitle").innerText;
  let investment_table = popup.querySelector("investment-trades").firstChild;
  let rows = investment_table.querySelectorAll("tr .ng-star-inserted");

  investment_name = name;

  if (!(name in investment_data)) investment_data[name] = [];

  let investment = investment_data[name];
  let last_entry = null;
  if (investment.length > 0) {
    last_entry = investment[investment.length - 1];
  }
  console.log("Last Entry:", last_entry);

  let new_entries = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    let buy_data = row.children[0].firstChild;
    let player = buy_data.textContent.trim().slice(0, -4);
    let order_type;
    if (buy_data.textContent.trim().slice(-3) === "<<<") {
      order_type = "buy";
    } else {
      order_type = "sell";
    }
    let shares = buy_data.nextSibling.nextSibling.textContent.trim();
    let share_price = row.children[1].firstChild.innerText.trim();
    let rel_time_bought = row.children[2].innerText; // convert to absolute

    shares = symbolToNumber(shares);
    share_price = symbolToNumber(share_price);

    let [abs_time, hour_accurate] = relativeToAbsTime(rel_time_bought); // .toLocaleString();
    let abs_date = `${abs_time.getMonth() + 1}/${abs_time.getDate()}/${abs_time.getFullYear()}`;
    let date_time;
    if (hour_accurate) date_time = createUTCTimestamp(abs_time);
    else date_time = null;

    // check if duplicate data
    //(last_entry["time"] === null || date_time === null || isWithinOneMinute(last_entry["time"], date_time)))
    if (
      last_entry !== null &&
      last_entry["player"] === player &&
      last_entry["shares"] === shares &&
      last_entry["share_price"] === share_price &&
      last_entry["order_type"] === order_type &&
      last_entry["date"] === abs_date
    ) {
      break;
    } else {
      new_entries.push({
        player: player,
        shares: shares,
        share_price: share_price,
        order_type: order_type,
        date: abs_date,
        time: date_time,
      });
      console.log("new entry by", player);
    }
  }
  for (let i = new_entries.length - 1; i >= 0; i--) {
    investment_data[name].push(new_entries[i]);
  }
  console.log(investment_data);
}

function relativeToAbsTime(time_text) {
  let rel_time_ms;
  let hour_accurate = true;
  if (time_text.includes("seconds")) {
    rel_time_ms = parseInt(time_text.split(" ")[0]) * 1000;
    if (rel_time_ms === 0) hour_accurate = false; // not reliable at 0 seconds
  } else if (time_text.includes("minutes")) {
    time_text = time_text.split(" ")[0].split(":");
    rel_time_ms = (parseInt(time_text[0]) * 60 + parseInt(time_text[1])) * 1000;
  } else if (time_text.includes("hours")) {
    time_text = time_text.split(" ")[0].split(":");
    let hours = parseInt(time_text[0]);
    let minutes = parseInt(time_text[1]);
    rel_time_ms = (hours * 60 + minutes) * 60 * 1000;
  } else if (time_text.includes("days")) {
    rel_time_ms = parseInt(time_text.split(" ")[0]) * 24 * 60 * 60 * 1000;
    hour_accurate = false;
  }
  return [new Date(new Date() - rel_time_ms), hour_accurate];
}

function symbolToNumber(value) {
  value = value.replace(",", "").toLowerCase();

  let value_parts = value.split(" ");
  let multipler = 1;
  if (value_parts.length < 2) {
    return parseFloat(value_parts[0]);
  }
  switch (value_parts[1]) {
    case "m":
      multipler = 10 ** 6;
      break;
    case "b":
      multipler = 10 ** 9;
      break;
    case "t":
      multipler = 10 ** 12;
      break;
    case "quadrillion":
      multipler = 10 ** 15;
      break;
    case "quintillion":
      multipler = 10 ** 18;
      break;
    case "sextillion":
      multipler = 10 ** 21;
      break;
    case "septillion":
      multipler = 10 ** 24;
      break;
    default:
      throw new Error(
        "Unidentified multipler for value found! Value is ",
        value
      );
  }
  return parseFloat(value_parts[0]) * multipler;
}

// I will combine these timestamps at a later date...
function getFormattedTimestamp() {
  const now = new Date();

  // Extract date components
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Month is zero-based, so add 1
  const year = now.getFullYear();

  // Extract time components
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");

  // Construct formatted timestamp
  const timestamp = `${month}-${day}-${year}_${hours}-${minutes}`;

  return timestamp;
}
function createTimestamp() {
  return new Date().toLocaleString();
}

function createUTCTimestamp(now) {
  const hours = now.getUTCHours().toString().padStart(2, "0");
  const minutes = now.getUTCMinutes().toString().padStart(2, "0");
  const seconds = now.getUTCSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function waitForElm(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function convertToCsv(report_arr, type) {
  let report_csv = "";

  report_csv += report_arr[1]; // add timestamp
  if (type === "resources") {
    report_arr[0].forEach((planet) => {
      for (let key in planet) {
        if (key !== "name") {
          report_csv += "," + planet[key][0]; // inventory
          report_csv += "," + planet[key][1]; // produced per tick
        } else {
          report_csv += "," + planet[key];
        }
      }
      report_csv += ",";
    });
  } else if (type === "units") {
    // this is not good code, do not use as an example
    report_arr[0].forEach((planet) => {
      for (let key in planet) {
        report_csv += "," + planet[key];
      }
      report_csv += ",";
    });
  }

  return report_csv;
}

function exportInvestmentJson() {
  const json = JSON.stringify(investment_data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("download", "investment-report_" + getFormattedTimestamp());
  link.setAttribute("href", url);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportSingleReport(topic, format) {
  if (planets_data !== null) {
    let topic_data;
    if (topic === "resources") {
      topic_data = planets_data["resources"];
    } else if (topic === "units") {
      topic_data = planets_data["units"];
      console.log(topic_data);
    }

    if (format === "csv") topic_data = convertToCsv(topic_data, topic);
    else if (format === "json") topic_data = JSON.stringify(topic_data); // unlikely it will ever be desired
    copyText(topic_data);
  }
}

function exportAllData() { // todo: change this to downloading thru blob
  if (empire_data !== null) {
    copyText(JSON.stringify(empire_data));
  } else {
    alert("SpaceAlpha-Buddy: Please store data before exporting all reports");
  }
}

async function loadLocalData(key) {
  let data = await chrome.storage.local.get(key);

  if (Object.keys(data).length === 0) return null;
  else return data[key];
}

async function storeData(key, data) {
  let stored_data = await loadLocalData(key);

  if (stored_data === null) stored_data = [];

  stored_data = data;
  chrome.storage.local.set({ [key]: stored_data });
}

async function storeEmpireInfo() {
  empire_data = await loadLocalData("empire_data");

  if (empire_data === null) empire_data = [];

  empire_data.push(planets_data);
  chrome.storage.local.set({ empire_data: empire_data });
}

function checkForPageChange() {
  if (window.location.href != current_url) {
    current_url = window.location.href;
    setTimeout(onLoad, page_load_delay);
  }
}

function clearStorage() {
  chrome.storage.local.clear();
  investment_data = {};
}

chrome.runtime.onMessage.addListener((message) => {
    switch (message.command) {
      case "clearStorage":
        clearStorage();
        break;
  
      case "storeEmpireInfo":
        extractEmpireInfo();
        storeEmpireInfo();
        // storeData('empire_data', empire_data);
        break;
      case "exportResourceCsv":
        extractEmpireInfo();
        exportSingleReport("resources", "csv");
        break;
      case "storeInvestmentInfo":
        extractInvestmentInfo();
        storeData("investment_data", investment_data);
        calculatePlayerShares(investment_data[investment_name]);
        break;
      case "exportInvestmentJson":
        exportInvestmentJson();
        break;
      case "storeMarketInfo":
        break;
  
      case "exportAllReports": // Get all JSON data stored in local storage
        exportAllData();
        break;
    }
  });
  
  // load data
  (async () => {
    let data = await loadLocalData("investment_data");
    console.log(investment_data);
    investment_data = data || {};
    console.log(investment_data);
  })();
  
