import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';

export const prerender = false;

const dbPath = path.resolve("./src/database/database.db");

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get('id');
  
  if (!userId) {
    return new Response(JSON.stringify({
      success: "error",
      message: "User ID required"
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = new sqlite(dbPath);
    const user = db.prepare('SELECT email, prename, surname FROM Users WHERE id = ?').get(userId);
    db.close();

    if (user) {
      return new Response(JSON.stringify({
        success: "ok",
        user: user
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: "error",
        message: "User not found"
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: "error",
      message: "Database error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};