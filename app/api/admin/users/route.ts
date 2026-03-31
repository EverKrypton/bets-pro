import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User               from '@/models/User';

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
          { email:    { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { myReferralCode: { $regex: search, $options: 'i' } },
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

    if (role && ['user', 'admin'].includes(role)) {
      user.role = role;
    }

    if (balanceAdjust !== undefined && !isNaN(parseFloat(balanceAdjust))) {
      const adj = parseFloat(balanceAdjust);
      user.balance = parseFloat((user.balance + adj).toFixed(6));
      // Log the adjustment as a transaction
      const { default: Transaction } = await import('@/models/Transaction');
      await Transaction.create({
        userId:   user._id,
        type:     adj >= 0 ? 'deposit' : 'withdraw',
        amount:   Math.abs(adj),
        currency: 'USDT',
        status:   'completed',
        details:  { method: 'admin_adjustment', reason: reason ?? 'Admin manual adjustment', adminId: admin._id },
      });
    }

    await user.save();
    return NextResponse.json({ success: true, user: {
      _id: user._id, email: user.email, username: user.username,
      balance: user.balance, role: user.role, myReferralCode: user.myReferralCode,
    }});
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
