import { DEFAULT_CONFIG } from "@/config/constants";
import { v4 as uuidv4 } from 'uuid';

export const scrollToElement = (elementRef: any) => {
    if (elementRef && elementRef.current) {
        setTimeout(() => {
            elementRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 500);
    }
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

export function getServiceNameFromMethod(method: string, type : string = 'full') {
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

export function getMethodInputType(host: string, method: string) : string {

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


