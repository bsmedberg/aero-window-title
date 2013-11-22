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

var gSheetURIs = [
  self.data.url("window.css")
];
switch (system.platform) {
  case "winnt":
    gSheetURIs.push(self.data.url("window-win.css"));
    break;
  case "darwin":
    gSheetURIs.push(self.data.url("window-mac.css"));
    break;
}

function doUnloadInWindow(window) {
  try {
    let chromeWin = getChromeWindow(window);
    let chromeDoc = chromeWin.document;

    for (let uri of gSheetURIs) {
      stylesheet_utils.removeSheet(chromeWin, uri);
    }

    let t = chromeDoc.getElementById("AeroTitleToolbar");
    let tt = chromeDoc.getElementById("TabsToolbar");

    for (let child of Array.prototype.slice.call(t.childNodes, 0)) {
      if (child.classList.contains("titlebar-placeholder")) {
        tt.appendChild(child);
      }
    }

    chromeDoc.getElementById("navigator-toolbox").removeChild(t);
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

  for (let uri of gSheetURIs) {
    stylesheet_utils.loadSheet(chromeWin, uri);
  }
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
  s.setAttribute("id", "AeroTitleSpacer");
  t.appendChild(s);

  chromeDoc.getElementById("navigator-toolbox")
    .insertBefore(t, chromeDoc.getElementById("TabsToolbar"));

  // Take the placeholders out of TabsToolbar and move them to our bar. Ordering
  // doesn't matter because box ordinals rearrange them
  // Iterating a live mutating list doesn't work. Save it first.
  let children = Array.prototype.slice.call(chromeDoc.getElementById("TabsToolbar").childNodes, 0);
  for (let child of children) {
    if (child.classList.contains("titlebar-placeholder")) {
      t.appendChild(child);
    }
  }

  let els = Cc["@mozilla.org/eventlistenerservice;1"]
    .getService(Ci.nsIEventListenerService);
  let lastListener = els.getEventTargetChainFor(chromeWin).pop();

  if (system.platform == "darwin") {
    var myHeight = chromeWin.getComputedStyle(t).height;
    chromeDoc.getElementById("titlebar").style.paddingBottom = myHeight;
    t.style.marginTop = '-' + myHeight;
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
