import { Schema, model, models, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  name: string; // Nom de la catégorie (ex: "Téléphones Mobiles")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "telephones-mobiles")
  description?: string;
  depth: number; // Profondeur de la catégorie dans la hiérarchie
  parent?: Types.ObjectId; // Catégorie parente, requise si depth > 0
  isLeafNode: boolean; // True si la catégorie est une feuille et peut avoir des champs de formulaire spécifiques
  imageAnalysisPrompt?: string; // Nouveau champ pour le prompt d'analyse d'image
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
      set: (value: string) => slugify(value, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }),
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
    imageAnalysisPrompt: {
      type: String,
      trim: true,
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

CategorySchema.pre('save', function (this: ICategory, next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  }
  next();
});

const CategoryModel = models.Category || model<ICategory>('Category', CategorySchema);

export default CategoryModel; 