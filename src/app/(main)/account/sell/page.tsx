'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TNewOfferSchema } from '@/lib/validators/offer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
    FrontendCategory,
    CategoryDropdownLevel,
    ProductModelReMarketSelectItem,
    DisplayableProductModel,
    FormFieldDefinition,
    Specifications,
    IBrand
} from './types';
import { NOT_LISTED_ID } from './types';
import { Loader2, CheckCircle, ArrowRight, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const OfferFormSchema = z.object({
  price: z.string().nonempty("Le prix est requis."),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']),
  description: z.string().optional(),
  stockQuantity: z.string().nonempty("La quantité est requise."),
  images: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, 'Au moins une image est requise.')
    .refine((files) => files?.length <= 5, 'Maximum 5 images.'),
});

type TOfferFormSchema = z.infer<typeof OfferFormSchema>;

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { status: sessionStatus } = useSession();
    const router = useRouter();

    const [allCategories, setAllCategories] = useState<FrontendCategory[]>([]);
    const [categoryDropdowns, setCategoryDropdowns] = useState<CategoryDropdownLevel[]>([]);
    const [finalSelectedLeafCategory, setFinalSelectedLeafCategory] = useState<FrontendCategory | null>(null);

    const [brands, setBrands] = useState<IBrand[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [productModelsReMarketSelectItems, setProductModelsReMarketSelectItems] = useState<ProductModelReMarketSelectItem[]>([]);
    const [selectedProductModelReMarketId, setSelectedProductModelReMarketId] = useState<string | null>(null);

    const [showCreateByName, setShowCreateByName] = useState(false);
    const [newProductModelName, setNewProductModelName] = useState('');
    const [selectedProductModel, setSelectedProductModel] = useState<DisplayableProductModel | null>(null);
    const [offerSpecificFieldValues, setOfferSpecificFieldValues] = useState<Record<string, string | number | boolean>>({});

    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingProductModels, setIsLoadingProductModels] = useState(false);
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingFullProduct, setIsLoadingFullProduct] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid },
        watch,
        reset: resetForm,
    } = useForm<TOfferFormSchema>({
        resolver: zodResolver(OfferFormSchema),
        mode: 'onTouched',
        defaultValues: {
            price: '',
            condition: 'good',
            stockQuantity: '1',
            description: '',
        }
    });

    const watchedImages = watch("images");

    const resetSellProcess = useCallback(() => {
        setStep(1);
        setCategoryDropdowns([]);
        setFinalSelectedLeafCategory(null);
        setBrands([]);
        setSelectedBrandId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setSelectedProductModel(null);
        setShowCreateByName(false);
        setNewProductModelName('');
        setOfferSpecificFieldValues({});
        resetForm();
        if (allCategories.length > 0) {
            setCategoryDropdowns([
                {
                    level: 0,
                    parentId: null,
                    options: allCategories.filter(cat => cat.depth === 0),
                    selectedId: null,
                    placeholder: "Sélectionnez la catégorie principale"
                }
            ]);
        }
    }, [allCategories, resetForm]);

    useEffect(() => {
        setIsLoadingCategories(true);
        fetch('/api/categories')
            .then(res => {
                if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                if (data && data.success && Array.isArray(data.categories)) {
                    setAllCategories(data.categories as FrontendCategory[]);
                    setCategoryDropdowns([
                        {
                            level: 0,
                            parentId: null,
                            options: (data.categories as FrontendCategory[]).filter((cat: FrontendCategory) => cat.depth === 0),
                            selectedId: null,
                            placeholder: "Sélectionnez la catégorie principale"
                        }
                    ]);
                } else {
                    setAllCategories([]);
                    // console.warn("Structure de données des catégories inattendue reçue:", data);
                }
            })
            .catch(err => {
                console.error("Erreur chargement catégories:", err);
                toast.error("Erreur Catégories", { description: err.message || "Impossible de charger les catégories." });
                setAllCategories([]);
            })
            .finally(() => setIsLoadingCategories(false));
    }, []);

    const handleCategoryLevelSelect = (level: number, categoryId: string) => {
        const selectedCategory = allCategories.find(cat => cat._id === categoryId);

        if (!selectedCategory) return;

        const updatedDropdowns = categoryDropdowns.slice(0, level + 1).map((dropdown, index) => {
            if (index === level) {
                return { ...dropdown, selectedId: categoryId };
            }
            return dropdown;
        });

        setFinalSelectedLeafCategory(null);
        setBrands([]);
        setSelectedBrandId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setShowCreateByName(false);
        setOfferSpecificFieldValues({});

        if (selectedCategory.isLeafNode) {
            setFinalSelectedLeafCategory(selectedCategory);
            setCategoryDropdowns(updatedDropdowns);
            toast.success(`Catégorie sélectionnée: ${selectedCategory.name}`);
            fetchCategorySpecificFormFields(selectedCategory.slug);
        } else {
            const children = allCategories.filter(cat => cat.parent?.toString() === categoryId);
            if (children.length > 0) {
                setCategoryDropdowns([
                    ...updatedDropdowns,
                    {
                        level: level + 1,
                        parentId: categoryId,
                        options: children,
                        selectedId: null,
                        placeholder: `Sélectionnez une sous-catégorie de ${selectedCategory.name}`
                    }
                ]);
            } else {
                setCategoryDropdowns(updatedDropdowns);
                toast.info("Info", { description: "Cette catégorie n'a pas de sous-catégories, mais n'est pas marquée comme feuille." })
            }
        }
    };

    const fetchCategorySpecificFormFields = async (categorySlug: string) => {
        if (!categorySlug) return;
        try {
            const response = await fetch(`/api/categories/${categorySlug}/attributes`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur ${response.status} lors du chargement du formulaire.`);
            }
            const formFieldsData = await response.json();
            if (formFieldsData && formFieldsData.success && Array.isArray(formFieldsData.formFields)) {
                const initialSpecificValues: Record<string, string | number | boolean> = {};
                formFieldsData.formFields.forEach((field: FormFieldDefinition) => {
                    if (field.defaultValue !== undefined) {
                        initialSpecificValues[field.name] = field.defaultValue;
                    } else if (field.type === 'number') {
                        initialSpecificValues[field.name] = '';
                    } else {
                        initialSpecificValues[field.name] = '';
                    }
                });
                setOfferSpecificFieldValues(initialSpecificValues);

            } else {
                setOfferSpecificFieldValues({});
                toast.error("Formulaire Dynamique", { description: formFieldsData.message || "Format de données de formulaire incorrect." });
            }
        } catch (error) {
            setOfferSpecificFieldValues({});
            const typedError = error as Error;
            toast.error("Erreur Formulaire", { description: typedError.message || "Impossible de charger les champs du formulaire pour cette catégorie." });
        }
    };

    useEffect(() => {
        if (finalSelectedLeafCategory && finalSelectedLeafCategory.isLeafNode) {
        } else {
            setOfferSpecificFieldValues({});
        }
    }, [finalSelectedLeafCategory]);

    useEffect(() => {
        if (finalSelectedLeafCategory) {
            setIsLoadingBrands(true);
            setBrands([]);
            setSelectedBrandId(null);
            fetch(`/api/brands?categorySlug=${finalSelectedLeafCategory.slug}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                    return res.json();
                })
                .then(data => {
                    if (data && data.success && Array.isArray(data.brands)) {
                        setBrands(data.brands);
                        if (data.brands.length === 0) {
                            toast.info("Aucune Marque", { description: "Aucune marque trouvée pour cette catégorie. Vous pourrez en créer une si besoin." });
                        }
                    } else {
                        setBrands([]);
                        toast.error("Erreur Marques", { description: data.message || "Format de données incorrect pour les marques." });
                    }
                })
                .catch(err => {
                    console.error("Erreur chargement marques:", err);
                    toast.error("Erreur Marques", { description: err.message || "Impossible de charger les marques." });
                    setBrands([]);
                })
                .finally(() => setIsLoadingBrands(false));
        } else {
            setBrands([]);
            setSelectedBrandId(null);
        }
    }, [finalSelectedLeafCategory]);

    useEffect(() => {
        if (finalSelectedLeafCategory && selectedBrandId) {
            setIsLoadingProductModels(true);
            setProductModelsReMarketSelectItems([]);
            fetch(`/api/product-models/search?categorySlug=${finalSelectedLeafCategory.slug}&brandSlug=${selectedBrandId}`)
                .then(res => {
                    if (!res.ok) {
                        const error = new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                        throw error;
                    }
                    return res.json();
                })
                .then((data: { success: boolean; productModels?: Array<{ _id?: string; id?: string; title?: string; name?: string; }>; message?: string } | Array<{ _id?: string; id?: string; title?: string; name?: string; }>) => {
                    let items: ProductModelReMarketSelectItem[] = [];
                    const processPmData = (pmList: Array<{ _id?: string; id?: string; title?: string; name?: string; }>) => {
                        return pmList.map(pm => ({
                            id: pm._id || pm.id || '',
                            name: pm.title || pm.name || 'Produit sans nom'
                        })).filter(pm => pm.id);
                    };

                    if (Array.isArray(data)) {
                        items = processPmData(data);
                    } else if (data && data.success && Array.isArray(data.productModels)) {
                        items = processPmData(data.productModels);
                    } else if (data && data.message) {
                        // console.info("Message de l'API ProductModels:", data.message);
                    }
                    const notListedOption: ProductModelReMarketSelectItem = {
                        id: NOT_LISTED_ID,
                        name: "Mon produit n'est pas dans cette liste (créer)",
                    };
                    setProductModelsReMarketSelectItems([...items, notListedOption]);
                    if (items.length === 0) {
                        toast.info("Info Produits", { description: "Aucun produit ReMarket existant. Sélectionnez l'option pour en créer un." });
                    }
                })
                .catch(err => {
                    console.error("Erreur chargement ProductModels:", err);
                    toast.error("Erreur Produits", { description: err.message || "Impossible de charger les produits." });
                    setProductModelsReMarketSelectItems([{ id: NOT_LISTED_ID, name: "Mon produit n'est pas dans cette liste (créer)" }]);
                })
                .finally(() => setIsLoadingProductModels(false));
        } else {
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
        }
    }, [finalSelectedLeafCategory, selectedBrandId]);

    const handleSelectBrand = (brandSlug: string) => {
        setSelectedBrandId(brandSlug);
        setSelectedProductModelReMarketId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModel(null);
        setShowCreateByName(false);
    };

    const handleSelectProductModelReMarket = useCallback(async (productModelId: string) => {
        setSelectedProductModelReMarketId(productModelId);
        if (productModelId === NOT_LISTED_ID) {
            setShowCreateByName(true);
            setSelectedProductModel(null);
            const currentBrand = brands.find(b => b.slug === selectedBrandId);
            setNewProductModelName(currentBrand ? `${currentBrand.name} ` : '');
            setIsLoadingFullProduct(false);
            return;
        }
        setShowCreateByName(false);
        setIsLoadingFullProduct(true);
        try {
            const response = await fetch(`/api/product-models/${productModelId}`);
            const fullProductModelData = await response.json();
            if (!response.ok) throw new Error(fullProductModelData.message || "Erreur chargement détail produit.");
            const fullProductModel = fullProductModelData as DisplayableProductModel;
            setSelectedProductModel(fullProductModel);
            setStep(2);
            toast.success("Produit ReMarket sélectionné", { description: `Prêt à décrire: ${fullProductModel.title}` });
        } catch (error) {
            toast.error("Erreur Chargement Produit", { description: (error as Error).message });
            setSelectedProductModelReMarketId(null);
        } finally {
            setIsLoadingFullProduct(false);
        }
    }, [brands, selectedBrandId]);

    const handleScrapeNewProductModel = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        const trimmedNewProductModelName = newProductModelName.trim();
        if (!trimmedNewProductModelName) {
            toast.error("Nom du produit manquant", { description: "Veuillez entrer un nom précis pour le produit à rechercher." });
            return;
        }
        const currentBrand = brands.find(b => b.slug === selectedBrandId);
        if (!finalSelectedLeafCategory || !selectedBrandId || !currentBrand) {
            toast.error("Sélection Marque/Catégorie Feuille Manquante", { description: "Veuillez sélectionner une catégorie feuille et une marque valides." });
            return;
        }
        setIsLoadingCreate(true);
        setSelectedProductModel(null);
        let nameForScraping = trimmedNewProductModelName;
        if (!trimmedNewProductModelName.toLowerCase().startsWith(currentBrand.name.toLowerCase())) {
            nameForScraping = `${currentBrand.name} ${trimmedNewProductModelName}`;
        }
        toast.info("Recherche en cours...", { description: `Recherche d'informations pour "${nameForScraping}".` });

        try {
            const response = await fetch('/api/product-models/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameForScraping,
                    categoryId: finalSelectedLeafCategory.slug,
                    brandId: selectedBrandId
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Erreur création/scraping produit.");

            if (data.productModel?._id) {
                setIsLoadingFullProduct(true);
                const pmResponse = await fetch(`/api/product-models/${data.productModel._id}`);
                const fullProductModelForDisplayData = await pmResponse.json();
                if (!pmResponse.ok) throw new Error(fullProductModelForDisplayData.message || "Erreur recharge produit standardisé.");
                const fullProductModelForDisplay = fullProductModelForDisplayData as DisplayableProductModel;
                setSelectedProductModel(fullProductModelForDisplay);
                setStep(2);
                toast.success("Produit Prêt !", { description: `Les informations pour "${fullProductModelForDisplay.title}" sont prêtes pour votre offre.` });
            } else {
                throw new Error(data.error || data.message || `Produit "${nameForScraping}" non trouvé/standardisé.`);
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Impossible de récupérer/créer les informations du produit.";
            toast.error("Erreur Création Produit", { description: errorMessage });
        } finally {
            setIsLoadingCreate(false);
            setIsLoadingFullProduct(false);
        }
    }, [newProductModelName, brands, selectedBrandId, finalSelectedLeafCategory]);

    const onOfferSubmit = async (formData: TOfferFormSchema) => {
        if (!finalSelectedLeafCategory || !selectedProductModel) {
            toast.error("Erreur", { description: "Catégorie ou modèle de produit manquant." });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const uploadedImageUrls = [];
            if (formData.images) {
                for (const imageFile of Array.from(formData.images)) {
                    const formImageData = new FormData();
                    formImageData.append('file', imageFile);
                    const res = await fetch('/api/services/media/upload/images', { method: 'POST', body: formImageData });
                    const result = await res.json();
                    if (!res.ok || !result.success) throw new Error(result.message || "Échec de l'upload d'image.");
                    uploadedImageUrls.push(result.url);
                }
            }

            const specificFieldsPayload: Record<string, unknown> = {};
            Object.entries(offerSpecificFieldValues).forEach(([key, value]) => {
                if (value !== '') {
                    specificFieldsPayload[key] = value;
                }
            });

            const payload: Partial<TNewOfferSchema> & Record<string, unknown> = {
                price: parseFloat(formData.price),
                stockQuantity: parseInt(formData.stockQuantity, 10),
                condition: formData.condition,
                images: uploadedImageUrls,
                productModelId: selectedProductModel._id,
                kind: finalSelectedLeafCategory.slug,
                currency: 'EUR',
                ...specificFieldsPayload,
            };

            if (formData.description && formData.description.trim().length > 0) {
                payload.description = formData.description;
            }

            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const creationResult = await response.json();
            if (!response.ok) throw new Error(creationResult.message || "La création de l'offre a échoué.");

            toast.success("Offre publiée !");
            router.push(`/account/sales`);

        } catch (error) {
            toast.error("Erreur", { description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDisplayString = (value: string | number | null | undefined | { name?: string; title?: string; toString?: () => string; }): string => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object') {
            if (value.name && typeof value.name === 'string') return value.name;
            if (value.title && typeof value.title === 'string') return value.title;
        }
        if (typeof value.toString === 'function') {
            const strValue = value.toString();
            if (strValue !== '[object Object]') return strValue;
        }
        return 'N/A';
    };

    const prepareDisplayData = () => {
        let displayAttributes: Specifications = [];
        let displayTitle = 'N/A';
        let displayBrand = 'N/A';
        let displayCategory = 'N/A';
        let displayAsin: string | undefined = undefined;
        let displayStandardDescription: string | undefined = 'N/A';
        let displayImageUrls: string[] = ['/images/placeholder-product.png'];

        if (selectedProductModel) {
            displayTitle = selectedProductModel.title || 'N/A';
            displayBrand = selectedProductModel.brand ? getDisplayString(selectedProductModel.brand) : 'N/A';
            displayAsin = selectedProductModel.rawAsin;
            
            let displayCategoryName: string | undefined = finalSelectedLeafCategory?.name;
            if (!displayCategoryName && selectedProductModel.category) {
                const categoryData = selectedProductModel.category;
                if (typeof categoryData === 'object' && categoryData !== null && 'name' in categoryData && typeof categoryData.name === 'string') {
                    displayCategoryName = categoryData.name;
                } else if (typeof categoryData === 'string' && categoryData) {
                    displayCategoryName = categoryData;
                } else if (selectedProductModel.rawCategoryName) {
                    displayCategoryName = selectedProductModel.rawCategoryName;
                } else if (categoryData && typeof categoryData.toString === 'function' && categoryData.constructor.name !== 'Object') {
                    const categoryString = categoryData.toString();
                    if (categoryString !== '[object Object]' && categoryString) {
                        displayCategoryName = categoryString;
                    }
                }
            }
            displayCategory = displayCategoryName || 'N/A';
            
            if (selectedProductModel.standardDescription) {
                displayStandardDescription = selectedProductModel.standardDescription;
            } else if (selectedProductModel.rawDescription) {
                displayStandardDescription = selectedProductModel.rawDescription + " (Description brute)";
            }

            const urls = (selectedProductModel.standardImageUrls && selectedProductModel.standardImageUrls.length > 0)
                ? selectedProductModel.standardImageUrls
                : (selectedProductModel.rawImageUrls && selectedProductModel.rawImageUrls.length > 0
                    ? selectedProductModel.rawImageUrls
                    : null);
            if (urls) displayImageUrls = urls;

            if (selectedProductModel.specifications && selectedProductModel.specifications.length > 0) {
                displayAttributes = selectedProductModel.specifications.map((spec: {label: string, value: string, unit?: string}) => ({
                    label: spec.label,
                    value: spec.value,
                    unit: spec.unit
                }));
            } else if (selectedProductModel.rawAttributes && selectedProductModel.rawAttributes.length > 0) {
                displayAttributes = selectedProductModel.rawAttributes.map((attr: {label: string, value: string}) => ({
                    label: attr.label,
                    value: attr.value,
                }));
            }
        }
        return { displayAttributes, displayTitle, displayBrand, displayCategory, displayAsin, displayStandardDescription, displayImageUrls };
    };

    const renderCategoryDropdowns = () => {
        return categoryDropdowns.map((dropdown, index) => (
            <div key={`cat-level-${index}`} className="mb-4">
                <Label htmlFor={`category-level-${index}`}>{dropdown.level === 0 ? "1. Catégorie" : `Sous-catégorie`}</Label>
                <Select
                    value={dropdown.selectedId || ''}
                    onValueChange={(value) => handleCategoryLevelSelect(dropdown.level, value)}
                    disabled={isLoadingCategories || (index > 0 && !categoryDropdowns[index - 1]?.selectedId) || isLoadingFullProduct || isLoadingCreate}
                >
                    <SelectTrigger id={`category-level-${index}`} className="bg-input">
                        <SelectValue placeholder={isLoadingCategories && index === 0 ? "Chargement..." : dropdown.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {dropdown.options.length > 0 ? (
                            dropdown.options.map(cat => (
                                <SelectItem
                                    key={cat._id}
                                    value={cat._id}
                                >
                                    {cat.name}
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-options" disabled>Aucune sous-catégorie</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        ));
    };

    const renderOfferForm = () => (
        <Card>
                    <CardHeader>
                <CardTitle>Étape 3: Décrivez votre article</CardTitle>
                <CardDescription>Détails pour : {selectedProductModel?.title}</CardDescription>
                    </CardHeader>
            <form onSubmit={handleSubmit(onOfferSubmit)} noValidate>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="price">Prix (€)</Label>
                            <Input id="price" type="number" step="0.01" {...register('price')} placeholder="150" />
                            {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>État</Label>
                            <Controller name="condition" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Neuf</SelectItem>
                                        <SelectItem value="like-new">Comme neuf</SelectItem>
                                        <SelectItem value="good">Bon état</SelectItem>
                                        <SelectItem value="fair">État correct</SelectItem>
                                        <SelectItem value="poor">Abîmé</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                            {errors.condition && <p className="text-sm text-red-500">{errors.condition.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="stockQuantity">Quantité</Label>
                            <Input id="stockQuantity" type="number" step="1" {...register('stockQuantity')} placeholder="1" />
                            {errors.stockQuantity && <p className="text-sm text-red-500">{errors.stockQuantity.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register('description')} placeholder="Ex: Vendu avec boîte d'origine..." />
                        {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="photos">Photos (jusqu&apos;à 5)</Label>
                        <Input id="photos" type="file" multiple accept="image/*" {...register('images')} />
                        {errors.images && <p className="text-sm text-red-500">{errors.images.message}</p>}
                        {watchedImages?.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {Array.from(watchedImages).map((file, index) => (
                                    <div key={index} className="relative w-24 h-24">
                                        <Image src={URL.createObjectURL(file)} alt={`preview ${index}`} fill className="rounded-md object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
                    <Button type="submit" disabled={isSubmitting || !isValid || sessionStatus !== 'authenticated'}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Publier l&apos;offre
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );

    const renderStep1_Selection = () => (
        <Card>
            <CardHeader>
                <CardTitle>Étape 1: Identifiez votre produit</CardTitle>
                <CardDescription>Sélectionnez la catégorie, la marque et le modèle de votre produit.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderCategoryDropdowns()}
                {finalSelectedLeafCategory && (
                    <React.Fragment key={finalSelectedLeafCategory._id}>
                        <div className="mb-4">
                            <Label htmlFor="brand-select">2. Marque</Label>
                            <Select
                                value={selectedBrandId || ''}
                                onValueChange={handleSelectBrand}
                                disabled={isLoadingBrands || isLoadingFullProduct || isLoadingCreate}
                            >
                                <SelectTrigger id="brand-select" className="bg-input">
                                    <SelectValue placeholder={isLoadingBrands ? "Chargement des marques..." : "Sélectionnez une marque"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.length > 0 ? brands.map(brand => (
                                        <SelectItem key={brand._id} value={brand.slug}>{brand.name}</SelectItem>
                                    )) : <SelectItem value="no-brands" disabled>Aucune marque trouvée</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedBrandId && (
                            <div>
                                <Label htmlFor="product-model-select">3. Modèle du produit</Label>
                                <Select
                                    value={selectedProductModelReMarketId || ''}
                                    onValueChange={(value) => {
                                        if (typeof value === 'string') {
                                            handleSelectProductModelReMarket(value)
                                        }
                                    }}
                                    disabled={isLoadingProductModels || isLoadingFullProduct || isLoadingCreate}
                                >
                                    <SelectTrigger id="product-model-select" className="bg-input">
                                        <SelectValue placeholder={isLoadingProductModels ? "Chargement des modèles..." : "Sélectionnez un modèle"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productModelsReMarketSelectItems.map(pm => (
                                            <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {showCreateByName && (
                                    <form onSubmit={handleScrapeNewProductModel} className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                                        <p className="text-sm font-medium">Créer un nouveau modèle de produit</p>
                                        <Input
                                            type="text"
                                            value={newProductModelName}
                                            onChange={(e) => setNewProductModelName(e.target.value)}
                                            placeholder="Ex: iPhone 15 Pro Max 256GB"
                                            disabled={isLoadingCreate}
                                        />
                                        <Button type="submit" disabled={isLoadingCreate || !newProductModelName.trim()}>
                                            {isLoadingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                            Rechercher et créer
                                        </Button>
                                    </form>
                                )}
                            </div>
                        )}
                    </React.Fragment>
                )}
            </CardContent>
             <CardFooter className="flex justify-end">
                <Button onClick={resetSellProcess} variant="ghost" >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Recommencer
                </Button>
            </CardFooter>
        </Card>
    );

    const renderStep2_ProductConfirmation = () => {
        if (!selectedProductModel) return null;
        const { displayAttributes, displayTitle, displayBrand, displayCategory, displayAsin, displayStandardDescription, displayImageUrls } = prepareDisplayData();

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Étape 2: Confirmez votre produit</CardTitle>
                    <CardDescription>Vérifiez les informations ci-dessous. Est-ce bien le produit que vous vendez ?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3">
                            <Image src={displayImageUrls[0]} alt={displayTitle} width={200} height={200} className="rounded-lg object-contain mx-auto" />
                        </div>
                        <div className="md:w-2/3 space-y-2">
                            <h2 className="text-2xl font-bold">{displayTitle}</h2>
                            <p><span className="font-semibold">Marque:</span> {displayBrand}</p>
                            <p><span className="font-semibold">Catégorie:</span> {displayCategory}</p>
                            {displayAsin && <p><span className="font-semibold">ASIN:</span> {displayAsin}</p>}
                            <p className="text-sm text-muted-foreground pt-2">{displayStandardDescription}</p>
                        </div>
                    </div>
                    {displayAttributes.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-2">Spécifications</h3>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {displayAttributes.map((attr, index) => (
                                    <li key={index}><span className="font-medium">{attr.label}:</span> {attr.value} {attr.unit || ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
                    <Button type="button" onClick={() => setStep(3)}>
                        Oui, c&apos;est mon produit <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderCurrentStep = () => {
        switch (step) {
            case 1:
                return renderStep1_Selection();
            case 2:
                return renderStep2_ProductConfirmation();
            case 3:
                return renderOfferForm();
            default:
                return <p>Étape inconnue.</p>;
        }
    }

    return (
        <div className="container mx-auto max-w-4xl py-8">
            {renderCurrentStep()}
        </div>
    );
}