import { Schema, model, models, Document, Types } from 'mongoose';
import slugify from 'slugify';

// Interface pour le document Brand
export interface IBrand extends Document {
  name: string; // Nom de la marque (ex: "Apple")
  slug: string; // Slug unique pour l'URL (ex: "apple")
  description?: string; // Description optionnelle de la marque
  logoUrl?: string; // URL du logo de la marque
  categories?: Types.ObjectId[]; // Références aux catégories associées à cette marque
  createdAt: Date;
  updatedAt: Date;
}

// Fonction pour générer un slug standardisé
const generateSlug = (name: string) => slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

const BrandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: [true, "Le nom de la marque est obligatoire."],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      // Le slug sera défini par le hook pre-save
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

// Hook pre-save pour générer/mettre à jour le slug
BrandSchema.pre('save', function (this: IBrand, next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = generateSlug(this.name);
  }
  next();
});

const BrandModel = models.Brand || model<IBrand>('Brand', BrandSchema);

export default BrandModel; 