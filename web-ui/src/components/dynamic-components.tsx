import React, { useState } from "react";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"
import { useTheme } from "@/providers/theme-provider"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { getClassNameForField } from "@/utils/app-utils";

// Improved type definitions
interface EnumValue {
    name: string;
    number: number;
}

interface NestedMessage {
    fields: Field[];
}

interface Field {
    name: string;
    type: string;
    enumValues?: EnumValue[];
    nestedMessage?: NestedMessage;
    isArray: boolean;
    description: string;
    typeName?: string;
    required?: boolean;  // Add required field support
    number?: number;
    label?: string;
}

interface DynamicFieldProps {
    field: Field;
    onChange: (fieldName: string, value: any) => void;
    onRemove: (fieldName: string) => void;
    isRootElement: boolean;
    formData: Record<string, any>;
    key?: any;
}

interface DynamicFieldHeader {
    field: Field;
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
}


// Helper function to generate consistent colors for field names
const generateFieldColor = (fieldName: string, isDarkMode: boolean = false): string => {
    // Generate consistent color based on field name hash
    let hash = 0;
    for (let i = 0; i < fieldName.length; i++) {
        hash = fieldName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    if (isDarkMode) {
        // For dark mode: use subtle dark colors with better contrast
        // Generate colors in the 30-70 range for RGB values to ensure visibility
        const r = 30 + Math.abs(hash % 40);
        const g = 30 + Math.abs((hash >> 8) % 40);
        const b = 30 + Math.abs((hash >> 16) % 40);
        
        // Ensure at least one component is brighter for better visibility
        const maxComponent = Math.max(r, g, b);
        const adjustment = maxComponent < 50 ? 20 : 0;
        
        return `rgba(${r + adjustment}, ${g + adjustment}, ${b + adjustment}, 0.3)`;
    } else {
        // For light mode: light colors with transparency
        const r = 236 + Math.abs(hash % 20);
        const g = 236 + Math.abs((hash >> 8) % 20);
        const b = 236 + Math.abs((hash >> 16) % 20);
        
        return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }
};

// Helper function to generate border colors for field names
const generateFieldBorderColor = (fieldName: string, isDarkMode: boolean = false): string => {
    let hash = 0;
    for (let i = 0; i < fieldName.length; i++) {
        hash = fieldName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    if (isDarkMode) {
        // For dark mode: brighter border colors for definition
        const r = 100 + Math.abs(hash % 100);
        const g = 100 + Math.abs((hash >> 8) % 100);
        const b = 100 + Math.abs((hash >> 16) % 100);
        
        return `rgba(${r}, ${g}, ${b}, 0.4)`;
    } else {
        // For light mode: darker border colors
        const r = 180 + Math.abs(hash % 50);
        const g = 180 + Math.abs((hash >> 8) % 50);
        const b = 180 + Math.abs((hash >> 16) % 50);
        
        return `rgba(${r}, ${g}, ${b}, 0.6)`;
    }
};


// Helper component to render the form fields dynamically
export const DynamicField: React.FC<DynamicFieldProps> = React.memo(({ field, onChange, onRemove, isRootElement, formData, key }) => {
    const { name, type, enumValues, nestedMessage, isArray, description, required } = field;
    const { theme } = useTheme();
    
    // Determine if we're in dark mode
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Conservative expansion logic: prevent huge DOM rendering
    const shouldExpandByDefault = () => {
        if (isRootElement) {
            // First level: only expand simple fields, keep all complex types collapsed
            if (type === 'TYPE_MESSAGE' || isArray) {
                return false; // Always start collapsed for performance
            }
            return true; // Expand simple fields (string, number, bool, enum)
        } else {
            // Nested levels: always start collapsed for performance
            return false;
        }
    };
    
    const [isExpanded, setIsExpanded] = useState(shouldExpandByDefault());
    const [isEnabled, setIsEnabled] = useState(formData && formData[name] ? true : false);
    const [arrayItems, setArrayItems] = useState(formData && formData[name] ? formData[name] : []);
    
    // Generate consistent color for this field
    const fieldColor = React.useMemo(() => generateFieldColor(name, isDarkMode), [name, isDarkMode]);
    const fieldBorderColor = React.useMemo(() => generateFieldBorderColor(name, isDarkMode), [name, isDarkMode]);

    // Helper function to format field label with required indicator
    const getFieldLabel = (fieldName: string, isRequired?: boolean) => (
        <span>
            {fieldName}
            {isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </span>
    );

    // Helper function to check if a required field is missing
    const isRequiredFieldMissing = (fieldName: string, isRequired?: boolean) => {
        if (!isRequired) return false;
        const value = getFormFieldValue(fieldName);
        return !value || (typeof value === 'string' && value.trim() === '');
    };

    const handleAddItem = (e: any) => {
        e.preventDefault();
        setArrayItems([...arrayItems, {}]);
    };

    const handleDeleteFromMessage = (value: any) => {
        console.log("value", value);
        // delete that key from the formData
        if (value === false && formData[name]) {
            onRemove(name);
        }
        setArrayItems([]);
        setIsEnabled(value)
    };


    const handleRemoveItem = (e: any, index: any) => {
        e.preventDefault();
        setArrayItems(arrayItems.filter((_: any, i: number) => {
            formData[name] && delete formData[name][index];
            return i !== index
        }));
    };

    const handleSelectChange = (value: any) => {
        //setSelectedValue(value);
        onChange(name, value);
    };

    const getStyleforField = (elemType: string): Record<string, string> => {
        let defaultElements: Record<string, string> = {}
        let messageElement: Record<string, string> = {}
        if (isRootElement) {
            defaultElements = { marginBottom: '5px', padding: '5px' }
        }
        else {
            defaultElements = { marginBottom: '5px', marginTop: '5px', padding: '5px' }
        }
        messageElement = { 
            margin: isRootElement ? '0px' : '10px', 
            padding: '10px', 
            background: fieldColor,
            border: `1px solid ${fieldBorderColor}`,
            borderRadius: '6px'
        }

        return { defaultElements, messageElement }[String(elemType)] || defaultElements;
    }

    const getFormFieldValue = (fieldName: string) => {
        let current: any = formData;
        const keys = fieldName.split('.');
        keys.forEach((key: any) => {
            if (key.includes('[')) {
                const [arrayKey, arrayIndex] = key.split(/[\[\]]/).filter(Boolean);
                current = current[arrayKey] ? current[arrayKey][arrayIndex] : '';
            } else {
                current = current && current[fieldName] ? current[fieldName] : '';
            }
        });
        return current
    }

    // Common array field wrapper to reduce duplication
    const renderArrayField = (renderSingleField: (index: number) => React.ReactNode) => (
        <div className={getClassNameForField(field) + " bg-white dark:bg-gray-800"} style={getStyleforField('defaultElements')}>
            <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
            {!isExpanded && (
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-8 mb-2">
                    Array field
                    {arrayItems && arrayItems.length > 0 && (
                        <span className="text-green-600 dark:text-green-400 ml-2 font-semibold">
                            ● {arrayItems.length} item{arrayItems.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="text-blue-500 dark:text-blue-400 ml-2 text-xs">← Click to expand</span>
                </div>
            )}
            {isExpanded && (
                <div className="flex space-x-4 mt-2 items-center">
                    <div className="flex-col space-x-2">
                        <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                    </div>
                    <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                        {arrayItems && arrayItems.map((_: any, index: number) => (
                            <div key={index} className="flex min-w-48 max-w-96 items-end space-x-2 mb-2">
                                {renderSingleField(index)}
                                <ButtonRemove onClick={(e: any) => handleRemoveItem(e, index)} isEnabled={isEnabled} />
                            </div>
                        ))}
                        <ButtonAdd onClick={handleAddItem} isEnabled={isEnabled} />
                    </div>
                </div>
            )}
        </div>
    );

    if (name == 'repeated_enum_annotation')
        console.log('field Info', field, formData, name);

    if (type === 'TYPE_STRING' || type === 'TYPE_BYTES') {

        if (isArray) {
            return renderArrayField((index: number) => (
                <Input
                    type="text"
                    placeholder={name}
                    onChange={(e) => onChange(`${name}[${index}]`, e.target.value)}
                    value={getFormFieldValue(`${name}[${index}]`)}
                    disabled={!isEnabled}
                />
            ));
        }

        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>
                        {getFieldLabel(name, required)}
                    </Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder={name + (required ? ' (required)' : '')}
                        onChange={(e) => onChange(name, e.target.value)}
                        value={getFormFieldValue(name)}
                        disabled={!isEnabled}
                        className={isRequiredFieldMissing(name, required) ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : ''}
                    />
                </div>
            </div>
        );
    }

    if (type === 'TYPE_INT32' || type === 'TYPE_INT64' || type === 'TYPE_UINT32' || type === 'TYPE_UINT64' || type === 'TYPE_SINT32' || type === 'TYPE_SINT64' || type === 'TYPE_DOUBLE' || type === 'TYPE_FLOAT' || type === 'TYPE_FIXED32' || type === 'TYPE_FIXED64' || type === 'TYPE_SFIXED32' || type === 'TYPE_SFIXED64') {

        if (isArray) {
            return renderArrayField((index: number) => (
                <Input
                    type="text"
                    placeholder={name}
                    onChange={(e) => onChange(`${name}[${index}]`, parseInt(e.target.value, 10))}
                    value={getFormFieldValue(`${name}[${index}]`)}
                    disabled={!isEnabled}
                />
            ));
        }

        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col">
                    <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>
                        {getFieldLabel(name, required)}
                    </Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder={name + (required ? ' (required)' : '')}
                        onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
                        value={getFormFieldValue(name)}
                        disabled={!isEnabled}
                        className={isRequiredFieldMissing(name, required) ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : ''}
                    />
                </div>
            </div>
        );
    }

    if (type === 'TYPE_BOOL') {

        if (isArray) {
            return (
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                    {isExpanded && (
                        <div className="flex space-x-4 mt-2 items-center">
                            <div className=" flex-col space-x-2">
                                <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                            </div>
                            {arrayItems && arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex min-w-48 max-w-96 items-end space-x-2 mb-2">
                                    <Checkbox
                                        id={name}
                                        onCheckedChange={(value) => onChange(`${name}[${index}]`, value)}
                                        checked={getFormFieldValue(`${name}[${index}]`)}
                                        disabled={!isEnabled}
                                    />
                                    <ButtonRemove onClick={(e: any) => handleRemoveItem(e, index)} isEnabled={isEnabled} />
                                </div>
                            ))}
                            <ButtonAdd onClick={handleAddItem} isEnabled={isEnabled} />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field) + " flex items-center space-x-2"} style={getStyleforField('defaultElements')}>
                    <Checkbox
                        id={name}
                        onCheckedChange={(value) => onChange(name, value)}
                        checked={getFormFieldValue(name)}
                        disabled={!isEnabled}
                    />
                    <label
                        htmlFor={name}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        title={description}
                    >
                        {name}
                    </label>
                </div>
            </div>
        );
    }

    if (type === 'TYPE_ENUM' && enumValues) {

        if (isArray) {
            return (
                <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                    <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                    {isExpanded && (
                        <div className="flex space-x-4 mt-2 items-center">
                            <div className="space-x-2">
                                <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                            </div>
                            <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                                {arrayItems && arrayItems.map((_: any, index: number) => (
                                    <div key={index} className="flex items-end space-x-2 mt-4 mb-2">
                                        <Select
                                            value={getFormFieldValue(`${name}[${index}]`)}
                                            onValueChange={(value) => onChange(`${name}[${index}]`, value)}
                                        >
                                            <SelectTrigger id={name}>
                                                <SelectValue placeholder={`Select ${name}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {enumValues.map((option: any, index: any) => (
                                                    <SelectItem key={index} value={option.name}>{option.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <ButtonRemove onClick={(e: any) => handleRemoveItem(e, index)} isEnabled={isEnabled} />

                                    </div>
                                ))}
                                <ButtonAdd onClick={handleAddItem} isEnabled={isEnabled} />
                            </div>
                        </div>

                    )}
                </div>
            );
        }

        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className="flex-col mt-4 min-w-48 max-w-96 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name}</Label>
                    <Select
                        value={getFormFieldValue(name)}
                        onValueChange={handleSelectChange}
                        disabled={!isEnabled}
                    >
                        <SelectTrigger id={name}>
                            <SelectValue placeholder={`Select ${name}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {enumValues.map((option: any, index: any) => (
                                <SelectItem key={index} value={option.name}>{option.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    // Handle Map types (they appear as repeated messages with key/value fields)
    if (type === 'TYPE_MESSAGE' && nestedMessage && isArray && 
        nestedMessage.fields?.length === 2 && 
        nestedMessage.fields.some((f: any) => f.name === 'key') && 
        nestedMessage.fields.some((f: any) => f.name === 'value')) {
        
        return (
            <div className={getClassNameForField(field)} style={getStyleforField('messageElement')}>
                <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                {isExpanded && (
                    <div className="flex space-x-4 mt-2 items-center">
                        <div className="space-x-2">
                            <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                        </div>
                        <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                            <Label className="text-sm text-gray-600 dark:text-gray-300">Map entries (key: value pairs)</Label>
                            {arrayItems && arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2 p-2 border rounded">
                                    <div className="flex-1">
                                        <Label className="text-xs">Key</Label>
                                        <Input
                                            type="text"
                                            placeholder="key"
                                            onChange={(e) => onChange(`${name}[${index}].key`, e.target.value)}
                                            value={getFormFieldValue(`${name}[${index}].key`)}
                                            disabled={!isEnabled}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs">Value</Label>
                                        <Input
                                            type="text"
                                            placeholder="value"
                                            onChange={(e) => onChange(`${name}[${index}].value`, e.target.value)}
                                            value={getFormFieldValue(`${name}[${index}].value`)}
                                            disabled={!isEnabled}
                                        />
                                    </div>
                                    <ButtonRemove onClick={(e: any) => handleRemoveItem(e, index)} isEnabled={isEnabled} />
                                </div>
                            ))}
                            <ButtonAdd onClick={handleAddItem} isEnabled={isEnabled} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'TYPE_MESSAGE' && nestedMessage) {

        if (isArray) {
            return (
                <div className={getClassNameForField(field)} style={getStyleforField('messageElement')}>
                    <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                    {isExpanded && (
                        <div className="flex space-x-4 mt-2 items-center">
                            <div className="space-x-2">
                                <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                            </div>
                            <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>

                                {arrayItems && arrayItems.map((_: any, index: number) => (
                                    <div key={index} className="flex items-end space-x-2 mb-2">
                                        {nestedMessage?.fields?.map((nestedField: any) => (
                                            <DynamicField
                                                key={nestedField.name}
                                                isRootElement={false}
                                                field={{ ...nestedField }}
                                                onChange={(fieldName: string, value: any) =>
                                                    onChange(`${name}[${index}].${fieldName}`, value)
                                                }
                                                onRemove={(fieldName: string) => onRemove(`${name}[${index}].${fieldName}`) // Remove the key from the formData

                                                }
                                                formData={formData && formData[name] && formData[name][index] ? formData[name][index] : {}}

                                            />
                                        ))}
                                        <ButtonRemove onClick={(e: any) => handleRemoveItem(e, index)} isEnabled={isEnabled} />
                                    </div>
                                ))}
                                <ButtonAdd onClick={handleAddItem} isEnabled={isEnabled} />
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={getClassNameForField(field)} style={getStyleforField('messageElement')} key={`${key}-${name}`}>
                <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                {!isExpanded && nestedMessage?.fields && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-8 mb-2">
                        {nestedMessage.fields.length} field{nestedMessage.fields.length !== 1 ? 's' : ''} 
                        {formData && formData[name] && Object.keys(formData[name]).length > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-2 font-semibold">
                                ● {Object.keys(formData[name]).length} filled
                            </span>
                        )}
                        <span className="text-blue-500 dark:text-blue-400 ml-2 text-xs">← Click to expand</span>
                    </div>
                )}
                {isExpanded && nestedMessage?.fields?.map((nestedField: any, index: number) => (
                    <div className="flex space-x-4 mt-2 items-center">

                        <DynamicField
                            key={index}
                            field={nestedField}
                            isRootElement={false}
                            onChange={(fieldName: string, value: any) =>
                                onChange(`${name}.${fieldName}`, value)
                            }
                            onRemove={(fieldName: string) => onRemove(`${name}.${fieldName}`)}
                            formData={formData && formData[name] ? formData[name] : {}}
                        />
                    </div>
                ))}
            </div>
        );
    }

    // Handle well-known types
    if (field.typeName?.includes('google.protobuf.Timestamp')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (Timestamp)</Label>
                    <Input
                        type="datetime-local"
                        id={name}
                        placeholder="YYYY-MM-DDTHH:mm:ss"
                        onChange={(e) => {
                            const isoString = e.target.value ? new Date(e.target.value).toISOString() : '';
                            onChange(name, { seconds: Math.floor(new Date(isoString).getTime() / 1000), nanos: 0 });
                        }}
                        value={formData[name] ? new Date(formData[name].seconds * 1000).toISOString().slice(0, 16) : ''}
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.Duration')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (Duration in seconds)</Label>
                    <Input
                        type="number"
                        id={name}
                        placeholder="Duration in seconds"
                        onChange={(e) => onChange(name, { seconds: parseInt(e.target.value, 10) || 0, nanos: 0 })}
                        value={formData[name]?.seconds || ''}
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.Empty')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (Empty)</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder="Empty message"
                        value="{}"
                        disabled={true}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.Struct')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (JSON Struct)</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder='{"key": "value"}'
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value || '{}');
                                onChange(name, { fields: parsed });
                            } catch {
                                onChange(name, { fields: {} });
                            }
                        }}
                        value={formData[name]?.fields ? JSON.stringify(formData[name].fields) : '{}'}
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.Value')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (JSON Value)</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder='Any JSON value: "string", 123, true, null'
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value || 'null');
                                if (typeof parsed === 'string') onChange(name, { stringValue: parsed });
                                else if (typeof parsed === 'number') onChange(name, { numberValue: parsed });
                                else if (typeof parsed === 'boolean') onChange(name, { boolValue: parsed });
                                else if (parsed === null) onChange(name, { nullValue: 0 });
                                else if (Array.isArray(parsed)) onChange(name, { listValue: { values: parsed } });
                                else onChange(name, { structValue: { fields: parsed } });
                            } catch {
                                onChange(name, { nullValue: 0 });
                            }
                        }}
                        value={
                            formData[name]?.stringValue !== undefined ? JSON.stringify(formData[name].stringValue) :
                            formData[name]?.numberValue !== undefined ? formData[name].numberValue :
                            formData[name]?.boolValue !== undefined ? formData[name].boolValue :
                            formData[name]?.listValue ? JSON.stringify(formData[name].listValue.values) :
                            formData[name]?.structValue ? JSON.stringify(formData[name].structValue.fields) :
                            'null'
                        }
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.ListValue')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (JSON Array)</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder='[1, "string", true, null]'
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value || '[]');
                                if (Array.isArray(parsed)) {
                                    onChange(name, { values: parsed.map(v => {
                                        if (typeof v === 'string') return { stringValue: v };
                                        if (typeof v === 'number') return { numberValue: v };
                                        if (typeof v === 'boolean') return { boolValue: v };
                                        if (v === null) return { nullValue: 0 };
                                        return { structValue: { fields: v } };
                                    })});
                                } else {
                                    onChange(name, { values: [] });
                                }
                            } catch {
                                onChange(name, { values: [] });
                            }
                        }}
                        value={formData[name]?.values ? JSON.stringify(formData[name].values.map((v: any) => 
                            v.stringValue !== undefined ? v.stringValue :
                            v.numberValue !== undefined ? v.numberValue :
                            v.boolValue !== undefined ? v.boolValue :
                            v.nullValue !== undefined ? null :
                            v.structValue?.fields || {}
                        )) : '[]'}
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.Any')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (Any Type)</Label>
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Type URL (e.g., type.googleapis.com/package.MessageType)"
                            onChange={(e) => onChange(`${name}.type_url`, e.target.value)}
                            value={getFormFieldValue(`${name}.type_url`)}
                            disabled={!isEnabled}
                        />
                        <Input
                            type="text"
                            placeholder="Value (base64 encoded)"
                            onChange={(e) => onChange(`${name}.value`, e.target.value)}
                            value={getFormFieldValue(`${name}.value`)}
                            disabled={!isEnabled}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (field.typeName?.includes('google.protobuf.NullValue')) {
        return (
            <div className="flex space-x-4 mt-2 items-center">
                <div className="flex-col space-x-2">
                    <Checkbox onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name} (Null)</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder="null"
                        value="null"
                        disabled={true}
                    />
                </div>
            </div>
        );
    }

    return (<div className="mt-4">
        <Label htmlFor={name}>FieldName : {name} <div>Need Handling of {type} {field.typeName ? `(${field.typeName})` : ''}</div></Label>
    </div>);
});



const FieldHeader = React.memo(({ isExpanded, setIsExpanded, field }: DynamicFieldHeader) => {
    const { name, description, typeName, required } = field;
    return (
        <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors border-l-4 border-transparent hover:border-blue-300 dark:hover:border-blue-500" 
            onClick={() => setIsExpanded(!isExpanded)}
            title="Click to expand/collapse"
        >
            <Label className="cursor-pointer flex items-center" title="Expand or Collapse">
                {isExpanded ? (
                    <Minus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                    <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
            </Label>
            {name && <Label
                className="cursor-pointer flex-1"
                title={description}
            >
                <span className="flex items-center">
                    {name}
                    {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                    {!isExpanded && typeName && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({typeName})</span>
                    )}
                </span>
                {isExpanded && typeName && <div className="text-xs muted text-gray-500 dark:text-gray-400">{typeName}</div>}
            </Label>}
        </div>
    )
});

const ButtonRemove = ({ onClick, isEnabled }: { onClick: any, isEnabled: boolean }) => {
    return (
        <Button
            size={"sm"}
            variant="outline"
            onClick={onClick}
            className="mb-1"
            title="Remove Item"
            disabled={!isEnabled}
        >X</Button>
    )
}

const ButtonAdd = ({ onClick, isEnabled }: { onClick: any, isEnabled: boolean }) => {
    return (
        <Button
            size={"sm"}
            variant="outline"
            onClick={onClick}
            title="Add Item"
            className="mt-4"
            disabled={!isEnabled}
        > + Add Item</Button>
    )
}