export const prerender = false; // Ansonsten funktioniert die API mit UserID nicht

import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { createHash } from 'crypto';


const dbPath = path.resolve('./src/database/', 'database.db');
console.log(dbPath);

// Function to hash password
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * GET /api/userdb
 *   – ohne Parameter: liefert alle Users
 *   – mit Query‑Parameter ?id=<uuid>: liefert genau einen User (Erweiterung)
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const db = new sqlite(dbPath);

  try {
    if (id) {
      const user = db
        .prepare(
          'SELECT id, prename, surname, username, phone, email, profilePicture FROM Users WHERE id = ?'
        )
        .get(id);

      db.close();

      if (user) {
        return new Response(
          JSON.stringify({
            user,
            success: 'ok',
            message: 'user found',
          }),
          { status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: 'error',
            message: 'user not found',
          }),
          { status: 404 }
        );
      }
    }

    // Blueprint‑Funktionalität: alle Datensätze abrufen
    const usersFromDb = db
      .prepare(
        'SELECT id, prename, surname, username, phone, email, profilePicture FROM Users'
      )
      .all();
    db.close();

    return new Response(
      JSON.stringify({
        users: usersFromDb,
        success: 'ok',
        message: '',
      }),
      { status: 200 }
    );
  } catch (error) {
    db.close();
    return new Response(
      JSON.stringify({
        success: 'error',
        message: 'database error',
      }),
      { status: 500 }
    );
  }
};

/**
 * POST /api/userdb
 *   – erwartet prename, surname, username, password, phone, email im Body
 *     und legt einen neuen Datensatz an
 */
export const POST: APIRoute = async ({ request }) => {
  const user = await request.json();

  if (
    user.prename &&
    user.surname &&
    user.username &&
    user.password &&
    user.phone &&
    user.email
  ) {
    const id = uuidv4(); // sicherer Primärschlüssel
    const now = dayjs().unix();

    const hashedPassword = hashPassword(user.password);

    const db = new sqlite(dbPath);
    const added = db
      .prepare(
        'INSERT INTO Users (id, prename, surname, username, password, phone, email, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
      )
      .run(
        id,
        user.prename,
        user.surname,
        user.username,
        hashedPassword,
        user.phone,
        user.email,
        now,
        now
      );
    db.close();

    return new Response(
      JSON.stringify({
        users: added,
        success: 'ok',
        message: 'user added',
      }),
      { status: 200 }
    );
  }

  return new Response(
    JSON.stringify({
      success: 'error',
      message: 'attributes missing',
    }),
    { status: 400 }
  );
};

/**
 * PUT /api/userdb
 *   – erwartet id sowie alle anderen Attribute im Body
 *     und aktualisiert den Datensatz
 */
export const PUT: APIRoute = async ({ request }) => {
  const user = await request.json();

  if (
    user.id &&
    user.prename &&
    user.surname &&
    user.username &&
    user.password &&
    user.phone &&
    user.email
  ) {
    const now = dayjs().unix();
    const db = new sqlite(dbPath);

    const hashedPassword = hashPassword(user.password);

    const updated = db
      .prepare(
        'UPDATE Users SET prename = ?, surname = ?, username = ?, password = ?, phone = ?, email = ?, updatedAt = ? WHERE id = ?'
      )
      .run(
        user.prename,
        user.surname,
        user.username,
        hashedPassword,
        user.phone,
        user.email,
        now,
        user.id
      );
    db.close();

    return new Response(
      JSON.stringify({
        users: updated,
        success: 'ok',
        message: 'user updated',
      }),
      { status: 200 }
    );
  }

  return new Response(
    JSON.stringify({
      success: 'error',
      message: 'attributes missing',
    }),
    { status: 400 }
  );
};

/**
 * DELETE /api/userdb?id=<uuid>
 *   – löscht den Datensatz mit der entsprechenden id
 */
export const DELETE: APIRoute = async ({ request }) => {
  // überprüfen, ob alle Daten vorhanden sind. 
  // Die ID wird hier im Header übertragen.
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  // Falls der Parameter id nicht vorhanden ist, wird null zurück gegeben. 
  if (id !== null) {
    let db = new sqlite(dbPath);
    const deleted = db.prepare('DELETE FROM Users WHERE id = ?').run(id);
    db.close();
    return new Response(
      JSON.stringify({
        users: deleted,
        success: 'ok',
        message: 'user deleted',
      }),
      { status: 200 }
    );
  }

  return new Response(
    JSON.stringify({
      success: 'error',
      message: 'attributes missing',
    }),
    { status: 400 }
  );
};
