import { Schema, model, models, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string; // Nom de la catégorie (ex: "Téléphones Mobiles")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "telephones-mobiles")
  description?: string;
  // parentCategory?: Types.ObjectId; // Pour des sous-catégories éventuelles
  // iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Le nom de la catégorie est obligatoire."],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, "Le slug est obligatoire."],
      trim: true,
      unique: true,
      index: true,
      // Simple fonction pour générer un slug, à améliorer si besoin (ex: avec un package comme slugify)
      set: (value: string) => value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
    },
    description: {
      type: String,
      trim: true,
    },
    // parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    // iconUrl: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pré-validation ou hook pour s'assurer que le slug est généré si non fourni manuellement
CategorySchema.pre('save', function (next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

const CategoryModel = models.Category || model<ICategory>('Category', CategorySchema);

export default CategoryModel; 