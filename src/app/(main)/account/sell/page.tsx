'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
    OfferDetails,
    ProductModelReMarketSelectItem,
    DisplayableProductModel,
    FormFieldDefinition,
    AttributeItem,
    Specifications,
    IBrand
} from './types';
import { NOT_LISTED_ID } from './types';
import { Loader2, CheckCircle, ArrowRight, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const INITIAL_OFFER_DETAILS: OfferDetails = {
    price: '',
    currency: 'EUR',
    condition: 'good',
    sellerDescription: '',
    photos: [],
    stockQuantity: '1',
};

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { data: session, status: sessionStatus } = useSession();
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
    const [offerDetails, setOfferDetails] = useState<OfferDetails>(INITIAL_OFFER_DETAILS);
    const [categorySpecificFormFields, setCategorySpecificFormFields] = useState<FormFieldDefinition[]>([]);
    const [offerSpecificFieldValues, setOfferSpecificFieldValues] = useState<Record<string, string | number | boolean | File | File[]>>({});

    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingProductModels, setIsLoadingProductModels] = useState(false);
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingFullProduct, setIsLoadingFullProduct] = useState(false);
    const [isLoadingSubmitOffer, setIsLoadingSubmitOffer] = useState(false);

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
        setOfferDetails(INITIAL_OFFER_DETAILS);
        setOfferSpecificFieldValues({});
        setCategorySpecificFormFields([]);
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
    }, [allCategories]);

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
        setCategorySpecificFormFields([]);

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
                setCategorySpecificFormFields(formFieldsData.formFields);
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
                setCategorySpecificFormFields([]);
                setOfferSpecificFieldValues({});
                toast.error("Formulaire Dynamique", { description: formFieldsData.message || "Format de données de formulaire incorrect." });
            }
        } catch (error) {
            setCategorySpecificFormFields([]);
            setOfferSpecificFieldValues({});
            const typedError = error as Error;
            toast.error("Erreur Formulaire", { description: typedError.message || "Impossible de charger les champs du formulaire pour cette catégorie." });
        }
    };

    useEffect(() => {
        if (finalSelectedLeafCategory && finalSelectedLeafCategory.isLeafNode) {
        } else {
            setCategorySpecificFormFields([]);
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

    const handleOfferDetailsChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setOfferDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSpecificFieldChange = (name: string, value: string | number | boolean /*, type?: string */) => {
        // const isCheckbox = type === 'checkbox';
        // const processedValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
        setOfferSpecificFieldValues(prev => ({ ...prev, [name]: value }));
    };

    const handleConditionChange = (value: string) => {
        setOfferDetails({ ...offerDetails, condition: value as OfferDetails['condition'] });
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files).slice(0, 5);
            setOfferDetails({ ...offerDetails, photos: filesArray });
        }
    };

    const handleSubmitOffer = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        const userId = (session?.user as { id?: string })?.id;
        if (sessionStatus !== 'authenticated' || !userId) {
            toast.error("Authentification Requise", { description: "Veuillez vous connecter." });
            return;
        }
        if (!offerDetails.price || isNaN(parseFloat(offerDetails.price)) || parseFloat(offerDetails.price) <= 0) {
            toast.error("Prix invalide", { description: "Veuillez entrer un prix valide." });
            return;
        }
        if (!selectedProductModel || !selectedProductModel._id) {
            toast.error("Erreur Produit", { description: "Aucun produit ReMarket sélectionné." });
            return;
        }

        setIsLoadingSubmitOffer(true);
        let uploadedPhotoUrls: string[] = [];

        if (offerDetails.photos && offerDetails.photos.length > 0) {
            const photoFormData = new FormData();
            for (const photo of offerDetails.photos) {
                photoFormData.append('files', photo);
            }

            try {
                toast.info("Téléversement des images...", { id: "upload-toast" });
                const uploadResponse = await fetch('/api/services/media/upload/images', {
                    method: 'POST',
                    body: photoFormData,
                });

                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok || !uploadData.success) {
                    throw new Error(uploadData.message || "Échec du téléversement des images.");
                }
                uploadedPhotoUrls = uploadData.urls;
                toast.success("Images téléversées !", { id: "upload-toast" });
            } catch (uploadError: unknown) {
                const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : "Erreur inconnue lors du téléversement.";
                toast.error("Erreur Upload Photos", { description: uploadErrorMessage, id: "upload-toast" });
                setIsLoadingSubmitOffer(false);
                return;
            }
        }

        const typedOfferSpecificFieldValues: Record<string, string | number | boolean> = {};

        if (finalSelectedLeafCategory?.slug === 'laptops') {
            typedOfferSpecificFieldValues.screenSize_in = parseFloat(String(offerSpecificFieldValues.screenSize_in || '0'));
            typedOfferSpecificFieldValues.processor = String(offerSpecificFieldValues.processor || '');
            typedOfferSpecificFieldValues.ram_gb = parseInt(String(offerSpecificFieldValues.ram_gb || '0'), 10);
            typedOfferSpecificFieldValues.storageType = String(offerSpecificFieldValues.storageType || 'SSD') as 'SSD' | 'HDD' | 'eMMC';
            typedOfferSpecificFieldValues.storageCapacity_gb = parseInt(String(offerSpecificFieldValues.storageCapacity_gb || '0'), 10);
            typedOfferSpecificFieldValues.graphicsCard = String(offerSpecificFieldValues.graphicsCard || '');
            typedOfferSpecificFieldValues.operatingSystem = String(offerSpecificFieldValues.operatingSystem || '');
            const webcamValue = offerSpecificFieldValues.hasWebcam;
            typedOfferSpecificFieldValues.hasWebcam = typeof webcamValue === 'string' ? webcamValue.toLowerCase() === 'true' : Boolean(webcamValue);
            typedOfferSpecificFieldValues.color = String(offerSpecificFieldValues.color || '');
        } else if (finalSelectedLeafCategory?.slug === 'smartphones') {
            const parseNumericOrUndefined = (val: string | number | boolean | File | File[] | undefined): number | undefined => {
                const strVal = String(val || '');
                if (!strVal) return undefined;
                const num = parseFloat(strVal);
                return isNaN(num) || num === 0 ? undefined : num;
            };
            const parseIntOrUndefined = (val: string | number | boolean | File | File[] | undefined): number | undefined => {
                const strVal = String(val || '');
                if (!strVal) return undefined;
                const num = parseInt(strVal, 10);
                return isNaN(num) || num === 0 ? undefined : num;
            };
            const parseStringOrUndefined = (val: string | number | boolean | File | File[] | undefined): string | undefined => {
                const str = String(val || '');
                return str === '' ? undefined : str;
            };

            const screenSize = parseNumericOrUndefined(offerSpecificFieldValues.screenSize_in);
            if (screenSize !== undefined) typedOfferSpecificFieldValues.screenSize_in = screenSize;
            else delete typedOfferSpecificFieldValues.screenSize_in;

            const storageCapacity = parseIntOrUndefined(offerSpecificFieldValues.storageCapacity_gb);
            if (storageCapacity !== undefined) typedOfferSpecificFieldValues.storageCapacity_gb = storageCapacity;
            else delete typedOfferSpecificFieldValues.storageCapacity_gb;

            const ram = parseIntOrUndefined(offerSpecificFieldValues.ram_gb);
            if (ram !== undefined) typedOfferSpecificFieldValues.ram_gb = ram;
            else delete typedOfferSpecificFieldValues.ram_gb;

            const cameraResolution = parseNumericOrUndefined(offerSpecificFieldValues.cameraResolution_mp);
            if (cameraResolution !== undefined) typedOfferSpecificFieldValues.cameraResolution_mp = cameraResolution;
            else delete typedOfferSpecificFieldValues.cameraResolution_mp;

            const batteryCapacity = parseIntOrUndefined(offerSpecificFieldValues.batteryCapacity_mah);
            if (batteryCapacity !== undefined) typedOfferSpecificFieldValues.batteryCapacity_mah = batteryCapacity;
            else delete typedOfferSpecificFieldValues.batteryCapacity_mah;

            typedOfferSpecificFieldValues.operatingSystem = String(offerSpecificFieldValues.operatingSystem || '');
            typedOfferSpecificFieldValues.color = String(offerSpecificFieldValues.color || '');

            const imei = parseStringOrUndefined(offerSpecificFieldValues.imei);
            if (imei !== undefined) typedOfferSpecificFieldValues.imei = imei;
            else delete typedOfferSpecificFieldValues.imei;

        } else {
            Object.keys(offerSpecificFieldValues).forEach(key => {
                const value = offerSpecificFieldValues[key];
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    typedOfferSpecificFieldValues[key] = value;
                }
            });
        }

        const finalOfferPayload = {
            productModelId: selectedProductModel._id,
            categoryId: finalSelectedLeafCategory._id,
            kind: finalSelectedLeafCategory.slug,
            price: parseFloat(offerDetails.price),
            currency: offerDetails.currency,
            condition: offerDetails.condition,
            description: offerDetails.sellerDescription,
            images: uploadedPhotoUrls,
            stockQuantity: parseInt(offerDetails.stockQuantity, 10),
            ...typedOfferSpecificFieldValues,
        };

        try {
            toast.info("Publication de l'offre...", { id: "submit-toast" });
            const offerResponse = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalOfferPayload),
            });

            const offerData = await offerResponse.json();
            if (!offerResponse.ok) {
                throw new Error(offerData.message || "Échec de la création de l'offre.");
            }
            toast.success("Offre Publiée !", {
                description: `Votre offre pour "${selectedProductModel!.title}" à ${offerData.data?.price || finalOfferPayload.price}€ est en ligne.`,
                action: { label: "Vendre un autre article", onClick: resetSellProcess },
                cancel: { label: "Voir mes offres", onClick: () => router.push('/account/sales') }
            });
            resetSellProcess();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
            toast.error("Erreur Soumission Offre", { description: errorMessage, id: "submit-toast" });
        } finally {
            setIsLoadingSubmitOffer(false);
        }
    }, [session, sessionStatus, offerDetails, selectedProductModel, offerSpecificFieldValues, finalSelectedLeafCategory, resetSellProcess, router]);

    const displayTitle = selectedProductModel?.title || 'N/A';

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

    const displayBrand = selectedProductModel?.brand ? getDisplayString(selectedProductModel.brand) : 'N/A';

    let displayCategoryName: string | undefined = finalSelectedLeafCategory?.name;
    if (!displayCategoryName && selectedProductModel?.category) {
        const categoryData = selectedProductModel.category;
        if (typeof categoryData === 'object' && categoryData !== null && 'name' in categoryData && typeof categoryData.name === 'string') {
            displayCategoryName = categoryData.name;
        } else if (typeof categoryData === 'string' && categoryData) {
            displayCategoryName = categoryData;
        } else if (selectedProductModel.rawCategoryName) {
            displayCategoryName = selectedProductModel.rawCategoryName;
        } else if (categoryData && typeof categoryData.toString === 'function' && categoryData.constructor.name !== 'Object') {
            // Attempt toString() only if it's likely a Mongoose ObjectId or similar, not a plain object
            const categoryString = categoryData.toString();
            if (categoryString !== '[object Object]' && categoryString) {
                displayCategoryName = categoryString;
            }
        }
    }
    const displayCategory = displayCategoryName || 'N/A';

    const displayAsin = selectedProductModel?.rawAsin;

    let displayStandardDescription: string | undefined = 'N/A';
    if (selectedProductModel) {
        if (selectedProductModel.standardDescription) {
            displayStandardDescription = selectedProductModel.standardDescription;
        } else if (selectedProductModel.rawDescription) {
            displayStandardDescription = selectedProductModel.rawDescription + " (Description brute)";
        }
    }

    let displayImageUrls: string[] = ['/images/placeholder-product.png'];
    if (selectedProductModel) {
        const urls = (selectedProductModel.standardImageUrls && selectedProductModel.standardImageUrls.length > 0)
            ? selectedProductModel.standardImageUrls
            : (selectedProductModel.rawImageUrls && selectedProductModel.rawImageUrls.length > 0
                ? selectedProductModel.rawImageUrls
                : null);
        if (urls) displayImageUrls = urls;
    }

    const prepareDisplayData = () => {
        let displayAttributes: Specifications = [];
        if (selectedProductModel) {
            if (selectedProductModel.specifications && selectedProductModel.specifications.length > 0) {
                displayAttributes = selectedProductModel.specifications.map(spec => ({
                    label: spec.label,
                    value: spec.value,
                    unit: spec.unit
                }));
            } else if (selectedProductModel.rawAttributes && selectedProductModel.rawAttributes.length > 0) {
                displayAttributes = selectedProductModel.rawAttributes.map(attr => ({
                    label: attr.label,
                    value: attr.value,
                }));
            }
        }
        return { displayAttributes };
    };
    const { displayAttributes } = prepareDisplayData();
    const conditionOptions = [
        { value: "new", label: "Neuf (jamais utilisé, emballage d'origine)" },
        { value: "like-new", label: "Comme neuf (utilisé quelques fois, aucune trace)" },
        { value: "good", label: "Bon état (traces d'usure légères)" },
        { value: "fair", label: "État correct (traces d'usure visibles, fonctionnel)" },
        { value: "poor", label: "Mauvais état (endommagé mais peut-être fonctionnel/pour pièces)" }
    ];

    const renderCategoryDropdowns = () => {
        return categoryDropdowns.map((dropdown, index) => (
            <div key={`cat-level-${index}`} className="mb-4">
                <Label htmlFor={`category-level-${index}`}>{dropdown.level === 0 ? "1. Catégorie Principale" : `Sous-catégorie (Niv. ${dropdown.level + 1})`}</Label>
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

    return (
        <div className="container mx-auto py-8 px-4 md:px-0">
            <h1 className="text-3xl font-bold mb-4 text-center">Vendez votre article sur ReMarket</h1>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
                Suivez ces étapes simples pour lister votre produit et toucher des milliers d&apos;acheteurs.
            </p>

            <div className="max-w-2xl mx-auto mb-8">
                <div className="flex justify-between mb-1">
                    <span className={`text-sm font-medium ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Étape 1: Produit</span>
                    <span className={`text-sm font-medium ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Étape 2: Offre</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                    <div className={`bg-primary h-2.5 rounded-full transition-all duration-500 ease-out ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
                </div>
            </div>

            {step === 1 && (
                <Card className="max-w-2xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center"><CheckCircle className="h-6 w-6 mr-2 text-primary" /> Identifier votre produit</CardTitle>
                        <CardDescription>
                            Sélectionnez la catégorie de votre produit, puis la marque et le modèle précis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {renderCategoryDropdowns()}

                        {finalSelectedLeafCategory && (
                            <div>
                                <Label htmlFor="brand">2. Marque</Label>
                                <Select
                                    value={selectedBrandId || ''}
                                    onValueChange={handleSelectBrand}
                                    disabled={!finalSelectedLeafCategory || isLoadingBrands || isLoadingFullProduct || isLoadingCreate}
                                >
                                    <SelectTrigger id="brand" className="bg-input">
                                        <SelectValue placeholder={isLoadingBrands ? "Chargement..." : "Sélectionnez une marque"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.length > 0 ? (
                                            brands.map(brand => (
                                                <SelectItem key={brand.slug} value={brand.slug}>{brand.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-brand" disabled>{isLoadingBrands ? "Chargement..." : "Aucune marque disponible"}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {finalSelectedLeafCategory && selectedBrandId && (
                            <div>
                                <Label htmlFor="productModelReMarket">3. Modèle de produit ReMarket</Label>
                                <Select
                                    value={selectedProductModelReMarketId || ''}
                                    onValueChange={handleSelectProductModelReMarket}
                                    disabled={isLoadingProductModels || isLoadingFullProduct || isLoadingCreate}
                                >
                                    <SelectTrigger id="productModelReMarket" className="bg-input">
                                        <SelectValue placeholder={isLoadingProductModels ? "Chargement..." : (isLoadingFullProduct ? "Vérification..." : "Sélectionnez ou créez produit")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productModelsReMarketSelectItems.length > 0 ? (
                                            productModelsReMarketSelectItems.map(pm => (
                                                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-pm" disabled>{isLoadingProductModels ? "Chargement..." : "Aucun produit (ou créez-en un)"}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCreateByName && selectedBrandId && finalSelectedLeafCategory && (
                            <Card className="mt-6 bg-muted/50 p-4 sm:p-6 border-dashed">
                                <CardHeader className="p-0 mb-3">
                                    <CardTitle className="text-lg">Nouveau Produit ReMarket</CardTitle>
                                    <CardDescription>
                                        Votre produit n&apos;est pas listé ? Décrivez-le. La marque <span className="font-semibold text-primary">{brands.find(b => b.slug === selectedBrandId)?.name || ''}</span> sera ajoutée.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <form onSubmit={handleScrapeNewProductModel} className="space-y-4">
                                        <div>
                                            <Label htmlFor="newProductModelName">Nom précis du produit (modèle, couleur, capacité...)</Label>
                                            <Input
                                                id="newProductModelName"
                                                type="text"
                                                value={newProductModelName}
                                                onChange={(e) => setNewProductModelName(e.target.value)}
                                                placeholder={`Ex: Galaxy S22 Ultra 256Go Noir (sans la marque)`}
                                                disabled={isLoadingCreate || isLoadingFullProduct}
                                                className="bg-background"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full sm:w-auto"
                                            disabled={isLoadingCreate || isLoadingFullProduct || !newProductModelName.trim() || !finalSelectedLeafCategory?.slug || !selectedBrandId}
                                        >
                                            {isLoadingCreate || isLoadingFullProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                            {isLoadingCreate ? 'Recherche en cours...' : (isLoadingFullProduct ? 'Finalisation...' : 'Rechercher et Créer Produit')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                    <CardFooter className="pt-6">
                        {selectedProductModel && selectedProductModelReMarketId !== NOT_LISTED_ID && !isLoadingFullProduct && (
                            <Button onClick={() => setStep(2)} className="w-full" >
                                <ArrowRight className="mr-2 h-4 w-4" />Continuer vers l&apos;offre
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}

            {step === 2 && selectedProductModel && (
                <Card className="max-w-2xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center"><CheckCircle className="h-6 w-6 mr-2 text-primary" /> Décrire votre offre</CardTitle>
                        <CardDescription>
                            Produit ReMarket : <span className="font-semibold text-foreground">{displayTitle}</span> par <span className="font-semibold text-foreground">{displayBrand}</span>.
                            {displayAsin && <span className="text-xs text-muted-foreground block">Référence source (ASIN): {displayAsin}</span>}
                        </CardDescription>
                    </CardHeader>
                    <form id="offerForm" onSubmit={handleSubmitOffer}>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <Label htmlFor="price">Votre Prix de Vente (€) <span className="text-destructive">*</span></Label>
                                <Input id="price" name="price" type="number" value={offerDetails.price} onChange={handleOfferDetailsChange} placeholder="Ex: 450.00" required className="bg-input" />
                            </div>
                            <div>
                                <Label htmlFor="condition">État de votre article <span className="text-destructive">*</span></Label>
                                <Select value={offerDetails.condition} onValueChange={handleConditionChange}>
                                    <SelectTrigger id="condition" className="bg-input"><SelectValue placeholder="Sélectionnez l'état" /></SelectTrigger>
                                    <SelectContent>
                                        {conditionOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="stockQuantity">Quantité en stock <span className="text-destructive">*</span></Label>
                                <Input id="stockQuantity" name="stockQuantity" type="number" value={offerDetails.stockQuantity} onChange={handleOfferDetailsChange} placeholder="Ex: 1" required min="1" className="bg-input" />
                            </div>
                            <div>
                                <Label htmlFor="sellerDescription">Description de votre offre (optionnel)</Label>
                                <Textarea id="sellerDescription" name="sellerDescription" value={offerDetails.sellerDescription} onChange={handleOfferDetailsChange} placeholder="Ex: Vendu avec boîte d&apos;origine... (min. 10 caractères)" rows={4} className="bg-input" minLength={10} />
                                <p className="text-xs text-muted-foreground mt-1">Soyez précis pour éviter les surprises ! (10 caractères minimum)</p>
                            </div>

                            {categorySpecificFormFields.length > 0 && (
                                <Card className="bg-muted/40 p-4 border-dashed">
                                    <CardHeader className="p-0 mb-3">
                                        <CardTitle className="text-md">Détails spécifiques à &quot;{finalSelectedLeafCategory?.name}&quot;</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 space-y-4">
                                        {categorySpecificFormFields.map(field => (
                                            <div key={field.name}>
                                                <Label htmlFor={field.name}>
                                                    {field.label}
                                                    {field.required && <span className="text-destructive">*</span>}
                                                </Label>
                                                {field.type === 'text' && (
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        type="text"
                                                        value={String(offerSpecificFieldValues[field.name] || '')}
                                                        onChange={(e) => handleSpecificFieldChange(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                        minLength={field.minLength}
                                                        maxLength={field.maxLength}
                                                        className="bg-input"
                                                    />
                                                )}
                                                {field.type === 'number' && (
                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        type="number"
                                                        value={String(offerSpecificFieldValues[field.name] || '')}
                                                        onChange={(e) => handleSpecificFieldChange(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                        min={field.min}
                                                        max={field.max}
                                                        className="bg-input"
                                                    />
                                                )}
                                                {field.type === 'textarea' && (
                                                    <Textarea
                                                        id={field.name}
                                                        name={field.name}
                                                        value={String(offerSpecificFieldValues[field.name] || '')}
                                                        onChange={(e) => handleSpecificFieldChange(field.name, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                        minLength={field.minLength}
                                                        maxLength={field.maxLength}
                                                        rows={3}
                                                        className="bg-input"
                                                    />
                                                )}
                                                {field.type === 'select' && field.options && (
                                                    <Select
                                                        name={field.name}
                                                        value={String(offerSpecificFieldValues[field.name] || '')}
                                                        onValueChange={(value) => handleSpecificFieldChange(field.name, value)}
                                                        required={field.required}
                                                    >
                                                        <SelectTrigger id={field.name} className="bg-input">
                                                            <SelectValue placeholder={field.placeholder || 'Sélectionnez...'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {field.options.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="bg-muted/30 p-4">
                                <CardHeader className="p-0 mb-2"><CardTitle className="text-base">Rappel du produit ReMarket</CardTitle></CardHeader>
                                <CardContent className="p-0 flex flex-col sm:flex-row gap-4 items-start">
                                    <Image src={displayImageUrls[0]} alt={displayTitle || 'Image produit'} width={100} height={100} className="w-24 h-24 object-contain rounded-md border bg-background flex-shrink-0" />
                                    <div className="text-xs space-y-1">
                                        <p><span className="font-medium">Titre:</span> {displayTitle}</p>
                                        <p><span className="font-medium">Marque:</span> {displayBrand}</p>
                                        <p><span className="font-medium">Catégorie:</span> {displayCategory}</p>
                                        {displayStandardDescription && <p className="truncate-3-lines"><span className="font-medium">Description std.:</span> {displayStandardDescription}</p>}
                                        {displayAttributes && displayAttributes.length > 0 && (
                                            <details className="mt-1"><summary className="cursor-pointer text-primary hover:underline">Afficher les {displayAttributes.length} spécifications</summary>
                                                <ul className="mt-1 list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto">
                                                    {displayAttributes.map((attr: AttributeItem) => (<li key={attr.label}>{attr.label}: {attr.value}{attr.unit ? ` ${attr.unit}` : ''}</li>))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <div>
                                <Label htmlFor="photos">Vos photos de l&apos;article (jusqu&apos;à 5)</Label>
                                <Input id="photos" name="photos" type="file" multiple onChange={handlePhotoChange} accept="image/jpeg, image/png, image/webp" className="bg-input" />
                                {offerDetails.photos.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {offerDetails.photos.map((file, index) => (<div key={index} className="relative aspect-square"><Image src={URL.createObjectURL(file)} alt={`Photo ${index + 1}`} fill className="object-cover rounded-md" /></div>))}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Important pour prouver l&apos;état et rassurer les acheteurs.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6">
                            <Button variant="outline" onClick={() => setStep(1)} type="button"><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
                            <Button type="submit" form="offerForm" disabled={isLoadingSubmitOffer || sessionStatus !== 'authenticated'} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                                {isLoadingSubmitOffer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                {isLoadingSubmitOffer ? 'Publication en cours...' : 'Publier mon offre'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    );
}