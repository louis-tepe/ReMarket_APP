import { Schema, model, models, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string; // Nom de la catégorie (ex: "Téléphones Mobiles")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "telephones-mobiles")
  description?: string;
  depth: number; // Profondeur de la catégorie dans la hiérarchie
  parent?: Types.ObjectId; // Catégorie parente, requise si depth > 0
  isLeafNode: boolean; // True si la catégorie est une feuille et peut avoir des champs de formulaire spécifiques
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
    isLeafNode: {
      type: Boolean,
      required: true,
      default: false,
    },
    depth: {
      type: Number,
      required: [true, "La profondeur de la catégorie est obligatoire."],
      min: [0, "La profondeur doit être un entier positif ou nul."]
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      validate: {
        validator: function(this: ICategory, value: Types.ObjectId | undefined) {
          return this.depth === 0 || (this.depth > 0 && value != null);
        },
        message: "Une catégorie parente est requise si la profondeur est supérieure à 0.",
      }
    },
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