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
    formData: any;
}

// Helper component to render the form fields dynamically
export const DynamicField: React.FC<DynamicFieldProps> = ({ field, onChange, isRootElement, formData }) => {
    const { name, type, typeName, enumValues, nestedMessage, isArray, description } = field;
    const [isExpanded, setIsExpanded] = useState(formData && formData[name] ? true : false);
    //const [showNestedFields, setShowNestedFields] = useState(formData && formData[name] ? true : false);
    const [arrayItems, setArrayItems] = useState(isArray ? formData[name] : []);
    const [showAddItem, setShowAddItem] = useState(false); // To control Add Item button visibility
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

    // const handleDeleteFromMessage = (value: any) => {
    //     // delete that key from the formData
    //     if (value === false && formData[name]) {
    //         isArray ? onChange(name, []) : onChange(name, {});
    //         setIsExpanded(false);
    //     }
    //     else {
    //         setIsExpanded(true);
    //     }
    //     //setShowNestedFields(value)
    // };


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
        messageElement = { margin: isRootElement ? '0px' : '10px', padding: '5px', background: `${colorRef.current}` }

        return { defaultElements, messageElement }[String(elemType)] || defaultElements;

    }

    const getFormFieldValue = (fieldName: string) => {
        console.log('fieldName', fieldName);
        console.log('formData', formData);
        let current: any = formData;
        current = current[fieldName] ? current[fieldName] : '';
        return current
    }

    if (type === 'TYPE_STRING' || type === 'TYPE_BYTES') {

        if (isArray) {
            return (
                <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                    <div className="flex items-center space-x-2">
                        <Label className="cursor-pointer">
                            {showAddItem ? <Minus /> : <Plus />}
                        </Label>
                        <Checkbox
                            onCheckedChange={(value: any) => setShowAddItem(value)}
                        />
                        <Label
                            className="cursor-pointer"
                            title={description}
                        >
                            {name}
                        </Label>
                    </div>
                    {showAddItem && (
                        <>
                            {arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    <Input
                                        type="text"
                                        placeholder={name}
                                        onChange={(e) => onChange(`${name}[${index}]`, e.target.value)}
                                        value={getFormFieldValue(`${name}[${index}]`)}
                                    />
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
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name} title={description}>{name}</Label>
                <Input
                    type="text"
                    id={name}
                    placeholder={name}
                    onChange={(e) => onChange(name, e.target.value)}
                    value={getFormFieldValue(name)}
                />
            </div>
        );
    }

    if (type === 'TYPE_BOOL') {

        if (isArray) {
            return (
                <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                    <div className="flex items-center space-x-2">
                        <Label className="cursor-pointer">
                            {showAddItem ? <Minus /> : <Plus />}
                        </Label>
                        <Checkbox
                            onCheckedChange={(value: any) => setShowAddItem(value)}
                        />
                        <Label
                            className="cursor-pointer"
                            title={description}
                        >
                            {name}
                        </Label>
                    </div>
                    {showAddItem && (
                        <>
                            {arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    <Checkbox
                                        id={name}
                                        onCheckedChange={(value) => onChange(`${name}[${index}]`, value)}
                                        checked={getFormFieldValue(`${name}[${index}]`)}
                                    />
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
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300 flex items-center space-x-2 " style={getStyleforField('defaultElements')}>
                <Checkbox
                    id={name}
                    onCheckedChange={(value) => onChange(name, value)}
                    checked={getFormFieldValue(name)}
                />
                <label
                    htmlFor={name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    title={description}
                >
                    {name}
                </label>
            </div>
        );
    }

    if (type === 'TYPE_INT32' || type === 'TYPE_INT64' || type === 'TYPE_UINT32' || type === 'TYPE_UINT64' || type === 'TYPE_SINT32' || type === 'TYPE_SINT64' || type === 'TYPE_DOUBLE' || type === 'TYPE_FLOAT' || type === 'TYPE_FIXED32' || type === 'TYPE_FIXED64' || type === 'TYPE_SFIXED32' || type === 'TYPE_SFIXED64') {

        if (isArray) {
            return (
                <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                    <div className="flex items-center space-x-2">
                        <Label className="cursor-pointer">
                            {showAddItem ? <Minus /> : <Plus />}
                        </Label>
                        <Checkbox
                            onCheckedChange={(value: any) => setShowAddItem(value)}
                        />
                        <Label
                            className="cursor-pointer"
                            title={description}
                        >
                            {name}
                        </Label>
                    </div>
                    {showAddItem && (
                        <>
                            {arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    <Input
                                        type="text"
                                        placeholder={name}
                                        onChange={(e) => onChange(`${name}[${index}]`, parseInt(e.target.value, 10))}
                                        value={getFormFieldValue(`${name}[${index}]`)}
                                    />
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
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name} title={description}>{name}</Label>
                <Input
                    id={name}
                    type="text"
                    onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
                    value={getFormFieldValue(name)}
                />
            </div>
        );
    }

    if (type === 'TYPE_ENUM' && enumValues) {

        if (isArray) {
            return (
                <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                    <div className="flex items-center space-x-2">
                        <Label className="cursor-pointer">
                            {showAddItem ? <Minus /> : <Plus />}
                        </Label>
                        <Checkbox
                            onCheckedChange={(value: any) => setShowAddItem(value)}
                        />
                        <Label
                            className="cursor-pointer"
                            title={description}
                        >
                            {name}
                            <div>
                                <small>{typeName}</small>
                            </div>
                        </Label>
                    </div>
                    {showAddItem && (
                        <>
                            {arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    <Select
                                        value={getFormFieldValue(name)}
                                        onValueChange={(value) => onChange(`${name}[${index}]`, value)}
                                        defaultValue={getFormFieldValue(`${name}[${index}]`)}
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
            <div className="mt-4 min-w-48 max-w-96 rounded-md border border-gray-300" style={getStyleforField('defaultElements')}>
                <Label htmlFor={name} title={description}>{name}</Label>
                <Select
                    value={getFormFieldValue(name)}
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
                        <Label className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)} >
                            {isExpanded ? <Minus /> : <Plus />}
                        </Label>
                        <Label
                            className="cursor-pointer"
                            title={description}
                        >
                            {name}
                            <div className="text-xs muted text-gray-500">{typeName}</div>
                        </Label>
                    </div>
                    {isExpanded && (
                        <>
                            {arrayItems.map((_: any, index: number) => (
                                <div key={index} className="flex items-end space-x-2 mb-2">
                                    {nestedMessage?.fields?.map((nestedField: any) => (
                                        <DynamicField
                                            key={nestedField.name}
                                            isRootElement={false}
                                            field={{ ...nestedField }}
                                            onChange={(fieldName: string, value: any) =>
                                                onChange(`${name}[${index}].${fieldName}`, value)
                                            }
                                            formData={formData[name] && formData[name][index] ? formData[name][index] : {}}
                                        />
                                    ))}
                                    <Button
                                        size={"sm"}
                                        variant="outline"
                                        style={{ margin: '20px' }}
                                        onClick={(e) => handleRemoveItem(e, index)}
                                    >X</Button>
                                </div>
                            ))}
                            <Button
                                size={"sm"}
                                variant="secondary"
                                onClick={handleAddItem}
                            > + Add Item</Button>
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="mt-4 rounded-md border border-gray-300" style={getStyleforField('messageElement')}>
                <div className="flex items-center space-x-2">
                    <Label
                        className="cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <Minus /> : <Plus />}
                    </Label>

                    <Label className="cursor-pointer" title={description}
                    >
                        {name}
                        <div className="text-xs muted text-gray-500">{typeName}</div>
                    </Label>

                </div>

                {isExpanded && nestedMessage?.fields?.map((nestedField: any, index: number) => (
                    <>
                        <DynamicField
                            key={index}
                            field={nestedField}
                            isRootElement={false}
                            onChange={(fieldName: string, value: any) =>
                                onChange(`${name}.${fieldName}`, value)
                            }
                            formData={formData[name] ? formData[name] : {}}
                        />
                    </>
                ))}
            </div>
        );
    }

    return (<div className="mt-4">
        <Label htmlFor={name}>FieldName : {name} <div>Need Handling of {type}</div></Label>
    </div>);
};



