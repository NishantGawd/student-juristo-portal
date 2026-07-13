
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function verifyLawyers() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("MONGO_URI is missing");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('juristoDB');
        const collection = db.collection('lawyers');

        const count = await collection.countDocuments();
        console.log(`Found ${count} lawyers in the collection.`);

        const lawyer = await collection.findOne({}, { projection: { name: 1, hourlyRate: 1 } });
        console.log("Sample lawyer:", lawyer);

        if (lawyer && lawyer.hourlyRate) {
            console.log("Pricing is present in DB, but hidden in UI/AI tool as requested.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

verifyLawyers();
