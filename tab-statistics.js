/*global chrome:true, PouchDB:true*/

'use strict';

var BASE_URL = localStorage.baseUrl;

var USERNAME = localStorage.username;
var PASSWORD = localStorage.password;

var tabs = new PouchDB('tabs');
var events = new PouchDB('events');

var pouchOptions = {skipSetup: true};

var remoteTabs = new PouchDB(BASE_URL + '/' + USERNAME + '-tabs', pouchOptions);
var remoteEvents = new PouchDB(BASE_URL + '/' + USERNAME + '-events',
  pouchOptions);

var ajaxOptions = {
  ajax: {
    headers: {
      Authorization: 'Basic ' + window.btoa(USERNAME + ':' + PASSWORD)
    }
  }
};

remoteTabs.login(USERNAME, PASSWORD, ajaxOptions).then(function () {
  tabs.replicate.to(remoteTabs, {
    live: true,
    retry: true
  // }).on('change', function (change) {
  //   console.log('change happened', change);
  }).on('error', function (replicationError) {
    console.log('replication error', replicationError);
  });
}).catch(function (loginError) {
  console.log('login error', loginError);
});

remoteEvents.login(USERNAME, PASSWORD, ajaxOptions)
  .then(function () {
    events.replicate.to(remoteEvents, {
      live: true,
      retry: true
    // }).on('change', function (change) {
    //   console.log('change happened', change);
    }).on('error', function (replicationError) {
      console.log('replication error', replicationError);
    });
  }).catch(function (loginError) {
    console.log('login error', loginError);
  });

function addUpdate(windowCount, tabCount, breakdown) {
  chrome.runtime.getPlatformInfo(function (info) {
    var updateTime = new Date().valueOf();

    var update = {
      _id: String(updateTime),
      time: updateTime,
      tag: info.os + '-' + (localStorage.tag || 'unknown'),
      windows: windowCount,
      tabs: tabCount,
      breakdown: breakdown
    };

    tabs.put(update);
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
