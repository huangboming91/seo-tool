import { NextResponse } from 'next/server';
import { getUserFromRequest, ensureDb } from '@/lib/auth';

export async function GET(request) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const module = searchParams.get('module');

  const db = await ensureDb();
  let query = 'SELECT * FROM audit_logs';
  const params = [];

  if (module) {
    query += ' WHERE module = ?';
    params.push(module);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = await db.prepare(query).all(...params);
  const totalRow = await db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
  const total = totalRow ? Number(totalRow.count) : 0;

  return NextResponse.json({ logs, total });
}
