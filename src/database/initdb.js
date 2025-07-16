import sqlite from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.resolve("./src/database", "database.db");
console.log(dbPath);

// Die Datei muss ausgeführt werden, um die Datenbank zu initialisieren 
// Dies erfolgt im Terminal mit npx node .\initdb.js
// Es wird gefragt ob Node installiert werden soll --> y eingeben. Dann sollte die Datei laufen. 
function initDb() {
  let db = new sqlite(dbPath , sqlite.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    verbose: console.log
  });

  // Mit Create Table wird die Tabelle angelegt, wenn diese noch nicht existiert. 
  // ACHTUNG: Wenn die Tabelle schon angelegt wurde, dann wird diese nicht mehr gelöscht. 
  //          Heißt, eine wiederholte Ausführung der Funktion ändert die Datenbank nicht. 
  //          Wenn die Tabelle mal angelegt ist, muss diese mit Alter Table erweitert werden.  

  //unique bei user name, da jeder nur einmal vergeben werden kann, bei mail auch, da jede mail nur für einen account registriert werden kann
  let resultUser = db.exec(`CREATE TABLE IF NOT EXISTS Users ( 
    'id' TEXT NOT NULL PRIMARY KEY, 
    'prename' TEXT NOT NULL DEFAULT '', 
    'surname' TEXT NOT NULL DEFAULT '', 
    'username' TEXT NOT NULL UNIQUE,
    'password' TEXT NOT NULL, 
    'phone' TEXT, 
    'email' TEXT NOT NULL UNIQUE,
    'createdAt' INT NOT NULL DEFAULT 0, 
    'updatedAt' INT NOT NULL DEFAULT 0),
    'profilePicture' TEXT DEFAULT NULL`);
    console.log(resultUser);
    //  Hier wird ie Neue Column username hinzugefügt. 
  //  let addPerson = db.exec("ALTER TABLE Persons ADD COLUMN username TEXT NOT NULL DEFAULT ''");
  //  console.log(addPerson);

  /*let resultItem = db.exec(`CREATE TABLE IF NOT EXISTS Items ( 
      'id' TEXT NOT NULL PRIMARY KEY, 
      'name' TEXT NOT NULL DEFAULT '', 
      'description' TEXT NOT NULL DEFAULT '', 
      'serial' TEXT NOT NULL DEFAULT '', 
      'img' TEXT NOT NULL DEFAULT '', 
      'createdAt' INT NOT NULL DEFAULT 0, 
      'updatedAt' INT NOT NULL DEFAULT 0)`);
  console.log(resultItem);*/
  
  let resultCategory = db.exec(`CREATE TABLE IF NOT EXISTS categories ( 
    'id' TEXT NOT NULL PRIMARY KEY, 
    'name' TEXT NOT NULL UNIQUE, 
    'createdAt' INT NOT NULL DEFAULT 0, 
    'updatedAt' INT NOT NULL DEFAULT 0)`);
  console.log(resultCategory);

  const defaultCategories = ['Schlüssel', 'Elektronik', 'Kleidung', 'Dokumente', 'Schmuck', 'Sonstiges'];
  defaultCategories.forEach((cat) => {
    db.prepare(`
      INSERT OR IGNORE INTO Categories (id, name, createdAt, updatedAt)
      VALUES (lower(hex(randomblob(16))), ?, strftime('%s','now'), strftime('%s','now'))
    `).run(cat);
  });

  // ----------------------- Dummy-User anlegen -----------------------
  // Damit die Fremdschlüssel-Prüfung bei Items nicht fehlschlägt
  // (userId = 'dummy-user-id-123')
  // ------------------------------------------------------------
  db.prepare(`
    INSERT OR IGNORE INTO Users (id, prename, surname, username, password, phone, email, createdAt, updatedAt)
    VALUES ('dummy-user-id-123', 'Demo', 'User', 'demo', 'password', '', 'demo@example.com',
            strftime('%s','now'), strftime('%s','now'))
  `).run();

//  Hier wird ie Neue Column password hinzugefügt. 
   // let addPerson = db.exec("ALTER TABLE Persons ADD COLUMN password TEXT NOT NULL DEFAULT ''");
   // console.log(addPerson);
//  Hier wird ie Neue Column admin hinzugefügt. 
   /*let addPerson = db.exec("ALTER TABLE Persons ADD COLUMN admin INT NOT NULL DEFAULT 0");
   console.log(addPerson);*/


  // --- LOCATIONS ---

  // Tabelle für Locations erstellen/ Die 'id' ist der Primärschlüssel, 'name' muss vorhanden sein
  let resultLocations = db.exec(`
  CREATE TABLE IF NOT EXISTS Locations (
    'id' TEXT NOT NULL PRIMARY KEY,
    'name' TEXT NOT NULL UNIQUE,
    'createdAt' INTEGER NOT NULL DEFAULT 0,
    'updatedAt' INTEGER NOT NULL DEFAULT 0)`);
  console.log("Locations Table Result:", resultLocations);
  const defaultLocations = ['Bibliothek', 'Mensa', 'Hauptgebäude', 'Sportzentrum', 'Parkplatz', 'Sonstiges'];
  defaultLocations.forEach((loc) => {
    db.prepare(`
      INSERT OR IGNORE INTO Locations (id, name, createdAt, updatedAt)
      VALUES (lower(hex(randomblob(16))), ?, strftime('%s','now'), strftime('%s','now'))
    `).run(loc);
  });

// --- ITEMS ---
let resultItems = db.exec(`
    CREATE TABLE IF NOT EXISTS Items (
      'id' TEXT NOT NULL PRIMARY KEY,
      'name' TEXT NOT NULL,
      'img' TEXT, -- Optionaler Bildpfad
      'type' TEXT NOT NULL, -- 'isLost' oder 'isFound'
      'title' TEXT NOT NULL,
      'date' INTEGER,        -- Wann gefunden/verloren (Unix Timestamp, optional)
      'reportedAt' INTEGER NOT NULL, -- Wann gemeldet (Unix Timestamp)
      'categoryId' TEXT, -- Fremdschlüssel zu Categories
      'description' TEXT, -- Optional
      'locationId' TEXT, -- Fremdschlüssel zu Locations
      'userId' TEXT,     -- Fremdschlüssel zu Users
      'createdAt' INTEGER NOT NULL DEFAULT 0,
      'updatedAt' INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY ('categoryId') REFERENCES Categories('id'),
      FOREIGN KEY ('locationId') REFERENCES Locations('id'),
      FOREIGN KEY ('userId') REFERENCES Users('id')
    );
  `);
  console.log("Items Table Result:", resultItems);

  db.close();
}

initDb();