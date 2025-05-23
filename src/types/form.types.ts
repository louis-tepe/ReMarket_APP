export interface FormFieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    required: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    defaultValue?: string | number | boolean;
} 