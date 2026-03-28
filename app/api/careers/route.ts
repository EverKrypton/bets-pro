import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Application      from '@/models/Application';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const {
      name, email, telegram, instagram, tiktok,
      twitter, youtube, totalFollowers, description, motivation,
    } = await req.json();

    if (!name || !email || !description || !motivation) {
      return NextResponse.json({ error: 'Name, email, description and motivation are required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const app = await Application.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      telegram:       telegram?.trim()       || '',
      instagram:      instagram?.trim()      || '',
      tiktok:         tiktok?.trim()         || '',
      twitter:        twitter?.trim()        || '',
      youtube:        youtube?.trim()        || '',
      totalFollowers: totalFollowers?.trim() || '',
      description:    description.trim(),
      motivation:     motivation.trim(),
    });

    return NextResponse.json({ success: true, id: app._id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
