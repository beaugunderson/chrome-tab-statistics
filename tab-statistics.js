/*global chrome:true, PouchDB:true*/

'use strict';

var db = new PouchDB('tabs');
var events = new PouchDB('events');

// var remoteDb = new PouchDB('http://beaugunderson.com:5984/beau-tabs');

// db.replicate.to(remoteDb, {
//   live: true,
//   retry: true
// }).on('change', function (change) {
//   console.log('change happened', change);
// }).on('error', function (err) {
//   console.log('replication error', err);
// });

function addUpdate(windows, tabs, breakdown) {
  chrome.runtime.getPlatformInfo(function (info) {
    var updateTime = new Date().valueOf();

    var update = {
      _id: String(updateTime),
      time: updateTime,
      tag: info.os + '-' + (localStorage.tag || 'unknown'),
      windows: windows,
      tabs: tabs,
      breakdown: breakdown
    };

    db.put(update);
  });
}

function storeTabCount() {
  chrome.windows.getAll({populate: true}, function (windows) {
    var total = 0;
    var breakdown = {};
    var windowKey;

    for (windowKey in windows) {
      if (!windows.hasOwnProperty(windowKey)) {
        return;
      }

      breakdown[windowKey] = windows[windowKey].tabs.length;

      total += windows[windowKey].tabs.length;
    }

    addUpdate(windows.length, total, breakdown);
  });
}

function addEvent(type) {
  return function () {
    chrome.runtime.getPlatformInfo(function (info) {
      var updateTime = new Date().valueOf();

      var update = {
        _id: String(updateTime),
        time: updateTime,
        tag: info.os + '-' + (localStorage.tag || 'unknown'),
        type: type
      };

      events.put(update);
    });
  };
}

chrome.alarms.create('store-tab-count', {periodInMinutes: 5});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== 'store-tab-count') {
    return;
  }

  storeTabCount();
});

chrome.tabs.onActivated.addListener(addEvent('tab-activated'));
chrome.tabs.onAttached.addListener(addEvent('tab-attached'));
chrome.tabs.onCreated.addListener(addEvent('tab-created'));
chrome.tabs.onDetached.addListener(addEvent('tab-detached'));
chrome.tabs.onMoved.addListener(addEvent('tab-moved'));
chrome.tabs.onRemoved.addListener(addEvent('tab-removed'));

chrome.windows.onCreated.addListener(addEvent('window-created'));
chrome.windows.onRemoved.addListener(addEvent('window-removed'));
chrome.windows.onFocusChanged.addListener(addEvent('window-focus-changed'));

chrome.tabs.onCreated.addListener(storeTabCount);
chrome.tabs.onRemoved.addListener(storeTabCount);

chrome.windows.onCreated.addListener(storeTabCount);
chrome.windows.onRemoved.addListener(storeTabCount);
