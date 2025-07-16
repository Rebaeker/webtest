// src/pages/api/items.ts
import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Add this line to prevent prerendering
export const prerender = false;

// Wichtig: Der dbPath muss dem Pfad in deiner initdb.js entsprechen!
// Da deine initdb.js die Datei im Projekt-Root ablegt, muss dieser Pfad korrekt sein.
const dbPath = path.resolve("./src/database/database.db"); // Angepasst an deinen initdb.js Pfad

// Helper function to get user from cookie
function getUserFromCookie(request: Request) {
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
    if (userCookie) {
      try {
        const userData = userCookie.split('=')[1];
        return JSON.parse(decodeURIComponent(userData));
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    }
  }
  return null;
}

export const GET: APIRoute = async ({ url }) => {
  let db = new sqlite(dbPath);
  
  // Get query parameters
  const userId = url.searchParams.get('userId');
  
  let query = 'SELECT id, name, img, type, title, date, reportedAt, categoryId, description, locationId, userId FROM Items';
  let params = [];
  
  if (userId) {
    query += ' WHERE userId = ?';
    params.push(userId);
  }
  
  query += ' ORDER BY rowid DESC';
  
  let itemsFromDb = await db.prepare(query).all(...params);
  db.close();
  
  return new Response(JSON.stringify({
    items: itemsFromDb,
    success: "ok",
    message: ""
  }), {
    status: 200,
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if user is authenticated
    const user = getUserFromCookie(request);
    if (!user) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Authentication required. Please log in to report items."
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    let item;
    let imagePath = null;
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with file upload)
      const formData = await request.formData();
      
      // Convert FormData to object
      item = {};
      for (const [key, value] of formData.entries()) {
        if (key !== 'img') {
          item[key] = value;
        }
      }
      
      // Handle file upload
      const imageFile = formData.get('img') as File;
      if (imageFile && imageFile.size > 0) {
        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
          return new Response(JSON.stringify({
            success: "error",
            message: "File must be an image"
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Validate file size (5MB limit)
        if (imageFile.size > 5 * 1024 * 1024) {
          return new Response(JSON.stringify({
            success: "error",
            message: "File size must be less than 5MB"
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.resolve('./public/uploads');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const fileExtension = path.extname(imageFile.name);
        const fileName = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        // Save file
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        await writeFile(filePath, buffer);

        // Store relative path for database
        imagePath = `/uploads/${fileName}`;
      }
      
      // Add computed fields
      item.title = item.name;
      if (item.date) {
        item.date = new Date(item.date).getTime() / 1000;
      } else {
        item.date = null;
      }
      item.reportedAt = Math.floor(Date.now() / 1000);
      item.categoryId = item.category; 
      item.locationId = item.location; 
      item.userId = user.id;
      
      // Clean up
      delete item.category;
      delete item.location;
      
    } else {
      // Handle JSON (backward compatibility)
      const bodyText = await request.text();
      if (!bodyText || bodyText.trim() === '') {
        return new Response(JSON.stringify({
          success: "error",
          message: "Request body is empty"
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        item = JSON.parse(bodyText);
      } catch (parseError) {
        return new Response(JSON.stringify({
          success: "error",
          message: "Invalid JSON in request body"
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    console.log('Parsed item:', item);
    
    // Validate required fields
    if (item.hasOwnProperty("name") && item.hasOwnProperty("type") && item.hasOwnProperty("title") && item.hasOwnProperty("reportedAt") && item.hasOwnProperty("categoryId") && item.hasOwnProperty("locationId") && item.hasOwnProperty("userId")) {
        let id = uuidv4();
        let now = dayjs().unix();
        let db = new sqlite(dbPath);
        let added = db.prepare("INSERT INTO Items (id, name, img, type, title, date, reportedAt, categoryId, description, locationId, userId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
                      .run(
                          id,
                          item.name,
                          imagePath || item.img || null,
                          item.type,
                          item.title,
                          item.date || null,
                          item.reportedAt,
                          item.categoryId,
                          item.description || null,
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
            status : 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
      } else {
        return new Response(
          JSON.stringify({
              success: "error",
              message: "attributes missing (name, type, title, reportedAt, categoryId, locationId, userId required)",
              received: Object.keys(item)
          }),{
            status : 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
      }
  } catch (error) {
    console.error('POST /api/items error:', error);
    return new Response(
      JSON.stringify({
        success: "error",
        message: "Internal server error: " + error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
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