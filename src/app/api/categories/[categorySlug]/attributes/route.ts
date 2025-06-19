import ProductOfferModel from '@/lib/mongodb/models/SellerProduct';
import { NextRequest, NextResponse } from 'next/server';
import type { FormFieldDefinition } from '@/types/form.types';
import { getKindFromSlug } from '@/config/discriminatorMapping';
import mongoose from 'mongoose';

// Enregistrement des discriminateurs (assure que les modèles sont chargés)
import '@/lib/mongodb/models/discriminators/CasesCoversModel';
import '@/lib/mongodb/models/discriminators/ChargersCablesModel';
import '@/lib/mongodb/models/discriminators/CpuModel';
import '@/lib/mongodb/models/discriminators/DesktopComputerModel';
import '@/lib/mongodb/models/discriminators/FeaturePhoneModel';
import '@/lib/mongodb/models/discriminators/FitnessTrackerModel';
import '@/lib/mongodb/models/discriminators/GameConsoleModel';
import '@/lib/mongodb/models/discriminators/GpuModel';
import '@/lib/mongodb/models/discriminators/KeyboardModel';
import '@/lib/mongodb/models/discriminators/LaptopModel';
import '@/lib/mongodb/models/discriminators/MonitorModel';
import '@/lib/mongodb/models/discriminators/MotherboardModel';
import '@/lib/mongodb/models/discriminators/PcCaseModel';
import '@/lib/mongodb/models/discriminators/PowerBanksModel';
import '@/lib/mongodb/models/discriminators/PsuModel';
import '@/lib/mongodb/models/discriminators/RamModel';
import '@/lib/mongodb/models/discriminators/ScreenProtectorsModel';
import '@/lib/mongodb/models/discriminators/SmartphoneModel';
import '@/lib/mongodb/models/discriminators/SmartwatchModel';
import '@/lib/mongodb/models/discriminators/StorageModel';
import '@/lib/mongodb/models/discriminators/TabletModel';


function generateLabel(name: string): string {
    const result = name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

function mapMongooseTypeToFormType(instance: string, enumValues?: (string | number)[]): FormFieldDefinition['type'] {
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
    request: NextRequest,
    { params }: { params: Promise<{ categorySlug: string }> }
) {
    const actualParams = await params;
    const categorySlug = actualParams.categorySlug?.toLowerCase();

    if (!categorySlug) {
        return NextResponse.json({ success: false, message: "Slug de catégorie manquant." }, { status: 400 });
    }

    const kind = getKindFromSlug(categorySlug);
    if (!kind) {
         return NextResponse.json({ success: true, message: "Aucun attribut spécifique défini pour cette catégorie (kind non trouvé).", formFields: [] });
    }
    
    // Le nom du modèle EST la valeur 'kind' elle-même, telle qu'enregistrée dans les fichiers de modèle de discriminateur.
    const DiscriminatorModel = mongoose.models[kind];

    if (!DiscriminatorModel) {
        console.error(`Le modèle discriminateur pour le kind '${kind}' n'a pas été trouvé. Assurez-vous qu'il est correctement enregistré.`);
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
        // Ignorer les champs du schéma de base, l'_id, la version et la clé de discriminateur
        if (baseSchemaPaths[pathName] || pathName === '_id' || pathName === '__v' || pathName === 'kind') {
            continue;
        }

        const schemaPath = discriminatorSchemaPaths[pathName];
        if (!schemaPath) continue; // Sécurité

        const instance = schemaPath.instance;
        const enumValues = schemaPath.options?.enum;
        const fieldType = mapMongooseTypeToFormType(instance, enumValues);
        
        const fieldDefinition: FormFieldDefinition = {
            name: pathName,
            label: generateLabel(pathName),
            type: fieldType,
            required: schemaPath.isRequired || false,
            placeholder: `Entrez ${generateLabel(pathName).toLowerCase()}`,
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
            } else if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
                fieldDefinition.options = enumValues.map((val: string | number) => ({ 
                    value: String(val), 
                    label: generateLabel(String(val)) 
                }));
            }
        }
        
        if (schemaPath.options) {
            if (schemaPath.options.min !== undefined) fieldDefinition.min = schemaPath.options.min as number;
            if (schemaPath.options.max !== undefined) fieldDefinition.max = schemaPath.options.max as number;
            if (Array.isArray(schemaPath.options.min)) fieldDefinition.min = schemaPath.options.min[0];
            if (Array.isArray(schemaPath.options.max)) fieldDefinition.max = schemaPath.options.max[0];
        }

        formFields.push(fieldDefinition);
    }

    return NextResponse.json({ success: true, formFields });
} 