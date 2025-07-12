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
import { getClassNameForField } from "@/utils/app-utils";

interface DynamicFieldProps {
    field: any;
    onChange: any;
    onRemove: any;
    isRootElement: any;
    formData: any;
    key: any;
}

interface DynamicFieldHeader {
    field: any;
    isExpanded: any;
    setIsExpanded: any;
}


// Helper component to render the form fields dynamically
export const DynamicField: React.FC<DynamicFieldProps> = ({ field, onChange, onRemove, isRootElement, formData, key }) => {
    const { name, type, enumValues, nestedMessage, isArray, description } = field;
    const [isExpanded, setIsExpanded] = useState(formData && formData[name] ? true : false);
    const [isEnabled, setIsEnabled] = useState(formData && formData[name] ? true : false);
    const [arrayItems, setArrayItems] = useState(formData && formData[name] ? formData[name] : []);
    // const [showAddItem, setShowAddItem] = useState(false); // To control Add Item button visibility
    //const [selectedValue, setSelectedValue] = useState(enumValues ? enumValues[0].number : "");
    const colorRef = React.useRef('');

    useEffect(() => {
        if (colorRef.current === '')
            setColorToField();
    }, [name]);

    const setColorToField = () => {

        // Generate a random color for each field
        const r = Math.floor(236 + Math.random() * 20);
        const g = Math.floor(236 + Math.random() * 20);
        const b = Math.floor(236 + Math.random() * 20);

        // Convert RGB values to a hexadecimal string
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colorRef.current = hex;
        return { background: `${colorRef.current}` }
    }

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
        messageElement = { margin: isRootElement ? '0px' : '10px', padding: '10px', background: `${colorRef.current}` }

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

    if (name == 'repeated_enum_annotation')
        console.log('field Info', field, formData, name);

    if (type === 'TYPE_STRING' || type === 'TYPE_BYTES') {

        if (isArray) {
            return (
                <div className={getClassNameForField(field) + " bg-white"} style={getStyleforField('defaultElements')}>
                    <FieldHeader isExpanded={isExpanded} setIsExpanded={setIsExpanded} field={field} />
                    {isExpanded && (
                        <div className="flex space-x-4 mt-2 items-center">
                            <div className=" flex-col space-x-2">
                                <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                            </div>
                            <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                                {arrayItems && arrayItems.map((_: any, index: number) => (
                                    <div key={index} className="flex min-w-48 max-w-96 items-end space-x-2 mb-2">
                                        <Input
                                            type="text"
                                            placeholder={name}
                                            onChange={(e) => onChange(`${name}[${index}]`, e.target.value)}
                                            value={getFormFieldValue(`${name}[${index}]`)}
                                            disabled={!isEnabled}
                                        />
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
                <div className="flex-col space-x-2">
                    <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name}</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder={name}
                        onChange={(e) => onChange(name, e.target.value)}
                        value={getFormFieldValue(name)}
                        disabled={!isEnabled}
                    />
                </div>
            </div>
        );
    }

    if (type === 'TYPE_INT32' || type === 'TYPE_INT64' || type === 'TYPE_UINT32' || type === 'TYPE_UINT64' || type === 'TYPE_SINT32' || type === 'TYPE_SINT64' || type === 'TYPE_DOUBLE' || type === 'TYPE_FLOAT' || type === 'TYPE_FIXED32' || type === 'TYPE_FIXED64' || type === 'TYPE_SFIXED32' || type === 'TYPE_SFIXED64') {

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
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    <Input
                                        type="text"
                                        placeholder={name}
                                        onChange={(e) => onChange(`${name}[${index}]`, parseInt(e.target.value, 10))}
                                        value={getFormFieldValue(`${name}[${index}]`)}
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
                <div className="flex-col">
                    <Checkbox id={name} onCheckedChange={(value) => handleDeleteFromMessage(value)} checked={isEnabled} />
                </div>
                <div className={getClassNameForField(field)} style={getStyleforField('defaultElements')}>
                    <Label htmlFor={name} title={description}>{name}</Label>
                    <Input
                        type="text"
                        id={name}
                        placeholder={name}
                        onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
                        value={getFormFieldValue(name)}
                        disabled={!isEnabled}
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
                <div className="flex-col mt-4 min-w-48 max-w-96 rounded-md border border-gray-300 bg-white" style={getStyleforField('defaultElements')}>
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

    return (<div className="mt-4">
        <Label htmlFor={name}>FieldName : {name} <div>Need Handling of {type}</div></Label>
    </div>);
};



const FieldHeader = ({ isExpanded, setIsExpanded, field }: DynamicFieldHeader) => {
    const { name, description, typeName } = field;
    return (
        <div className="flex items-center space-x-2" onClick={() => setIsExpanded(!isExpanded)}>
            <Label className="cursor-pointer" title="Expand or Collapse"  >
                {isExpanded ? <Minus /> : <Plus />}
            </Label>
            {name && <Label
                className="cursor-pointer"
                title={description}
            >
                {name}
                {typeName && <div className="text-xs muted text-gray-500">{typeName}</div>}
            </Label>}
        </div>
    )
}

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