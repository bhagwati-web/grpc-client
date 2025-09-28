import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface KeyValuePair {
    id: string;
    key: string;
    value: string;
}

interface KeyValueInputProps {
    label: string;
    initialData?: Record<string, string>;
    onDataChange: (data: Record<string, string>) => void;
    placeholder?: {
        key?: string;
        value?: string;
    };
}

export function KeyValueInput({ 
    label, 
    initialData = {}, 
    onDataChange, 
    placeholder = { key: "Enter key", value: "Enter value" } 
}: KeyValueInputProps) {
    // Initialize state only once from initialData
    const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
        const pairsFromData = Object.entries(initialData).map(([key, value], index) => ({
            id: `pair-${Date.now()}-${index}`,
            key,
            value
        }));
        
        // If no initial data, start with one empty pair
        return pairsFromData.length === 0 
            ? [{ id: `pair-${Date.now()}`, key: "", value: "" }]
            : pairsFromData;
    });

    // Debounce timer ref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Convert pairs array back to object and notify parent
    const notifyParent = useCallback((currentPairs: KeyValuePair[]) => {
        const data: Record<string, string> = {};
        currentPairs.forEach(pair => {
            if (pair.key.trim() && pair.value.trim()) {
                data[pair.key.trim()] = pair.value.trim();
            }
        });
        onDataChange(data);
    }, [onDataChange]);

    // Debounced function to notify parent
    const debouncedNotifyParent = useCallback((currentPairs: KeyValuePair[]) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            notifyParent(currentPairs);
        }, 300); // 300ms debounce delay
    }, [notifyParent]);

    // Notify parent when pairs change (debounced)
    useEffect(() => {
        debouncedNotifyParent(pairs);
        
        // Cleanup function to clear timer on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [pairs, debouncedNotifyParent]);

    const addPair = () => {
        const newPairs = [...pairs, { id: `pair-${Date.now()}`, key: "", value: "" }];
        setPairs(newPairs);
        // Immediate update for add operation (no debounce needed)
        notifyParent(newPairs);
    };

    const removePair = (id: string) => {
        let newPairs: KeyValuePair[];
        if (pairs.length <= 1) {
            // Always keep at least one pair
            newPairs = [{ id: `pair-${Date.now()}`, key: "", value: "" }];
        } else {
            newPairs = pairs.filter(pair => pair.id !== id);
        }
        setPairs(newPairs);
        // Immediate update for remove operation (no debounce needed)
        notifyParent(newPairs);
    };

    const updatePair = (id: string, field: 'key' | 'value', newValue: string) => {
        const newPairs = pairs.map(pair => 
            pair.id === id ? { ...pair, [field]: newValue } : pair
        );
        setPairs(newPairs);
    };

    return (
        <div className="space-y-3">
            {label && <Label>{label}</Label>}
            <Card>
                <CardContent className="p-4">
                    <div className="space-y-3">
                        {pairs.map((pair) => (
                            <div key={pair.id} className="flex items-center gap-2">
                                <div className="flex-1">
                                    <Input
                                        placeholder={placeholder.key}
                                        value={pair.key}
                                        onChange={(e) => updatePair(pair.id, 'key', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        placeholder={placeholder.value}
                                        value={pair.value}
                                        onChange={(e) => updatePair(pair.id, 'value', e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removePair(pair.id)}
                                    className="h-9 w-9 p-0 flex-shrink-0"
                                    title="Remove this key-value pair"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addPair}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Pair
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}