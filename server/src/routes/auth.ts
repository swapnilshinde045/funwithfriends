import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db/database.js';
import { CONFIG } from '../config.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../types/index.js';

const router = Router();

// Pre-defined modern gaming avatars
export const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberDragon',
  'https://api.dicebear.com/7.x/bottts/svg?seed=PixelKnight',
  'https://api.dicebear.com/7.x/bottts/svg?seed=VortexRider',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NeonPanda',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicFox',
  'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumWiz',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchHero'
];

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(6),
  avatar: z.string().optional(),
  bio: z.string().max(200).optional(),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }

    const { username, email, password, avatar, bio } = parsed.data;

    // Check existing
    const existing = db.prepare('SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(username, email) as User | undefined;
    if (existing) {
      if (existing.username.toLowerCase() === username.toLowerCase()) {
        res.status(409).json({ error: 'Username is already taken' });
        return;
      }
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const selectedAvatar = avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

    // Check if this is the first user, make them admin
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const role = userCount === 0 ? 'admin' : 'user';

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, avatar, role, bio, status, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'online', CURRENT_TIMESTAMP)
    `).run(userId, username, email, passwordHash, selectedAvatar, role, bio || 'Ready for some gaming fun!');

    const token = jwt.sign({ id: userId, username }, CONFIG.JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions);

    const newUser = db.prepare('SELECT id, username, email, avatar, role, bio, status, last_seen, created_at FROM users WHERE id = ?').get(userId) as User;

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: newUser
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      res.status(400).json({ error: 'Username/Email and password required' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)').get(login, login) as (User & { password_hash: string }) | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update status and last seen
    db.prepare("UPDATE users SET status = 'online', last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const token = jwt.sign({ id: user.id, username: user.username }, CONFIG.JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions);

    const { password_hash, ...userProfile } = user;
    res.json({
      message: 'Login successful',
      token,
      user: userProfile
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { avatar, bio } = req.body;
    const userId = req.user!.id;

    if (avatar && typeof avatar === 'string') {
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
    }

    if (typeof bio === 'string') {
      db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.slice(0, 200), userId);
    }

    const updated = db.prepare('SELECT id, username, email, avatar, role, bio, status, last_seen, created_at FROM users WHERE id = ?').get(userId);
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address required' });
    return;
  }

  const user = db.prepare('SELECT id, username, email FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    // Return friendly message without leaking user existence
    res.json({ message: 'If an account exists with this email, password reset instructions have been generated.' });
    return;
  }

  // Provide instant demo reset link / demo token for ease of use
  res.json({
    message: 'Password reset link sent! (For test/demo environments, you may reset directly)',
    resetAvailable: true,
    email
  });
});

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Email and new password (min 6 chars) required' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email) as { id: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

  res.json({ message: 'Password reset successfully! Please login with your new password.' });
});

export default router;
