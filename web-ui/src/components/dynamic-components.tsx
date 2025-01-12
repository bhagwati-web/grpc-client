import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


interface DynamicFieldProps {
    field: any;
    onChange: any;
    isRootElement: any;
}

// Helper component to render the form fields dynamically
export const DynamicField: React.FC<DynamicFieldProps> = ({ field, onChange, isRootElement }) => {
    const { name, type, typeName, enumValues, nestedMessage, isArray } = field;
    const [showNestedFields, setShowNestedFields] = useState(false);
    const [arrayItems, setArrayItems] = useState(isArray ? [{}] : []);
    const [showAddItem, setShowAddItem] = useState(false); // To control Add Item button visibility
    const [selectedValue, setSelectedValue] = useState(enumValues ? enumValues[0].number : "");
    const colorRef = React.useRef('');

    useEffect(() => {
        if (colorRef.current === '')
            setColorToField();
    }, [name]);

    const setColorToField = () => {

        // Generate a random color for each field
        const r = Math.floor(246 + Math.random() * 10);
        const g = Math.floor(246 + Math.random() * 10);
        const b = Math.floor(246 + Math.random() * 10);

        // Convert RGB values to a hexadecimal string
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colorRef.current = hex;
        return { background: `${colorRef.current}` }
    }

    const handleAddItem = (e: any) => {
        e.preventDefault();
        setArrayItems([...arrayItems, {}]);
    };

    const handleRemoveItem = (e: any, index: any) => {
        e.preventDefault();
        setArrayItems(arrayItems.filter((_, i) => i !== index));
    };

    const handleSelectChange = (value: any) => {
        setSelectedValue(value);
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
        messageElement = { margin: isRootElement ? '0px' : '10px', padding: '5px', background: `${colorRef.current}` }

        return { defaultElements, messageElement }[String(elemType)] || defaultElements;

    }

    if (type === 'TYPE_STRING' || type === 'TYPE_BYTES') {
        return (
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name}>{name} <small>{typeName}</small></Label>
                <Input
                    type="text"
                    id={name}
                    placeholder={name}
                    onChange={(e) => onChange(name, e.target.value)}
                />
            </div>
        );
    }

    if (type === 'TYPE_BOOL') {
        return (
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300 flex items-center space-x-2 " style={getStyleforField('defaultElements')}>
                <Checkbox
                    id={name}
                    onCheckedChange={(value) => onChange(name, value)}
                />
                <label
                    htmlFor={name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {name}
                </label>
            </div>
        );
    }

    if (type === 'TYPE_INT32' || type === 'TYPE_INT64' || type === 'TYPE_UINT32' || type === 'TYPE_UINT64' || type === 'TYPE_SINT32' || type === 'TYPE_SINT64' || type === 'TYPE_DOUBLE' || type === 'TYPE_FLOAT') {
        return (
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name}>{name}</Label>
                <Input
                    id={name}
                    type="number"
                    onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
                />
            </div>
        );
    }

    if (type === 'TYPE_ENUM' && enumValues) {
        return (
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name}>{name}</Label>
                <Select
                    value={selectedValue}
                    onValueChange={handleSelectChange}
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
        );
    }

    if (type === 'TYPE_MESSAGE' && nestedMessage) {

        if (isArray) {
            return (
                <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('messageElement')}>
                    <div className="flex items-center space-x-2">
                        <Label className="cursor-pointer">
                            {showAddItem ? <Minus /> : <Plus />}
                        </Label>
                        <Checkbox
                            onCheckedChange={(value: any) => setShowAddItem(value)}
                        />
                        <Label
                            className="cursor-pointer"
                        >
                            {name}
                            <div>
                                <small>{typeName}</small>
                            </div>
                        </Label>
                    </div>
                    {showAddItem && (
                        <>
                            {arrayItems.map((_, index) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    {nestedMessage?.fields?.map((nestedField: any) => (
                                        <DynamicField
                                            key={nestedField.name}
                                            isRootElement={false}
                                            field={{ ...nestedField }}
                                            onChange={(fieldName: string, value: any) =>
                                                onChange(`${name}[${index}].${fieldName}`, value)
                                            }
                                        />
                                    ))}
                                    <Button style={{ margin: '20px' }} onClick={(e) => handleRemoveItem(e, index)}>X</Button>
                                </div>
                            ))}
                            <Button onClick={handleAddItem}>Add Item</Button>
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('messageElement')}>
                <div className="flex items-center space-x-2">
                    <Label
                        className="cursor-pointer">
                        {showNestedFields ? <Minus /> : <Plus />}
                    </Label>
                    <Checkbox
                        checked={showNestedFields}
                        onCheckedChange={(value: any) => setShowNestedFields(value)}
                    />
                    <Label className="cursor-pointer"
                    >
                        {name}
                        <div>
                            <small>{typeName}</small>
                        </div>
                    </Label>

                </div>

                {showNestedFields && nestedMessage?.fields?.map((nestedField: any, index: number) => (
                    <DynamicField
                        key={index}
                        field={nestedField}
                        isRootElement={false}
                        onChange={(fieldName: string, value: any) =>
                            onChange(`${name}.${fieldName}`, value)
                        }
                    />
                ))}
            </div>
        );
    }

    return (<div className="mt-4">
        <Label htmlFor={name}>FieldName : {name} <div>Need Handling of {type}</div></Label>
    </div>);
};



