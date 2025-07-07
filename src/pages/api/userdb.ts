import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';


const dbPath = path.resolve("./src/database/", 'database.db');
console.log(dbPath);

export const GET: APIRoute = async ({ params, request }) => {
  let db = new sqlite(dbPath);
  let usersFromDb = await db.prepare('SELECT id, prename, surname, username, password, phone, email FROM Users').all();
  console.log("usersFromDb", usersFromDb);
  db.close();
  // da dies quasi immer klappt, brauchen wir keinen Fehler zurück geben.
  // Es wird ein Objekt zurück gegeben, dass  
  return new Response(JSON.stringify(
      {
        users: usersFromDb, 
        success: "ok",
        message: ""
      }), {
        // wir zeigen damit an, dass die Anfrage fehlerfrei war. 
        status: 200,
      })
}

export const POST: APIRoute = async ({ params, request }) => {
  // request.json ist eine Funktion, die Astro bereitstellt. 
  // Die Daten im Body (JSON-String) werden in ein JS-Objekt umgewandelt.
  let user = await request.json();
  console.log("user", user);
  if ( user.hasOwnProperty("prename")
    && user.hasOwnProperty("surname")
    && user.hasOwnProperty("username")
    && user.hasOwnProperty("password")
    && user.hasOwnProperty("phone")
    && user.hasOwnProperty("email")) {
      // Der neue Datensatz hat noch keinen Primärschlüssel, diesen erzeugen wir 
      // als UUID. Diese sind viel sicherer als Integerzahlen, die bei jedem Eintrag erhöht werden
      // da Hacker es viel schwerer haben, die UUID zu erraten. 
      let id = uuidv4();
      let now = dayjs().unix(); 
      let db = new sqlite(dbPath);
      
      let added = db.prepare("INSERT INTO Users (id, prename, surname, username, password, phone, email, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)")
                    .run(id, user.prename, user.surname, user.username, user.password, user.phone, user.email, now, now);
      db.close();
      return new Response(JSON.stringify({
          // der hinzugefügte Datensatz wird noch mitgeschickt. 
          users: added, 
          success: "ok",
          message: "user added"
        }),         
        {
          // Hat geklappt. 
          status : 200
        })
    } else {
      return new Response(
        JSON.stringify({   
            success: "error",
            message: "attributes missing"
        }),{
          // Ein Attribut hat gefehlt. Darum Fehlercode 400
          status : 400
        })
    }
}

export const PUT: APIRoute = async ({ params, request }) => {
  // überprüfen, ob alle Daten vorhanden sind. 
  // Die Daten werden in dem Body übertragen. 
  // Diese Daten im Body lassen sich durch umwandeln 
  // des JSON Strings 
  let user = await request.json();
  console.log(user)
  if ( user.hasOwnProperty("id")
    && user.hasOwnProperty("prename")
    && user.hasOwnProperty("surname")
    && user.hasOwnProperty("username")
    && user.hasOwnProperty("password")
    && user.hasOwnProperty("phone")
    && user.hasOwnProperty("email")) {
      let now = dayjs().unix(); 
      let db = new sqlite(dbPath);
      const updates = db.prepare('UPDATE Users SET prename = ?, surname = ?, username = ?, password = ?, phone = ?, email = ?, updatedAt = ? WHERE id = ?')
                     .run(user.prename, user.surname, user.username, user.password, user.phone, user.email, now, user.id); 
      db.close();
      return new Response(JSON.stringify({
          // der hinzugefügte Datensatz wird noch mitgeschickt. 
          users: updates, 
          success: "ok",
          errorMessage: "user updated"
        }),{
          // Hat funktioniert -> Status 200 
          status : 200
        })
    } else {
      return new Response(
        JSON.stringify({   
            success: "error",
            message: "attributes missing"
        }),{
          // Fehler-Fall gibt Status 400 zurück. 
          status : 400
        })
    }
}

export const DELETE: APIRoute = async ({ request }) => {
  // überprüfen, ob alle Daten vorhanden sind. 
  // Die ID wird hier im Header übertragen.
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  // Falls der Parameter id nicht vorhanden ist, wird null zurück gegeben. 
  if (id !== null) {
      let db = new sqlite(dbPath);
      // Die Zeile mit der ID löschen mit DELETE
      const deleted = db.prepare('DELETE FROM Users WHERE id = ?').run(id);
      db.close();
      return new Response(JSON.stringify({
        userObject: {
          users: deleted, 
          success: "ok",
          message: "user deleted"
        }
      }))
    } else {
      return new Response(
        JSON.stringify({   
            success: "error",
            message: "attributes missing"
        }),{
          // Fehler-Fall gibt Status 400 zurück. 
          status : 400
        })
    }
}

