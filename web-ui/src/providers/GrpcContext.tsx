import { DEFAULT_CONFIG } from '@/config/constants';
import { createContext, useState, ReactNode, useMemo } from 'react';

import packageJson from '../../package.json'; // Adjust the path as needed

export interface GrpcContextProps {
    server: string | undefined;
    setServer: (server: string) => void;
    method: string  | undefined;
    setMethod: (method: string) => void;
    serverInfo: any | undefined;
    setServerInfo: (serverInfo: any) => void;
    metaData: Record<string, string> | any | undefined;
    setMetaData: (metaData: any) => void;
    message: Record<string, string> |any | undefined;
    setMessage: (message: any) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    reload?: boolean;
    setReload?: (reload: boolean) => void;
    grpcResponse: any | undefined;
    setGrpcResponse: (grpcResponse: any) => void;
    isReady: boolean;
    showRequestBuilder: boolean;
    setShowRequestBuilder: (showRequestBuilder: boolean) => void;
    version: string;
    refreshCollection?: () => void;
    setRefreshCollection?: (refreshCollection: () => void) => void;
    methodMetadata?: any;
    setMethodMetadata?: (methodMetadata: any) => void;
    collection: any[];
    setCollection: (collection: any[]) => void;
    collectionFilter: string;
    setCollectionFilter: (filter: string) => void;
    filteredCollection: any[];
}

export const GrpcContext = createContext<GrpcContextProps | null | undefined>(undefined);

export const GrpcProvider = ({ children }: { children: ReactNode }) => {
    const [server, setServer] = useState<string>('');
    const [method, setMethod] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [metaData, setMetaData] = useState<any>(DEFAULT_CONFIG.metaData);
    const [message, setMessage] = useState<any>({});
    const [serverInfo, setServerInfo] = useState<any>({});
    const [reload, setReload] = useState<boolean>(false);
    const [grpcResponse, setGrpcResponse] = useState<any>(null);
    const [showRequestBuilder, setShowRequestBuilder] = useState<boolean>(false);
    const [version] = useState<string>(packageJson.version);
    const [refreshCollection, setRefreshCollection] = useState<(() => void) | undefined>(undefined);
    const [methodMetadata, setMethodMetadata] = useState<any>(null);
    const [collection, setCollection] = useState<any[]>([]);
    const [collectionFilter, setCollectionFilter] = useState<string>('');
    
    // Computed value for isReady  
    const { host, method: serverMethod } = serverInfo;
    const isReady = (host && host !== '' && serverMethod && serverMethod !== '');

    // Filtered collection based on search filter
    const filteredCollection = useMemo(() => {
        if (!collection || collection.length === 0) return collection;
        const searchTerm = collectionFilter.trim().toLowerCase();
        if (!searchTerm) return collection;

        return collection
            .map((service: any) => {
                const filteredItems = (service.items || []).filter((item: any) => {
                    const searchableText = [
                        service.title,
                        service.serviceName,
                        item.requestName,
                        item.requestDescription,
                        item.service,
                        item.responseName,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return searchableText.includes(searchTerm);
                });
                return { ...service, items: filteredItems };
            })
            .filter((service: any) => (service.items || []).length > 0);
    }, [collection, collectionFilter]);

    return (
        <GrpcContext.Provider value={{
            server,
            setServer,
            method,
            setMethod,
            serverInfo,
            setServerInfo,
            metaData,
            setMetaData,
            message,
            setMessage,
            loading,
            setLoading,
            reload, 
            setReload,
            grpcResponse,
            setGrpcResponse,
            isReady,
            showRequestBuilder,
            setShowRequestBuilder,
            version,
            refreshCollection,
            setRefreshCollection,
            methodMetadata,
            setMethodMetadata,
            collection,
            setCollection,
            collectionFilter,
            setCollectionFilter,
            filteredCollection,
        }}>
            {children}
        </GrpcContext.Provider>
    );
};