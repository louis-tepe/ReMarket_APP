import { IFormFieldDefinition } from '../../types/formFields';

export const telephoneFieldDefinitions: IFormFieldDefinition[] = [
  {
    name: 'brand',
    label: 'Marque',
    type: 'text',
    required: true,
    placeholder: 'Ex: Apple, Samsung, Xiaomi'
  },
  {
    name: 'model',
    label: 'Modèle',
    type: 'text',
    required: true,
    placeholder: 'Ex: iPhone 15 Pro, Galaxy S25 Ultra'
  },
  {
    name: 'operatingSystem',
    label: 'Système d\'exploitation',
    type: 'select',
    required: true,
    options: [
      { value: 'ios', label: 'iOS' },
      { value: 'android', label: 'Android' },
      { value: 'other', label: 'Autre' }
    ]
  },
  {
    name: 'batteryCapacity',
    label: 'Capacité de la batterie',
    type: 'number',
    unit: 'mAh',
    placeholder: 'Ex: 4500',
    minValue: 500
  },
  {
    name: 'ram',
    label: 'Mémoire vive (RAM)',
    type: 'number',
    unit: 'Go',
    required: true,
    placeholder: 'Ex: 8',
    minValue: 1
  },
  {
    name: 'storage',
    label: 'Capacité de stockage',
    type: 'number',
    unit: 'Go',
    required: true,
    placeholder: 'Ex: 128',
    minValue: 16
  },
  {
    name: 'screenSize',
    label: 'Taille de l\'écran',
    type: 'number',
    unit: 'pouces',
    placeholder: 'Ex: 6.1',
    minValue: 3,
    maxValue: 8
  },
  {
    name: 'condition',
    label: 'État',
    type: 'select',
    required: true,
    options: [
      { value: 'new', label: 'Neuf (sous emballage)' },
      { value: 'like_new', label: 'Comme neuf (utilisé, sans traces)' },
      { value: 'good', label: 'Bon état (traces d\'usure légères)' },
      { value: 'fair', label: 'État correct (traces d\'usure visibles)' }
    ]
  },
  {
    name: 'color',
    label: 'Couleur',
    type: 'text',
    placeholder: 'Ex: Noir, Titane naturel'
  }
];

// You can add more category-specific field definitions here, for example:
// export const laptopFieldDefinitions: IFormFieldDefinition[] = [ ... ];
// export const bookFieldDefinitions: IFormFieldDefinition[] = [ ... ]; 