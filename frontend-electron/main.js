const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const REACT_URL = 'http://localhost:5173';
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Chat',
    backgroundColor: '#e7ebf0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Меню убираем для чистого вида (как у Telegram)
  Menu.setApplicationMenu(null);

  win.loadURL(REACT_URL);

  if (isDev) {
    // В dev-режиме открываем DevTools
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});