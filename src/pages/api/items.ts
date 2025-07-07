// src/pages/api/items.ts
import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Wichtig: Der dbPath muss dem Pfad in deiner initdb.js entsprechen!
// Da deine initdb.js die Datei im Projekt-Root ablegt, muss dieser Pfad korrekt sein.
const dbPath = path.resolve("./src/database/database.db"); // Angepasst an deinen initdb.js Pfad

export const GET: APIRoute = async () => {
  let db = new sqlite(dbPath);
  let itemsFromDb = await db.prepare('SELECT id, name, img, type, title, date, reportedAt, categoryId, description, locationId, userId FROM Items').all();
  db.close();
  return new Response(JSON.stringify(
      {
        items: itemsFromDb,
        success: "ok",
        message: ""
      }), {
        status: 200,
      });
};

export const POST: APIRoute = async ({ request }) => {
  let item = await request.json();
  // Prüfe, ob alle notwendigen (NOT NULL) Felder vorhanden sind
  if (item.hasOwnProperty("name") && item.hasOwnProperty("type") && item.hasOwnProperty("title") && item.hasOwnProperty("reportedAt") && item.hasOwnProperty("categoryId") && item.hasOwnProperty("locationId") && item.hasOwnProperty("userId")) {
      let id = uuidv4();
      let now = dayjs().unix();
      let db = new sqlite(dbPath);
      let added = db.prepare("INSERT INTO Items (id, name, img, type, title, date, reportedAt, categoryId, description, locationId, userId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
                    .run(
                        id,
                        item.name,
                        item.img || null, // img ist optional, setze auf null wenn nicht im Request
                        item.type,
                        item.title,
                        item.date || null, // date ist optional, setze auf null wenn nicht im Request
                        item.reportedAt,
                        item.categoryId,
                        item.description || null, // description ist optional
                        item.locationId,
                        item.userId,
                        now,
                        now
                    );
      db.close();
      return new Response(JSON.stringify({
          items: added,
          success: "ok",
          message: "item added"
        }),
        {
          status : 200
        });
    } else {
      return new Response(
        JSON.stringify({
            success: "error",
            message: "attributes missing (name, type, title, reportedAt, categoryId, locationId, userId required)"
        }),{
          status : 400
        });
    }
};

export const PUT: APIRoute = async ({ request }) => {
  let item = await request.json();
  // Prüfe, ob alle notwendigen Felder (inkl. id zum Updaten) vorhanden sind
  if (item.hasOwnProperty("id") && item.hasOwnProperty("name") && item.hasOwnProperty("type") && item.hasOwnProperty("title") && item.hasOwnProperty("reportedAt") && item.hasOwnProperty("categoryId") && item.hasOwnProperty("locationId") && item.hasOwnProperty("userId")) {
      let now = dayjs().unix();
      let db = new sqlite(dbPath);
      const updates = db.prepare('UPDATE Items SET name = ?, img = ?, type = ?, title = ?, date = ?, reportedAt = ?, categoryId = ?, description = ?, locationId = ?, userId = ?, updatedAt = ? WHERE id = ?')
                     .run(
                        item.name,
                        item.img || null,
                        item.type,
                        item.title,
                        item.date || null,
                        item.reportedAt,
                        item.categoryId,
                        item.description || null,
                        item.locationId,
                        item.userId,
                        now,
                        item.id
                    );
      db.close();
      return new Response(JSON.stringify({
          items: updates,
          success: "ok",
          message: "item updated"
        }),{
          status : 200
        });
    } else {
      return new Response(
        JSON.stringify({
            success: "error",
            message: "attributes missing (id, name, type, title, reportedAt, categoryId, locationId, userId required)"
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
      const deleted = db.prepare('DELETE FROM Items WHERE id = ?').run(id);
      db.close();
      return new Response(JSON.stringify({
        itemObject: {
          items: deleted,
          success: "ok",
          message: "item deleted"
        }
      }));
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