"use strict";

const self = require("sdk/self");
const windows = require("sdk/windows");
const stylesheet_utils = require("sdk/stylesheet/utils");
const simple_prefs = require("sdk/simple-prefs");
const window_namespace = require("sdk/window/namespace");
const {Cc, Ci} = require("chrome");
const system = require("sdk/system");

// Cribbed from sdk/windows/firefox.js
function getChromeWindow(window) {
  return window_namespace.windowNS(window).window;
}

const kSheetURI = self.data.url("window.css");

function doUnloadInWindow(window) {
  try {
    let chromeWin = getChromeWindow(window);
    let chromeDoc = chromeWin.document;
    stylesheet_utils.removeSheet(chromeWin, kSheetURI);

    chromeDoc.getElementById("TabsToolbar")
      .appendChild(chromeDoc.getElementById("titlebar-placeholder-on-TabsToolbar-for-captions-buttons"));
    chromeDoc.getElementById("navigator-toolbox")
      .removeChild(chromeDoc.getElementById("AeroTitleToolbar"));

    if (system.platform == "darwin") {
      chromeDoc.getElementById("titlebar").style.paddingBottom = '0';
    }
  }
  catch (e) { }
}

function doUnload() {
  console.log("doUnload");
  for (let window of windows.browserWindows) {
    doUnloadInWindow(window);
  }
}

function doLoadInWindow(window) {
  let chromeWin = getChromeWindow(window);
  let chromeDoc = chromeWin.document;

  stylesheet_utils.loadSheet(chromeWin, kSheetURI);
  let t = chromeDoc.createElement("hbox");
  t.setAttribute("id", "AeroTitleToolbar");

  let d = chromeDoc.createElement("description");
  d.setAttribute("id", "AeroTitleDescription");
  d.setAttribute("flex", "1");
  d.setAttribute("crop", "center");
  d.setAttribute("mousethrough", "always");
  d.setAttribute("skipintoolbarset", "true");
  d.setAttribute("value", " ");
  t.appendChild(d);

  let s = chromeDoc.createElement("spacer");
  s.setAttribute("flex", "999");
  t.appendChild(s);

  chromeDoc.getElementById("navigator-toolbox")
    .insertBefore(t, chromeDoc.getElementById("TabsToolbar"));
  t.appendChild(chromeDoc.getElementById("titlebar-placeholder-on-TabsToolbar-for-captions-buttons"));

  let els = Cc["@mozilla.org/eventlistenerservice;1"]
    .getService(Ci.nsIEventListenerService);
  let lastListener = els.getEventTargetChainFor(chromeWin).pop();

  if (system.platform == "darwin") {
    var myHeight = chromeWin.getComputedStyle(t).height;
    console.log("Setting titlebar height", myHeight);
    chromeDoc.getElementById("titlebar").style.paddingBottom = myHeight;
  }

  function updateTitle() {
    d.setAttribute("value", chromeDoc.title);
  }
  lastListener.addEventListener("DOMTitleChanged", updateTitle, false);
  updateTitle();
}

function doLoad() {
  try {
  console.log("doLoad");

  for (let window of windows.browserWindows) {
    doLoadInWindow(window);
  }
  }
  catch (e) {
    console.log(e.toString(), e.stack);
  }
}

exports.main = function() {
  console.log("main");
  doLoad();
  windows.browserWindows.on("open", doLoadInWindow);
};

exports.onUnload = doUnload;
