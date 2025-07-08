import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Wichtig: Der dbPath muss dem Pfad in deiner initdb.js entsprechen!
// Da deine initdb.js die Datei im Projekt-Root ablegt, muss dieser Pfad korrekt sein.
const dbPath = path.resolve("./src/database/", 'database.db'); // Angepasst an deinen initdb.js Pfad

export const GET: APIRoute = async () => {
  let db = new sqlite(dbPath);
  let locationsFromDb = await db.prepare('SELECT id, name FROM Locations').all();
  console.log("locationsFromDb", locationsFromDb);
  db.close();
  return new Response(JSON.stringify(
      {
        locations: locationsFromDb,
        success: "ok",
        message: ""
      }), {
        status: 200,
      });
};

export const POST: APIRoute = async ({ request }) => {
  let location = await request.json();
  if (location.hasOwnProperty("name")) {
      let id = uuidv4();
      let now = dayjs().unix();
      let db = new sqlite(dbPath);
      let added = db.prepare("INSERT INTO Locations (id, name, createdAt, updatedAt) VALUES (?,?,?,?)")
                    .run(id, location.name, now, now);
      db.close();
      return new Response(JSON.stringify({
          locations: added,
          success: "ok",
          message: "location added"
        }),
        {
          status : 200
        });
    } else {
      return new Response(
        JSON.stringify({
            success: "error",
            message: "attributes missing (name required)"
        }),{
          status : 400
        });
    }
};

export const PUT: APIRoute = async ({ request }) => {
  let location = await request.json();
  if (location.hasOwnProperty("id") && location.hasOwnProperty("name")) {
      let now = dayjs().unix();
      let db = new sqlite(dbPath);
      const updates = db.prepare('UPDATE Locations SET name = ?, updatedAt = ? WHERE id = ?')
                     .run(location.name, now, location.id);
      db.close();
      return new Response(JSON.stringify({
          locations: updates,
          success: "ok",
          message: "location updated"
        }),{
          status : 200
        });
    } else {
      return new Response(
        JSON.stringify({
            success: "error",
            message: "attributes missing (id, name required)"
        }),{
          status : 400
        });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id !== null) {
      let db = new sqlite(dbPath);
      const deleted = db.prepare('DELETE FROM Locations WHERE id = ?').run(id);
      db.close();
      return new Response(JSON.stringify({
        locationObject: {
          locations: deleted,
          success: "ok",
          message: "location deleted"
        }
      }))
    } else {
      return new Response(
        JSON.stringify({
            success: "error",
            message: "id parameter missing"
        }),{
          status : 400
        });
    }
};