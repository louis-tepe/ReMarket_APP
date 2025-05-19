import { Schema, model, models, Document, Types } from 'mongoose';
import { IFormFieldDefinition, IFormFieldOption } from '../types/formFields';

// Sub-schema for IFormFieldOption
const FormFieldOptionSchema = new Schema<IFormFieldOption>(
  {
    value: { type: Schema.Types.Mixed, required: true }, // string or number
    label: { type: String, required: true },
  },
  { _id: false } // No _id for subdocuments unless necessary
);

// Sub-schema for IFormFieldDefinition
const FormFieldDefinitionSchema = new Schema<IFormFieldDefinition>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'number', 'select', 'textarea', 'checkbox', 'radio', 'date', 'file', 'email', 'password', 'url'],
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    defaultValue: { type: Schema.Types.Mixed }, // string | number | boolean | string[] | undefined
    options: [FormFieldOptionSchema], // Array of FormFieldOptionSchema
    unit: { type: String },
    minValue: { type: Number },
    maxValue: { type: Number },
    step: { type: Number },
    minLength: { type: Number },
    maxLength: { type: Number },
    pattern: { type: String },
    rows: { type: Number },
    accept: { type: String },
    multiple: { type: Boolean, default: false },
    validationMessage: { type: String },
    helperText: { type: String },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  { _id: false } // No _id for subdocuments unless necessary
);

export interface ICategory extends Document {
  name: string; // Nom de la catégorie (ex: "Téléphones Mobiles")
  slug: string; // Slug unique pour l'URL et les IDs (ex: "telephones-mobiles")
  description?: string;
  depth: number; // Profondeur de la catégorie dans la hiérarchie
  parent?: Types.ObjectId; // Catégorie parente, requise si depth > 0
  formFieldDefinitions?: IFormFieldDefinition[]; // Définitions des champs de formulaire spécifiques à la catégorie
  isLeafNode: boolean; // Indique si la catégorie est un nœud terminal (pas d'enfants)
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
    depth: {
      type: Number,
      required: [true, "La profondeur de la catégorie est obligatoire."],
      min: [0, "La profondeur doit être un entier positif ou nul"]
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
    formFieldDefinitions: [FormFieldDefinitionSchema],
    isLeafNode: {
      type: Boolean,
      default: true, // Par défaut, une nouvelle catégorie est considérée comme une feuille
      required: true,
    },
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