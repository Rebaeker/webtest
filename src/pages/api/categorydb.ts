import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';


const dbPath = path.resolve("./src/database/", 'database.db');
console.log(dbPath);

export const GET: APIRoute = async ({ params, request }) => {
  let db = new sqlite(dbPath);
  let categoriesFromDb = await db.prepare('SELECT id, name FROM Categories').all();
  console.log("categorysFromDb", categoriesFromDb);
  db.close();
  // da dies quasi immer klappt, brauchen wir keinen Fehler zurück geben.
  // Es wird ein Objekt zurück gegeben, dass  
  return new Response(JSON.stringify(
      {
        categories: categoriesFromDb, 
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
  let category = await request.json();
  console.log("category", category);
  if ( category.hasOwnProperty("name")) {
      // Der neue Datensatz hat noch keinen Primärschlüssel, diesen erzeugen wir 
      // als UUID. Diese sind viel sicherer als Integerzahlen, die bei jedem Eintrag erhöht werden
      // da Hacker es viel schwerer haben, die UUID zu erraten. 
      let id = uuidv4();
      let now = dayjs().unix(); 
      let db = new sqlite(dbPath);
      
      let added = db.prepare("INSERT INTO Categories (id, name, createdAt, updatedAt) VALUES (?,?,?,?)")
                    .run(id, category.name, now, now);
      db.close();
      return new Response(JSON.stringify({
          // der hinzugefügte Datensatz wird noch mitgeschickt. 
          categories: added, 
          success: "ok",
          message: "category added"
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
  let category = await request.json();
  console.log(category)
  if ( category.hasOwnProperty("id")
    && category.hasOwnProperty("name")) {
      let now = dayjs().unix(); 
      let db = new sqlite(dbPath);
      const updates = db.prepare('UPDATE Categories SET name = ?, updatedAt = ? WHERE id = ?')
                     .run(category.name, now, category.id); 
      db.close();
      return new Response(JSON.stringify({
          // der hinzugefügte Datensatz wird noch mitgeschickt. 
          categories: updates, 
          success: "ok",
          errorMessage: "category updated"
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
      const deleted = db.prepare('DELETE FROM Categories WHERE id = ?').run(id);
      db.close();
      return new Response(JSON.stringify({
        categoryObject: {
          categories: deleted, 
          success: "ok",
          message: "category deleted"
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

