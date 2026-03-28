import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://smmtest:smmtest@cluster0test.ibmrevp.mongodb.net/?appName=Cluster0test';

async function fixIndexes() {
  console.log('Connecting...');
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  try {
    const indexes = await db.collection('matches').indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    // Drop the bad eventId index if it exists
    const badIndex = indexes.find(i => i.name === 'eventId_1');
    if (badIndex) {
      await db.collection('matches').dropIndex('eventId_1');
      console.log('✓ Dropped eventId_1 index');
    } else {
      console.log('eventId_1 index not found — already clean');
    }

    // Drop apiId unique index if it exists (we handle duplicates in code)
    const apiIdIndex = indexes.find(i => i.name === 'apiId_1');
    if (apiIdIndex) {
      await db.collection('matches').dropIndex('apiId_1');
      console.log('✓ Dropped apiId_1 index');
    }

    const after = await db.collection('matches').indexes();
    console.log('Indexes after fix:', after.map(i => i.name));
  } catch (err) {
    console.error('Error:', err.message);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

fixIndexes().catch(console.error);
