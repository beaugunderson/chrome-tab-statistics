/*global chrome:true, PouchDB:true*/

'use strict';

function sync() {
  console.log('starting replication...');

  var BASE_URL = localStorage.baseUrl;

  var USERNAME = localStorage.username;
  var PASSWORD = localStorage.password;

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

  var tabs = new PouchDB('tabs');
  var events = new PouchDB('events');

  remoteTabs.login(USERNAME, PASSWORD, ajaxOptions).then(function () {
    tabs.replicate.to(remoteTabs, {
      retry: true
    }).on('complete', function () {
      console.log('sync complete');
    }).on('error', function (replicationError) {
      console.log('replication error', replicationError);
    });
  }).catch(function (loginError) {
    console.log('login error', loginError);
  });

  remoteEvents.login(USERNAME, PASSWORD, ajaxOptions).then(function () {
    events.replicate.to(remoteEvents, {
      retry: true
    }).on('complete', function () {
      console.log('sync complete');
    }).on('error', function (replicationError) {
      console.log('replication error', replicationError);
    });
  }).catch(function (loginError) {
    console.log('login error', loginError);
  });
}

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

    var tabs = new PouchDB('tabs');

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

      var events = new PouchDB('events');

      events.put(update);
    });
  };
}

chrome.alarms.create('store-tab-count', {periodInMinutes: 5});
chrome.alarms.create('sync-remote-couchdb', {periodInMinutes: 30});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'store-tab-count') {
    storeTabCount();
  } else if (alarm.name === 'sync-remote-couchdb') {
    sync();
  }
});

// chrome.runtime.onStartup.addListener(startup);
// chrome.runtime.onInstalled.addListener(startup);

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
