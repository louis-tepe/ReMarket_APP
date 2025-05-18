export interface IFormFieldOption {
  value: string | number;
  label: string;
}

export interface IFormFieldDefinition {
  name: string; // Unique identifier for the field
  label: string; // Display label for the field
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'file' | 'email' | 'password' | 'url';
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean | string[] | undefined;
  
  // For 'select', 'radio' types
  options?: IFormFieldOption[];
  
  // For 'number' type
  unit?: string;
  minValue?: number;
  maxValue?: number;
  step?: number; // For number inputs, e.g., step="0.01" for currency

  // For 'text', 'textarea', 'password', 'email', 'url' types
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern for validation
  
  // For 'textarea' type
  rows?: number;
  
  // For 'file' type
  accept?: string; // e.g., 'image/*, .pdf'
  multiple?: boolean;

  // General validation and help
  validationMessage?: string; // Custom message for built-in validation errors
  helperText?: string; // Additional text to guide the user
  disabled?: boolean;
  readonly?: boolean;
} 