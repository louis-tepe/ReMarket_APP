import { Schema, model, models, Document } from 'mongoose';

export interface IBrand extends Document {
  name: string; // Nom de la marque (ex: "Apple")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "apple")
  description?: string;
  logoUrl?: string;
  // categories: Types.ObjectId[]; // Optionnel: Références aux catégories où cette marque est présente
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
      set: (value: string) => value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    // categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

BrandSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

const BrandModel = models.Brand || model<IBrand>('Brand', BrandSchema);

export default BrandModel; 