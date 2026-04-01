import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User               from '@/models/User';
import Transaction        from '@/models/Transaction';

const VALID_ROLES = ['user', 'mod', 'recruiter', 'admin'] as const;
type Role = typeof VALID_ROLES[number];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() ?? '';
    const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit  = 20;

    const query = search
      ? { $or: [
          { email:           { $regex: escapeRegex(search), $options: 'i' } },
          { username:        { $regex: escapeRegex(search), $options: 'i' } },
          { myReferralCode:  { $regex: escapeRegex(search), $options: 'i' } },
        ]}
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('_id email username balance role myReferralCode depositAddress createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { userId, role, balanceAdjust, reason } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (role && VALID_ROLES.includes(role as Role)) {
      user.role = role as Role;
    }

    if (balanceAdjust !== undefined && balanceAdjust !== '' && !isNaN(parseFloat(balanceAdjust))) {
      const adj = parseFloat(balanceAdjust);
      if (adj === 0) {
        return NextResponse.json({ error: 'Balance adjustment cannot be 0' }, { status: 400 });
      }
      // Prevent negative balance
      const newBalance = parseFloat((user.balance + adj).toFixed(6));
      if (newBalance < 0) {
        return NextResponse.json({ error: `Cannot deduct more than user's balance (${user.balance.toFixed(2)} USDT)` }, { status: 400 });
      }
      user.balance = newBalance;
      await Transaction.create({
        userId:   user._id,
        type:     adj > 0 ? 'deposit' : 'withdraw',
        amount:   Math.abs(adj),
        currency: 'USDT',
        status:   'completed',
        details:  { method: 'admin_adjustment', reason: reason?.trim() || 'Admin manual adjustment', adminId: admin._id },
      });
    }

    await user.save();
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id, email: user.email, username: user.username,
        balance: user.balance, role: user.role, myReferralCode: user.myReferralCode,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
