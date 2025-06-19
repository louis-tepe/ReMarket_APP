import dbConnect from '@/lib/mongodb/dbConnect';
import ScrapingProduct from '@/lib/mongodb/models/ScrapingProduct';
import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import UserModel from '@/lib/mongodb/models/User';
import CartModel from '@/lib/mongodb/models/CartModel';
import OrderModel from '@/lib/mongodb/models/OrderModel';
import CategoryModel from '@/lib/mongodb/models/CategoryModel';
import BrandModel from '@/lib/mongodb/models/BrandModel';
import ChatSession from '@/lib/mongodb/models/ChatSession';
import mongoose, { Model } from 'mongoose';

interface ModelsMap {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: Model<any>;
}

const modelsToPurge: ModelsMap = {
    'ScrapingProducts': ScrapingProduct,
    'ProductOffers': ProductOfferModel,
    'Users': UserModel,
    'Carts': CartModel,
    'Orders': OrderModel,
    'Categories': CategoryModel,
    'Brands': BrandModel,
    'ChatSessions': ChatSession,
};

async function purgeDatabase() {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected.');

    for (const [name, model] of Object.entries(modelsToPurge)) {
        try {
            const count = await model.countDocuments();
            if (count > 0) {
                console.log(`Purging ${count} documents from ${name}...`);
                await model.deleteMany({});
                console.log(`${name} collection purged.`);
            } else {
                console.log(`${name} collection is already empty.`);
            }
        } catch (error) {
            console.error(`Error purging ${name}:`, error);
        }
    }

    console.log('Database purge complete.');
    await mongoose.disconnect();
    console.log('Database disconnected.');
}

purgeDatabase().catch(error => {
    console.error('An error occurred during the database purge:', error);
    process.exit(1);
}); 