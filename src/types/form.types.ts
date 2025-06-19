export interface FormFieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'switch';
    required: boolean;
    placeholder?: string;
    description?: string;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    defaultValue?: string | number | boolean;
} 