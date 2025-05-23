import { Schema, model, models, Document, Types } from 'mongoose';
import slugify from 'slugify';

// Interface pour le document Category
export interface ICategory extends Document {
  name: string; // Nom de la catégorie (ex: "Téléphones Mobiles")
  slug: string; // Slug unique pour l'URL (ex: "telephones-mobiles")
  description?: string; // Description optionnelle
  depth: number; // Profondeur dans la hiérarchie (0 pour racine)
  parent?: Types.ObjectId; // Réf. à la catégorie parente (si depth > 0)
  isLeafNode: boolean; // Vrai si peut avoir des champs de formulaire spécifiques
  imageAnalysisPrompt?: string; // Prompt pour l'analyse d'image par IA
  createdAt: Date;
  updatedAt: Date;
}

// Fonction pour générer un slug standardisé
const generateSlug = (name: string) => slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

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
      trim: true,
      unique: true,
      index: true,
      // Slug généré par le hook pre-save
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
        // `this` fait référence au document en cours de validation
        validator: function(this: ICategory, value: Types.ObjectId | undefined): boolean {
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

// Hook pre-save pour générer/mettre à jour le slug
CategorySchema.pre('save', function (this: ICategory, next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = generateSlug(this.name);
  }
  next();
});

const CategoryModel = models.Category || model<ICategory>('Category', CategorySchema);

export default CategoryModel; 