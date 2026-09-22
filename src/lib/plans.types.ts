import type {Subscription} from './database.types';
export type PlanRules={name:string;accounts:number|null;cards:number|null;goals:number|null;projection:boolean;comparisons:boolean;customCategories:boolean;customAlerts:boolean;goalEstimate:boolean};
export type PlanResource={id:string;name:string;allowed:boolean};
export type PlanSnapshot={subscription:Subscription;hasPlus:boolean;plan:'free'|'plus';matrix:{free:PlanRules;plus:PlanRules};limits:PlanRules;accounts:PlanResource[];cards:PlanResource[];goals:PlanResource[];alerts:{antecedencia:number;limiar:number};pausedRecurrences:number};
