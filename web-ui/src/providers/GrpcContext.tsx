import { DEFAULT_CONFIG } from '@/config/constants';
import { createContext, useState, ReactNode } from 'react';

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
    version: string;
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
    const [version] = useState<string>(packageJson.version);
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
            version,
        }}>
            {children}
        </GrpcContext.Provider>
    );
};