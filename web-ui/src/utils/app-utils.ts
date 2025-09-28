import { DEFAULT_CONFIG } from "@/config/constants";
import { v4 as uuidv4 } from 'uuid';

/**
 * Scrolls to a specific element with multiple fallback methods
 * @param elementRef - React ref object containing the target element
 * @param delay - Delay in milliseconds before attempting scroll (default: 100ms)
 */
export const scrollToElement = (elementRef: { current: HTMLElement | null }, delay: number = 100) => {
    if (!elementRef?.current) return;

    setTimeout(() => {
        const element = elementRef.current;
        if (!element) return;

        try {
            // Primary method: scrollIntoView with smooth behavior
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        } catch (error) {
            // Fallback method: manual scroll calculation
            try {
                const rect = element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetPosition = rect.top + scrollTop;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            } catch (fallbackError) {
                // Final fallback: immediate scroll without animation
                const rect = element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo(0, rect.top + scrollTop);
            }
        }
    }, delay);
};

// Function to normalize host by removing protocol prefixes
export const normalizeHost = (host: string): string => {
    // Remove protocol prefixes
    let normalized = host;
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^grpcs?:\/\//, '');

    return normalized;
};

function removeTrailingCommas(jsonString: string): string {
    if (!jsonString) {
        return "{}";
    }
    return jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
}

export function prettifyJSON(jsonString: string): string {
    try {
        const cleanedJsonString = removeTrailingCommas(jsonString);
        const jsonObject = JSON.parse(cleanedJsonString || "{}");
        const prettyJsonString = JSON.stringify(jsonObject || {}, null, 2);
        return prettyJsonString || "{}";
    } catch (error) {
        throw new Error("Invalid JSON string");
    }
}

export function getGrpcResponse(host: string, method: string): any {
    const sessionStorageResponses = sessionStorage.getItem(DEFAULT_CONFIG.sessionStorageResponses);
    const responses = JSON.parse(sessionStorageResponses || '{}');

    // find the response with the host and method, responses is an object, so we need to loop through the object through keys
    const responseId = Object.keys(responses).find((key: string) => responses[key].host === host && responses[key].method === method);
    if (responseId) {
        return responses[responseId]?.response;
    }
    return null;
}

export function saveGrpcResponse(host: string, method: string, response: any) {
    const sessionStorageResponses = sessionStorage.getItem(DEFAULT_CONFIG.sessionStorageResponses);
    const responses = JSON.parse(sessionStorageResponses || '{}');

    const responseId = Object.keys(responses).find((key: string) => responses[key].host === host && responses[key].method === method);
    if (responseId) {
        sessionStorage.setItem(DEFAULT_CONFIG.sessionStorageResponses, JSON.stringify({
            ...responses,
            [responseId]: {
                host: host,
                method: method,
                response: response
            }
        }));
        return;
    } else {
        const responseId = uuidv4();
        responses[responseId] = {
            host: host,
            method: method,
            response: response
        };
        sessionStorage.setItem(DEFAULT_CONFIG.sessionStorageResponses, JSON.stringify(responses));
        return;
    }
}

// let'd do the same for the reflections, we need to save the reflections to the session storage    
export function saveReflections(host: string, reflections: any) {
    sessionStorage.setItem(DEFAULT_CONFIG.sessionStorageReflections, JSON.stringify({
        ...JSON.parse(sessionStorage.getItem(DEFAULT_CONFIG.sessionStorageReflections) || '{}'), [String(host)]: reflections
    }));
}

export function getReflections(host: string) {
    const sessionStorageReflections = sessionStorage.getItem(DEFAULT_CONFIG.sessionStorageReflections);
    const reflections = JSON.parse(sessionStorageReflections || '{}');
    return reflections[String(host)];
}

export function getServiceNameFromMethod(method: string, type: string = 'full') {
    const parts = method?.split('.');
    if (type === 'short') {
        return parts[parts.length - 2];
    }

    return parts.slice(0, -1).join('.');
}

export function getMethodNameFromMethodURL(method: string) {
    const parts = method?.split('.');
    return parts[parts.length - 1];
}

export function getMethodInputType(host: string, method: string): string {

    if (!host || !method) {
        return '';
        console.error("Host or method is not provided");
    }

    let methodName = getMethodNameFromMethodURL(method);
    let serviceName = getServiceNameFromMethod(method, 'short');
    let methodInputType = "";

    getReflections(host).forEach((serviceItem: any) => {
        if (serviceItem.serviceName === serviceName) {
            serviceItem.functions.forEach((functionItem: any) => {
                if (functionItem.functionName === methodName) {
                    methodInputType = functionItem.inputType;
                }
            });
        }
    });

    return methodInputType;
}

export const getClassNameForField = (elem: any): string => {

    const baseClass = 'mt-4';
    const baseClassBorder = 'border rounded-md border-gray-300 dark:border-gray-600';
    const baseClassBackground = 'bg-white dark:bg-gray-800';
    const baseClassWidth = 'min-w-96';

    if ((elem.type === 'TYPE_MESSAGE') || elem.isArray) {
        return `${baseClass} ${baseClassBorder}`;
    }

    return `${baseClass} ${baseClassBorder} ${baseClassBackground} ${baseClassWidth}`;
}

// Creative loading messages for better UX
export const getRandomLoadingMessage = (): string => {
    const messages = [
        "Breathe in... breathe out... 🌱",
        "Summoning the data spirits... 👻",
        "Brewing some fresh APIs... ☕",
        "Dancing with the servers... 💃",
        "Chasing electrons through cables... ⚡",
        "Whispering to the cloud... ☁️",
        "Knocking on gRPC's door... 🚪",
        "Translating binary poetry... 📝",
        "Synchronizing with the matrix... 🔮",
        "Fishing for data packets... 🎣",
        "Convincing servers to talk... 🗣️",
        "Assembling digital magic... ✨"
    ];

    return messages[Math.floor(Math.random() * messages.length)];
};

// Helper function to get sample values for primitive types
const getSampleValue = (fieldType: string, fieldName: string): any => {
    switch (fieldType) {
        case 'TYPE_STRING':
            return `sample_${fieldName}`;
        case 'TYPE_INT32':
        case 'TYPE_INT64':
        case 'TYPE_UINT32':
        case 'TYPE_UINT64':
        case 'TYPE_SINT32':
        case 'TYPE_SINT64':
        case 'TYPE_FIXED32':
        case 'TYPE_FIXED64':
        case 'TYPE_SFIXED32':
        case 'TYPE_SFIXED64':
            return 123;
        case 'TYPE_DOUBLE':
        case 'TYPE_FLOAT':
            return 123.45;
        case 'TYPE_BOOL':
            return true;
        case 'TYPE_BYTES':
            return "base64encodeddata";
        case 'TYPE_MESSAGE':
            return {};
        case 'TYPE_ENUM':
            return "ENUM_VALUE";
        // Legacy support for lowercase types
        case 'string':
            return `sample_${fieldName}`;
        case 'int32':
        case 'int64':
        case 'number':
            return 123;
        case 'double':
        case 'float':
            return 123.45;
        case 'bool':
        case 'boolean':
            return true;
        case 'bytes':
            return "base64encodeddata";
        default:
            return `sample_${fieldName}`;
    }
}


// Helper function to generate sample data from field definitions
export const generateSampleFromFields = (fields: any[]): any => {
    const sample: any = {};

    fields.forEach((field: any) => {
        const { name, type, repeated, isArray, nestedMessage, enumValues } = field;

        // Handle repeated/array fields
        if (repeated || isArray) {
            if (nestedMessage && nestedMessage.fields) {
                // Array of objects
                sample[name] = [generateSampleFromFields(nestedMessage.fields)];
            } else if (enumValues && enumValues.length > 0) {
                // Array of enum values
                sample[name] = [enumValues[0].name];
            } else {
                // Array of primitives
                sample[name] = [getSampleValue(type, name)];
            }
            return;
        }

        // Handle nested messages (complex objects)
        if (nestedMessage && nestedMessage.fields) {
            sample[name] = generateSampleFromFields(nestedMessage.fields);
            return;
        }

        // Handle enum types
        if (enumValues && enumValues.length > 0) {
            sample[name] = enumValues[0].name;
            return;
        }

        // Handle primitive types
        sample[name] = getSampleValue(type, name);
    });

    return sample;
}

// Method-specific data storage utilities
const METHOD_STORAGE_KEY = 'method-specific-data';

interface MethodData {
    metaData: Record<string, string>;
    message: any;
    timestamp: number;
}

export function saveMethodData(host: string, method: string, metaData: Record<string, string>, message: any) {
    const storageKey = `${host}:${method}`;
    const methodStorage = JSON.parse(sessionStorage.getItem(METHOD_STORAGE_KEY) || '{}');
    
    methodStorage[storageKey] = {
        metaData,
        message,
        timestamp: Date.now()
    };
    
    sessionStorage.setItem(METHOD_STORAGE_KEY, JSON.stringify(methodStorage));
}

export function getMethodData(host: string, method: string): MethodData | null {
    const storageKey = `${host}:${method}`;
    const methodStorage = JSON.parse(sessionStorage.getItem(METHOD_STORAGE_KEY) || '{}');
    
    return methodStorage[storageKey] || null;
}

// Function to check collection data for a specific method
export function getCollectionDataForMethod(collection: any[], host: string, method: string): { metaData: Record<string, string>; message: any } | null {
    if (!collection || !Array.isArray(collection) || !host || !method) {
        return null;
    }

    // Extract service and request name from method
    const methodParts = method.split('.');
    if (methodParts.length < 2) {
        return null;
    }
    
    const requestName = methodParts[methodParts.length - 1];
    const service = methodParts.slice(0, -1).join('.');

    for (const serviceGroup of collection) {
        if (serviceGroup.items && Array.isArray(serviceGroup.items)) {
            for (const item of serviceGroup.items) {
                // Check if this item matches the host, service, and request name
                if (item.host === host && 
                    item.service === service && 
                    item.requestName === requestName) {
                    return {
                        metaData: item.metaData || {},
                        message: item.message || {}
                    };
                }
            }
        }
    }

    return null;
}

// Enhanced method data getter that checks both session storage and collection
export function getMethodDataWithCollection(host: string, method: string, collection: any[]): MethodData {
    // First check session storage for user modifications
    const sessionData = getMethodData(host, method);
    if (sessionData) {
        return sessionData;
    }

    // Then check collection data
    const collectionData = getCollectionDataForMethod(collection, host, method);
    if (collectionData) {
        return {
            metaData: collectionData.metaData,
            message: collectionData.message,
            timestamp: Date.now() // Add timestamp for consistency
        };
    }

    // Return default if nothing found
    const defaultData = getDefaultMethodData();
    return {
        metaData: defaultData.metaData,
        message: defaultData.message,
        timestamp: Date.now()
    };
}

export function clearMethodData(host: string, method: string) {
    const storageKey = `${host}:${method}`;
    const methodStorage = JSON.parse(sessionStorage.getItem(METHOD_STORAGE_KEY) || '{}');
    
    delete methodStorage[storageKey];
    sessionStorage.setItem(METHOD_STORAGE_KEY, JSON.stringify(methodStorage));
}

export function getDefaultMethodData(): { metaData: Record<string, string>; message: any } {
    return {
        metaData: { ...DEFAULT_CONFIG.metaData },
        message: {}
    };
}
