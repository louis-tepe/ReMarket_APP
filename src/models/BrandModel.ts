import { Schema, model, models, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface IBrand extends Document {
  name: string; // Nom de la marque (ex: "Apple")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "apple")
  description?: string;
  logoUrl?: string;
  categories?: Types.ObjectId[]; // Références aux catégories où cette marque est présente
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, "Le nom de la marque est obligatoire."],
      trim: true,
      unique: true, // Généralement, une marque est unique globalement
    },
    slug: {
      type: String,
      required: [true, "Le slug est obligatoire."],
      trim: true,
      unique: true,
      index: true,
      set: (value: string) => slugify(value, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }),
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BrandSchema.pre('save', function (this: IBrand, next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }
  next();
});

const BrandModel = models.Brand || model<IBrand>('Brand', BrandSchema);

export default BrandModel; 