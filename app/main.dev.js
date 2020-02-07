/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import fs from "fs";
import path from "path";

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});


ipcMain.on('minimizeWindow',()=>{
  mainWindow.minimize();
});

ipcMain.on('closeWindow',()=>{
  mainWindow.close();
});

const json = require("./storage/data.json");

ipcMain.on('fetchDataRequest',(event, args) => {
  const url = path.join(__dirname, 'storage/data.json');
  fs.readFile( url, "utf8",  (err, data)  => {
    if (err) throw err;
    const obj = JSON.parse(data);
    event.returnValue = obj;
  });
});

ipcMain.on('deleteData',(event,args) => {
  const url = path.join(__dirname, 'storage/data.json');
  fs.readFile( url, "utf8",  (err, data)  => {
    if (err) throw err;
    let obj = JSON.parse(data);
    obj.splice(args, 1);
    fs.writeFileSync(url, JSON.stringify(obj)); 
  });
});

ipcMain.on('addData',(event,args) => {
  const url = path.join(__dirname, 'storage/data.json');
  fs.readFile( url, "utf8",  (err, data)  => {
    if (err) throw err;
    let obj = JSON.parse(data);
    obj.push(args);
    fs.writeFileSync(url, JSON.stringify(obj)); 
  });
});