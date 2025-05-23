import { NextResponse, NextRequest } from 'next/server';
import type { FormFieldDefinition } from '@/types/form.types.ts';
import ProductOfferModel from '@/models/ProductBaseModel';

// Importez TOUS vos modèles discriminateurs ici pour vous assurer qu'ils sont enregistrés par Mongoose
// avant que cette route ne soit utilisée.
import '@/models/discriminators/SmartphoneModel';
import '@/models/discriminators/LaptopModel';
import '@/models/discriminators/MonitorModel';
import '@/models/discriminators/CasesCoversModel';
import '@/models/discriminators/ChargersCablesModel';
import '@/models/discriminators/CpuModel';
import '@/models/discriminators/DesktopComputerModel';
import '@/models/discriminators/FeaturePhoneModel';
import '@/models/discriminators/FitnessTrackerModel';
import '@/models/discriminators/GpuModel';
import '@/models/discriminators/KeyboardModel';
import '@/models/discriminators/MotherboardModel';
import '@/models/discriminators/PcCaseModel';
import '@/models/discriminators/PowerBanksModel';
import '@/models/discriminators/PsuModel';
import '@/models/discriminators/RamModel';
import '@/models/discriminators/ScreenProtectorsModel';
import '@/models/discriminators/SmartwatchModel';
import '@/models/discriminators/StorageModel';
import '@/models/discriminators/TabletModel';
// ... ajoutez d'autres imports de discriminateurs au besoin

function generateLabel(name: string): string {
    // Convertit camelCase ou snake_case en libellé plus lisible
    // Exemple: screenSizeIn -> Screen Size In, storage_capacity -> Storage Capacity
    const result = name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

function mapMongooseTypeToFormType(instance: string, enumValues?: string[] | number[]): FormFieldDefinition['type'] {
    if (enumValues && enumValues.length > 0) {
        return 'select';
    }
    switch (instance) {
        case 'String':
            return 'text';
        case 'Number':
            return 'number';
        case 'Boolean':
            return 'select'; // On pourrait aussi utiliser 'checkbox', mais 'select' (Oui/Non) est plus simple ici
        case 'Date':
            return 'text'; // HTML5 a 'date', mais 'text' est plus simple pour une gestion basique
        default:
            return 'text'; // Type par défaut
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

    const DiscriminatorModel = ProductOfferModel.discriminators?.[categorySlug];

    if (!DiscriminatorModel) {
        // Pas un slug de catégorie feuille avec un discriminateur enregistré, ou slug invalide
        // Renvoyer un tableau vide ou un message approprié
        console.warn(`Aucun discriminateur trouvé pour le slug de catégorie: ${categorySlug}`);
        return NextResponse.json({
            success: true, 
            message: "Aucun champ de formulaire dynamique spécifique défini pour cette catégorie (pas de discriminateur ou slug invalide).", 
            formFields: [] 
        });
    }

    const formFields: FormFieldDefinition[] = [];
    const discriminatorSchemaPaths = DiscriminatorModel.schema.paths;
    const baseSchemaPaths = ProductOfferModel.schema.paths;

    for (const pathName in discriminatorSchemaPaths) {
        // Exclure les champs du schéma de base et les champs internes Mongoose
        if (baseSchemaPaths[pathName] || pathName === '_id' || pathName === '__v' || pathName === 'kind') {
            continue;
        }

        const schemaPath = discriminatorSchemaPaths[pathName];
        const instance = schemaPath.instance;
        const enumValues = schemaPath.options.enum;

        const fieldType = mapMongooseTypeToFormType(instance, enumValues);
        const fieldDefinition: FormFieldDefinition = {
            name: pathName,
            label: generateLabel(pathName), // Générer un libellé basique
            type: fieldType,
            required: schemaPath.isRequired || false,
            placeholder: `Entrez ${generateLabel(pathName).toLowerCase()}`,
            defaultValue: schemaPath.options.default !== undefined ? schemaPath.options.default : '',
        };

        if (fieldType === 'select') {
            if (instance === 'Boolean') {
                fieldDefinition.options = [
                    { value: 'true', label: 'Oui' },
                    { value: 'false', label: 'Non' },
                ];
                // Si defaultValue n'est pas explicitement false, et est undefined, on pourrait vouloir le forcer à string 'false' ou 'true'
                if (typeof fieldDefinition.defaultValue !== 'string' && fieldDefinition.defaultValue !== undefined) {
                    fieldDefinition.defaultValue = String(fieldDefinition.defaultValue);
                }
            } else if (enumValues && enumValues.length > 0) {
                fieldDefinition.options = enumValues.map((val: string | number) => ({ value: String(val), label: generateLabel(String(val)) }));
            }
        }
        
        if (schemaPath.options) {
            if (schemaPath.options.min !== undefined) fieldDefinition.min = schemaPath.options.min as number;
            if (schemaPath.options.max !== undefined) fieldDefinition.max = schemaPath.options.max as number;
            // Mongoose stocke minlength/maxlength dans les validateurs, plus complexe à extraire directement.
            // Pour une implémentation simple, on pourrait ajouter des options personnalisées au schéma.
        }

        formFields.push(fieldDefinition);
    }

    return NextResponse.json({ success: true, formFields });
} 