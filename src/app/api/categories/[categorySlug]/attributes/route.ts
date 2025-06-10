import ProductOfferModel from '@/lib/mongodb/models/ProductBaseModel';
import { NextRequest, NextResponse } from 'next/server';
import type { FormFieldDefinition } from '@/types/form.types.ts';

function generateLabel(name: string): string {
    const result = name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

function mapMongooseTypeToFormType(instance: string, enumValues?: string[] | number[]): FormFieldDefinition['type'] {
    if (enumValues && enumValues.length > 0) return 'select';
    switch (instance) {
        case 'String': return 'text';
        case 'Number': return 'number';
        case 'Boolean': return 'select'; // Ou 'checkbox', 'select' (Oui/Non) est simple
        case 'Date': return 'text'; // HTML5 'date' existe, mais 'text' est plus simple ici
        default: return 'text';
    }
}

export async function GET(
    request: NextRequest, // request n'est pas utilisé, mais conservé pour la signature
    { params }: { params: Promise<{ categorySlug: string }> }
) {
    const actualParams = await params;
    const categorySlug = actualParams.categorySlug?.toLowerCase();

    if (!categorySlug) {
        return NextResponse.json({ success: false, message: "Slug de catégorie manquant." }, { status: 400 });
    }

    const DiscriminatorModel = ProductOfferModel.discriminators?.[categorySlug];

    if (!DiscriminatorModel) {
        return NextResponse.json({
            success: true, 
            message: "Aucun attribut spécifique défini pour cette catégorie.", 
            formFields: [] 
        });
    }

    const formFields: FormFieldDefinition[] = [];
    const discriminatorSchemaPaths = DiscriminatorModel.schema.paths;
    const baseSchemaPaths = ProductOfferModel.schema.paths;

    for (const pathName in discriminatorSchemaPaths) {
        if (baseSchemaPaths[pathName] || pathName === '_id' || pathName === '__v' || pathName === 'kind') {
            continue;
        }

        const schemaPath = discriminatorSchemaPaths[pathName];
        const instance = schemaPath.instance;
        const enumValues = schemaPath.options.enum;
        const fieldType = mapMongooseTypeToFormType(instance, enumValues);
        
        const fieldDefinition: FormFieldDefinition = {
            name: pathName,
            label: generateLabel(pathName),
            type: fieldType,
            required: schemaPath.isRequired || false,
            placeholder: `Entrez ${generateLabel(pathName).toLowerCase()}`,
            // Assurer que defaultValue est une chaîne pour les types 'select' si défini
            defaultValue: schemaPath.options.default !== undefined 
                ? (fieldType === 'select' && typeof schemaPath.options.default === 'boolean' 
                    ? String(schemaPath.options.default) 
                    : schemaPath.options.default)
                : '',
        };

        if (fieldType === 'select') {
            if (instance === 'Boolean') {
                fieldDefinition.options = [
                    { value: 'true', label: 'Oui' },
                    { value: 'false', label: 'Non' },
                ];
            } else if (enumValues && enumValues.length > 0) {
                fieldDefinition.options = enumValues.map((val: string | number) => ({ 
                    value: String(val), 
                    label: generateLabel(String(val)) 
                }));
            }
        }
        
        if (schemaPath.options) {
            if (schemaPath.options.min !== undefined) fieldDefinition.min = schemaPath.options.min as number;
            if (schemaPath.options.max !== undefined) fieldDefinition.max = schemaPath.options.max as number;
        }

        formFields.push(fieldDefinition);
    }

    return NextResponse.json({ success: true, formFields });
} 