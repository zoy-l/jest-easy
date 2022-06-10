import type { Config } from '@jest/types';
/**
 * Jest config Help type
 */
export declare type IHandleConfig<T> = T extends Record<string, any> ? {
    [key in keyof T]: T[key] | ((value: T[key]) => T[key]);
} : T;
/**
 * Jest config
 */
export declare type IJestConfig = IHandleConfig<Config.InitialOptions>;
export declare function isDefault(obj: any): any;
export default function (args: Record<PropertyKey, any>): Promise<void>;
