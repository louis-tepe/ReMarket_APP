import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface Specification {
    label: string;
    value: string;
    unit?: string;
}

interface OptionChoice {
    optionName: string;
    availableValues: string[];
}

interface QA {
    question: string;
    answer: string;
}

interface ProductDetailsTabsProps {
    standardDescription: string;
    keyFeatures?: string[];
    specifications?: Specification[];
    optionChoicesIdealo?: OptionChoice[];
    qasIdealo?: QA[];
}

/**
 * Renders a tabbed interface to display various details about a product,
 * including its description, key features, specifications, options, and Q&As.
 * Tabs are conditionally rendered based on the availability of their respective data.
 */
export default function ProductDetailsTabs({
    standardDescription,
    keyFeatures,
    specifications,
    optionChoicesIdealo,
    qasIdealo
}: ProductDetailsTabsProps) {
    const tabs = [
        { value: "description", label: "Description", content: standardDescription, condition: true },
        { value: "features", label: "Points Clés", content: keyFeatures, condition: keyFeatures && keyFeatures.length > 0 },
        { value: "specs", label: "Spécifications", content: specifications, condition: specifications && specifications.length > 0 },
        { value: "options", label: "Options", content: optionChoicesIdealo, condition: optionChoicesIdealo && optionChoicesIdealo.length > 0 },
        { value: "qas", label: "Q&R", content: qasIdealo, condition: qasIdealo && qasIdealo.length > 0 },
    ].filter(tab => tab.condition);

    return (
        <Tabs defaultValue={tabs[0]?.value || "description"} className="w-full">
            <TabsList className={`grid w-full grid-cols-${tabs.length || 1} mb-4`}>
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="description">
                <Card>
                    <CardHeader>
                        <CardTitle>Description Standardisée</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <p>{standardDescription || 'Aucune description détaillée disponible.'}</p>
                    </CardContent>
                </Card>
            </TabsContent>
            {tabs.find(tab => tab.value === 'features') && keyFeatures && keyFeatures.length > 0 && (
                <TabsContent value="features">
                    <Card>
                        <CardHeader>
                            <CardTitle>Caractéristiques Principales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {keyFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
            {tabs.find(tab => tab.value === 'specs') && specifications && specifications.length > 0 && (
                <TabsContent value="specs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Détails Techniques</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                {specifications.map((spec, index) => (
                                    <li key={index} className="flex justify-between border-b pb-1 last:border-b-0">
                                        <span className="font-medium text-foreground">{spec.label}:</span>
                                        <span className="text-muted-foreground">{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
            {tabs.find(tab => tab.value === 'options') && optionChoicesIdealo && optionChoicesIdealo.length > 0 && (
                <TabsContent value="options">
                    <Card>
                        <CardHeader><CardTitle>Options Disponibles (selon Idealo)</CardTitle></CardHeader>
                        <CardContent className="text-sm">
                            {optionChoicesIdealo.map((option, index) => (
                                <div key={index} className="mb-2">
                                    <p className="font-semibold">{option.optionName}:</p>
                                    <p className="text-muted-foreground">{option.availableValues.join(', ')}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
            {tabs.find(tab => tab.value === 'qas') && qasIdealo && qasIdealo.length > 0 && (
                <TabsContent value="qas">
                    <Card>
                        <CardHeader><CardTitle>Questions & Réponses (selon Idealo)</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {qasIdealo.map((qa, index) => (
                                <div key={index}>
                                    <p className="font-semibold">Q: {qa.question}</p>
                                    <p className="text-muted-foreground">R: {qa.answer}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
        </Tabs>
    );
} 