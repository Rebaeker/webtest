import type { APIRoute } from 'astro';
import sqlite from 'better-sqlite3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

export const prerender = false;

const dbPath = path.resolve("./src/database/database.db");

// Login endpoint
export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, email, password, prename, surname, phone } = await request.json();
    
    const db = new sqlite(dbPath);
    
    if (action === 'login') {
      // Login logic
      const user = db.prepare('SELECT id, prename, surname, email FROM Users WHERE email = ? AND password = ?')
                    .get(email, password);
      
      if (user) {
        db.close();
        return new Response(JSON.stringify({
          success: 'ok',
          user: user,
          message: 'Login successful'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `user=${JSON.stringify(user)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`
          }
        });
      } else {
        db.close();
        return new Response(JSON.stringify({
          success: 'error',
          message: 'Invalid email or password'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
    } else if (action === 'signup') {
      // Signup logic
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM Users WHERE email = ?').get(email);
      
      if (existingUser) {
        db.close();
        return new Response(JSON.stringify({
          success: 'error',
          message: 'User with this email already exists'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Create new user
      const id = uuidv4();
      const now = dayjs().unix();
      
      const result = db.prepare(`
        INSERT INTO Users (id, prename, surname, username, password, phone, email, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, prename, surname, email, password, phone, email, now, now);
      
      const newUser = {
        id: id,
        prename: prename,
        surname: surname,
        email: email
      };
      
      db.close();
      
      return new Response(JSON.stringify({
        success: 'ok',
        user: newUser,
        message: 'User created successfully'
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `user=${JSON.stringify(newUser)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`
        }
      });
    }
    
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({
      success: 'error',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Logout endpoint
export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: 'ok',
    message: 'Logged out successfully'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'user=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'
    }
  });
};

// Check auth status
export const GET: APIRoute = async ({ request }) => {
  try {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
      if (userCookie) {
        const userData = userCookie.split('=')[1];
        const user = JSON.parse(decodeURIComponent(userData));
        return new Response(JSON.stringify({
          success: 'ok',
          user: user,
          isAuthenticated: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: 'ok',
      isAuthenticated: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: 'error',
      isAuthenticated: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};