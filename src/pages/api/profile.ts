import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export const prerender = false;

const dbPath = path.resolve("./src/database/database.db");

// Helper function to get user from cookie
function getUserFromCookie(request: Request) {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
  if (!userCookie) return null;
  
  try {
    const userData = userCookie.split('=')[1];
    return JSON.parse(decodeURIComponent(userData));
  } catch {
    return null;
  }
}

// Update profile information
export const PUT: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromCookie(request);
    if (!user) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Authentication required"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { userId, prename, surname, phone } = await request.json();

    // Verify user can only update their own profile
    if (user.id !== userId) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Unauthorized"
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = new sqlite(dbPath);
    
    // Update user profile
    const updateResult = db.prepare(`
      UPDATE Users 
      SET prename = ?, surname = ?, phone = ? 
      WHERE id = ?
    `).run(prename, surname, phone, userId);

    db.close();

    if (updateResult.changes > 0) {
      return new Response(JSON.stringify({
        success: "ok",
        message: "Profile updated successfully"
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
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({
      success: "error",
      message: "Internal server error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Upload profile picture
export const POST: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromCookie(request);
    if (!user) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Authentication required"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = request.headers.get('content-type');
    
    if (!contentType?.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Invalid content type"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const profilePicture = formData.get('profilePicture') as File;

    // Verify user can only update their own profile
    if (user.id !== userId) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Unauthorized"
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!profilePicture || profilePicture.size === 0) {
      return new Response(JSON.stringify({
        success: "error",
        message: "No profile picture provided"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // File size validation (5MB limit)
    if (profilePicture.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({
        success: "error",
        message: "File too large. Maximum size: 5MB"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // File type validation
    if (!profilePicture.type.startsWith('image/')) {
      return new Response(JSON.stringify({
        success: "error",
        message: "Invalid file type. Please upload an image."
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename
    const fileExtension = profilePicture.name.split('.').pop();
    const filename = `profile_${uuidv4()}.${fileExtension}`;
    const uploadsDir = path.resolve('./public/uploads/profiles');
    const filePath = path.join(uploadsDir, filename);

    // Ensure uploads directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const buffer = await profilePicture.arrayBuffer();
    await writeFile(filePath, new Uint8Array(buffer));

    // Update database
    const profilePictureUrl = `/uploads/profiles/${filename}`;
    const db = new sqlite(dbPath);
    
    const updateResult = db.prepare(`
      UPDATE Users 
      SET profilePicture = ? 
      WHERE id = ?
    `).run(profilePictureUrl, userId);

    db.close();

    if (updateResult.changes > 0) {
      return new Response(JSON.stringify({
        success: "ok",
        message: "Profile picture updated successfully",
        profilePictureUrl: profilePictureUrl
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
    console.error('Profile picture upload error:', error);
    return new Response(JSON.stringify({
      success: "error",
      message: "Internal server error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};