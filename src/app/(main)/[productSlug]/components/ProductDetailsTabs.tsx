import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    specifications: Specification[];
    keyFeatures?: string[];
    optionChoicesLedenicheur?: OptionChoice[];
    qasLedenicheur?: QA[];
}

/**
 * Renders a tabbed interface to display various details about a product,
 * including its description, key features, specifications, options, and Q&As.
 * Tabs are conditionally rendered based on the availability of their respective data.
 */
export default function ProductDetailsTabs({
    specifications,
    keyFeatures,
    optionChoicesLedenicheur,
    qasLedenicheur
}: ProductDetailsTabsProps) {
    // Prepare tab data with visibility conditions
    const tabs = [
        { value: "specifications", label: "Spécifications", content: specifications, condition: specifications && specifications.length > 0 },
        { value: "features", label: "Caractéristiques", content: keyFeatures, condition: keyFeatures && keyFeatures.length > 0 },
        { value: "options", label: "Options", content: optionChoicesLedenicheur, condition: optionChoicesLedenicheur && optionChoicesLedenicheur.length > 0 },
        { value: "qas", label: "Q&R", content: qasLedenicheur, condition: qasLedenicheur && qasLedenicheur.length > 0 },
    ];

    // Filter tabs to show only those with content
    const visibleTabs = tabs.filter(tab => tab.condition);

    if (visibleTabs.length === 0) {
        return null; // Don't render anything if no tabs have content
    }

    return (
        <Tabs defaultValue={visibleTabs[0]?.value} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                {visibleTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="specifications" className="space-y-4">
                {tabs.find(tab => tab.value === 'specifications') && specifications && specifications.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Spécifications Techniques</CardTitle>
                            <CardDescription>Détails techniques du produit</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {specifications.map((spec, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                        <span className="font-medium text-gray-700">{spec.label}</span>
                                        <span className="text-gray-900">
                                            {spec.value}
                                            {spec.unit && <span className="text-gray-500 ml-1">{spec.unit}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
                {tabs.find(tab => tab.value === 'features') && keyFeatures && keyFeatures.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Caractéristiques Principales</CardTitle>
                            <CardDescription>Points forts du produit</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {keyFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="text-green-500 mr-2 mt-1">✓</span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
                {tabs.find(tab => tab.value === 'options') && optionChoicesLedenicheur && optionChoicesLedenicheur.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Options Disponibles (selon Ledenicheur)</CardTitle></CardHeader>
                        <CardContent>
                            {optionChoicesLedenicheur.map((option, index) => (
                                <div key={index} className="mb-4">
                                    <h4 className="font-semibold mb-2">{option.optionName}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {option.availableValues.map((value, valueIndex) => (
                                            <span key={valueIndex} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{value}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="qas" className="space-y-4">
                {tabs.find(tab => tab.value === 'qas') && qasLedenicheur && qasLedenicheur.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Questions & Réponses (selon Ledenicheur)</CardTitle></CardHeader>
                        <CardContent>
                            {qasLedenicheur.map((qa, index) => (
                                <div key={index} className="mb-4 last:mb-0">
                                    <h4 className="font-semibold text-gray-800 mb-1">Q: {qa.question}</h4>
                                    <p className="text-gray-600 ml-4">R: {qa.answer}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    );
} 