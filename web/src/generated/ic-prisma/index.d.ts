
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Plan
 * 
 */
export type Plan = $Result.DefaultSelection<Prisma.$PlanPayload>
/**
 * Model Entitlement
 * 
 */
export type Entitlement = $Result.DefaultSelection<Prisma.$EntitlementPayload>
/**
 * Model Subscription
 * 
 */
export type Subscription = $Result.DefaultSelection<Prisma.$SubscriptionPayload>
/**
 * Model UsageRecord
 * 
 */
export type UsageRecord = $Result.DefaultSelection<Prisma.$UsageRecordPayload>
/**
 * Model GenerationJob
 * 
 */
export type GenerationJob = $Result.DefaultSelection<Prisma.$GenerationJobPayload>
/**
 * Model Order
 * 
 */
export type Order = $Result.DefaultSelection<Prisma.$OrderPayload>
/**
 * Model PaymentEvent
 * 
 */
export type PaymentEvent = $Result.DefaultSelection<Prisma.$PaymentEventPayload>
/**
 * Model AdminAuditLog
 * 
 */
export type AdminAuditLog = $Result.DefaultSelection<Prisma.$AdminAuditLogPayload>
/**
 * Model ModelConfig
 * 
 */
export type ModelConfig = $Result.DefaultSelection<Prisma.$ModelConfigPayload>
/**
 * Model OperationConfig
 * 
 */
export type OperationConfig = $Result.DefaultSelection<Prisma.$OperationConfigPayload>
/**
 * Model VerificationCode
 * 
 */
export type VerificationCode = $Result.DefaultSelection<Prisma.$VerificationCodePayload>
/**
 * Model CanvasBackup
 * 
 */
export type CanvasBackup = $Result.DefaultSelection<Prisma.$CanvasBackupPayload>
/**
 * Model RateLimitEntry
 * 
 */
export type RateLimitEntry = $Result.DefaultSelection<Prisma.$RateLimitEntryPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.plan`: Exposes CRUD operations for the **Plan** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Plans
    * const plans = await prisma.plan.findMany()
    * ```
    */
  get plan(): Prisma.PlanDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.entitlement`: Exposes CRUD operations for the **Entitlement** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Entitlements
    * const entitlements = await prisma.entitlement.findMany()
    * ```
    */
  get entitlement(): Prisma.EntitlementDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.subscription`: Exposes CRUD operations for the **Subscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Subscriptions
    * const subscriptions = await prisma.subscription.findMany()
    * ```
    */
  get subscription(): Prisma.SubscriptionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.usageRecord`: Exposes CRUD operations for the **UsageRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UsageRecords
    * const usageRecords = await prisma.usageRecord.findMany()
    * ```
    */
  get usageRecord(): Prisma.UsageRecordDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.generationJob`: Exposes CRUD operations for the **GenerationJob** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GenerationJobs
    * const generationJobs = await prisma.generationJob.findMany()
    * ```
    */
  get generationJob(): Prisma.GenerationJobDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.order`: Exposes CRUD operations for the **Order** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Orders
    * const orders = await prisma.order.findMany()
    * ```
    */
  get order(): Prisma.OrderDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.paymentEvent`: Exposes CRUD operations for the **PaymentEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PaymentEvents
    * const paymentEvents = await prisma.paymentEvent.findMany()
    * ```
    */
  get paymentEvent(): Prisma.PaymentEventDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.adminAuditLog`: Exposes CRUD operations for the **AdminAuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AdminAuditLogs
    * const adminAuditLogs = await prisma.adminAuditLog.findMany()
    * ```
    */
  get adminAuditLog(): Prisma.AdminAuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.modelConfig`: Exposes CRUD operations for the **ModelConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ModelConfigs
    * const modelConfigs = await prisma.modelConfig.findMany()
    * ```
    */
  get modelConfig(): Prisma.ModelConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.operationConfig`: Exposes CRUD operations for the **OperationConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OperationConfigs
    * const operationConfigs = await prisma.operationConfig.findMany()
    * ```
    */
  get operationConfig(): Prisma.OperationConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.verificationCode`: Exposes CRUD operations for the **VerificationCode** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VerificationCodes
    * const verificationCodes = await prisma.verificationCode.findMany()
    * ```
    */
  get verificationCode(): Prisma.VerificationCodeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.canvasBackup`: Exposes CRUD operations for the **CanvasBackup** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CanvasBackups
    * const canvasBackups = await prisma.canvasBackup.findMany()
    * ```
    */
  get canvasBackup(): Prisma.CanvasBackupDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rateLimitEntry`: Exposes CRUD operations for the **RateLimitEntry** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RateLimitEntries
    * const rateLimitEntries = await prisma.rateLimitEntry.findMany()
    * ```
    */
  get rateLimitEntry(): Prisma.RateLimitEntryDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Plan: 'Plan',
    Entitlement: 'Entitlement',
    Subscription: 'Subscription',
    UsageRecord: 'UsageRecord',
    GenerationJob: 'GenerationJob',
    Order: 'Order',
    PaymentEvent: 'PaymentEvent',
    AdminAuditLog: 'AdminAuditLog',
    ModelConfig: 'ModelConfig',
    OperationConfig: 'OperationConfig',
    VerificationCode: 'VerificationCode',
    CanvasBackup: 'CanvasBackup',
    RateLimitEntry: 'RateLimitEntry'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "plan" | "entitlement" | "subscription" | "usageRecord" | "generationJob" | "order" | "paymentEvent" | "adminAuditLog" | "modelConfig" | "operationConfig" | "verificationCode" | "canvasBackup" | "rateLimitEntry"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Plan: {
        payload: Prisma.$PlanPayload<ExtArgs>
        fields: Prisma.PlanFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlanFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlanFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          findFirst: {
            args: Prisma.PlanFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlanFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          findMany: {
            args: Prisma.PlanFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>[]
          }
          create: {
            args: Prisma.PlanCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          createMany: {
            args: Prisma.PlanCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlanCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>[]
          }
          delete: {
            args: Prisma.PlanDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          update: {
            args: Prisma.PlanUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          deleteMany: {
            args: Prisma.PlanDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlanUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PlanUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>[]
          }
          upsert: {
            args: Prisma.PlanUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlanPayload>
          }
          aggregate: {
            args: Prisma.PlanAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlan>
          }
          groupBy: {
            args: Prisma.PlanGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlanGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlanCountArgs<ExtArgs>
            result: $Utils.Optional<PlanCountAggregateOutputType> | number
          }
        }
      }
      Entitlement: {
        payload: Prisma.$EntitlementPayload<ExtArgs>
        fields: Prisma.EntitlementFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EntitlementFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EntitlementFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          findFirst: {
            args: Prisma.EntitlementFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EntitlementFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          findMany: {
            args: Prisma.EntitlementFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>[]
          }
          create: {
            args: Prisma.EntitlementCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          createMany: {
            args: Prisma.EntitlementCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EntitlementCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>[]
          }
          delete: {
            args: Prisma.EntitlementDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          update: {
            args: Prisma.EntitlementUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          deleteMany: {
            args: Prisma.EntitlementDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EntitlementUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EntitlementUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>[]
          }
          upsert: {
            args: Prisma.EntitlementUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EntitlementPayload>
          }
          aggregate: {
            args: Prisma.EntitlementAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEntitlement>
          }
          groupBy: {
            args: Prisma.EntitlementGroupByArgs<ExtArgs>
            result: $Utils.Optional<EntitlementGroupByOutputType>[]
          }
          count: {
            args: Prisma.EntitlementCountArgs<ExtArgs>
            result: $Utils.Optional<EntitlementCountAggregateOutputType> | number
          }
        }
      }
      Subscription: {
        payload: Prisma.$SubscriptionPayload<ExtArgs>
        fields: Prisma.SubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findFirst: {
            args: Prisma.SubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findMany: {
            args: Prisma.SubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          create: {
            args: Prisma.SubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          createMany: {
            args: Prisma.SubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubscriptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          delete: {
            args: Prisma.SubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          update: {
            args: Prisma.SubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.SubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubscriptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          upsert: {
            args: Prisma.SubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          aggregate: {
            args: Prisma.SubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubscription>
          }
          groupBy: {
            args: Prisma.SubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionCountAggregateOutputType> | number
          }
        }
      }
      UsageRecord: {
        payload: Prisma.$UsageRecordPayload<ExtArgs>
        fields: Prisma.UsageRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UsageRecordFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UsageRecordFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          findFirst: {
            args: Prisma.UsageRecordFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UsageRecordFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          findMany: {
            args: Prisma.UsageRecordFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>[]
          }
          create: {
            args: Prisma.UsageRecordCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          createMany: {
            args: Prisma.UsageRecordCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UsageRecordCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>[]
          }
          delete: {
            args: Prisma.UsageRecordDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          update: {
            args: Prisma.UsageRecordUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          deleteMany: {
            args: Prisma.UsageRecordDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UsageRecordUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UsageRecordUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>[]
          }
          upsert: {
            args: Prisma.UsageRecordUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsageRecordPayload>
          }
          aggregate: {
            args: Prisma.UsageRecordAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsageRecord>
          }
          groupBy: {
            args: Prisma.UsageRecordGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsageRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.UsageRecordCountArgs<ExtArgs>
            result: $Utils.Optional<UsageRecordCountAggregateOutputType> | number
          }
        }
      }
      GenerationJob: {
        payload: Prisma.$GenerationJobPayload<ExtArgs>
        fields: Prisma.GenerationJobFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GenerationJobFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GenerationJobFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          findFirst: {
            args: Prisma.GenerationJobFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GenerationJobFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          findMany: {
            args: Prisma.GenerationJobFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>[]
          }
          create: {
            args: Prisma.GenerationJobCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          createMany: {
            args: Prisma.GenerationJobCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GenerationJobCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>[]
          }
          delete: {
            args: Prisma.GenerationJobDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          update: {
            args: Prisma.GenerationJobUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          deleteMany: {
            args: Prisma.GenerationJobDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GenerationJobUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GenerationJobUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>[]
          }
          upsert: {
            args: Prisma.GenerationJobUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GenerationJobPayload>
          }
          aggregate: {
            args: Prisma.GenerationJobAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGenerationJob>
          }
          groupBy: {
            args: Prisma.GenerationJobGroupByArgs<ExtArgs>
            result: $Utils.Optional<GenerationJobGroupByOutputType>[]
          }
          count: {
            args: Prisma.GenerationJobCountArgs<ExtArgs>
            result: $Utils.Optional<GenerationJobCountAggregateOutputType> | number
          }
        }
      }
      Order: {
        payload: Prisma.$OrderPayload<ExtArgs>
        fields: Prisma.OrderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findFirst: {
            args: Prisma.OrderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          findMany: {
            args: Prisma.OrderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          create: {
            args: Prisma.OrderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          createMany: {
            args: Prisma.OrderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OrderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          delete: {
            args: Prisma.OrderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          update: {
            args: Prisma.OrderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          deleteMany: {
            args: Prisma.OrderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OrderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OrderUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>[]
          }
          upsert: {
            args: Prisma.OrderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OrderPayload>
          }
          aggregate: {
            args: Prisma.OrderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOrder>
          }
          groupBy: {
            args: Prisma.OrderGroupByArgs<ExtArgs>
            result: $Utils.Optional<OrderGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrderCountArgs<ExtArgs>
            result: $Utils.Optional<OrderCountAggregateOutputType> | number
          }
        }
      }
      PaymentEvent: {
        payload: Prisma.$PaymentEventPayload<ExtArgs>
        fields: Prisma.PaymentEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PaymentEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PaymentEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          findFirst: {
            args: Prisma.PaymentEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PaymentEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          findMany: {
            args: Prisma.PaymentEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>[]
          }
          create: {
            args: Prisma.PaymentEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          createMany: {
            args: Prisma.PaymentEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PaymentEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>[]
          }
          delete: {
            args: Prisma.PaymentEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          update: {
            args: Prisma.PaymentEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          deleteMany: {
            args: Prisma.PaymentEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PaymentEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PaymentEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>[]
          }
          upsert: {
            args: Prisma.PaymentEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentEventPayload>
          }
          aggregate: {
            args: Prisma.PaymentEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePaymentEvent>
          }
          groupBy: {
            args: Prisma.PaymentEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<PaymentEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.PaymentEventCountArgs<ExtArgs>
            result: $Utils.Optional<PaymentEventCountAggregateOutputType> | number
          }
        }
      }
      AdminAuditLog: {
        payload: Prisma.$AdminAuditLogPayload<ExtArgs>
        fields: Prisma.AdminAuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AdminAuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AdminAuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          findFirst: {
            args: Prisma.AdminAuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AdminAuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          findMany: {
            args: Prisma.AdminAuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          create: {
            args: Prisma.AdminAuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          createMany: {
            args: Prisma.AdminAuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AdminAuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          delete: {
            args: Prisma.AdminAuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          update: {
            args: Prisma.AdminAuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AdminAuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AdminAuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AdminAuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AdminAuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AdminAuditLogPayload>
          }
          aggregate: {
            args: Prisma.AdminAuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAdminAuditLog>
          }
          groupBy: {
            args: Prisma.AdminAuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AdminAuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AdminAuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AdminAuditLogCountAggregateOutputType> | number
          }
        }
      }
      ModelConfig: {
        payload: Prisma.$ModelConfigPayload<ExtArgs>
        fields: Prisma.ModelConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ModelConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ModelConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          findFirst: {
            args: Prisma.ModelConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ModelConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          findMany: {
            args: Prisma.ModelConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>[]
          }
          create: {
            args: Prisma.ModelConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          createMany: {
            args: Prisma.ModelConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ModelConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>[]
          }
          delete: {
            args: Prisma.ModelConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          update: {
            args: Prisma.ModelConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          deleteMany: {
            args: Prisma.ModelConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ModelConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ModelConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>[]
          }
          upsert: {
            args: Prisma.ModelConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelConfigPayload>
          }
          aggregate: {
            args: Prisma.ModelConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateModelConfig>
          }
          groupBy: {
            args: Prisma.ModelConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<ModelConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.ModelConfigCountArgs<ExtArgs>
            result: $Utils.Optional<ModelConfigCountAggregateOutputType> | number
          }
        }
      }
      OperationConfig: {
        payload: Prisma.$OperationConfigPayload<ExtArgs>
        fields: Prisma.OperationConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OperationConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OperationConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          findFirst: {
            args: Prisma.OperationConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OperationConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          findMany: {
            args: Prisma.OperationConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>[]
          }
          create: {
            args: Prisma.OperationConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          createMany: {
            args: Prisma.OperationConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OperationConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>[]
          }
          delete: {
            args: Prisma.OperationConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          update: {
            args: Prisma.OperationConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          deleteMany: {
            args: Prisma.OperationConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OperationConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OperationConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>[]
          }
          upsert: {
            args: Prisma.OperationConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OperationConfigPayload>
          }
          aggregate: {
            args: Prisma.OperationConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOperationConfig>
          }
          groupBy: {
            args: Prisma.OperationConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<OperationConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.OperationConfigCountArgs<ExtArgs>
            result: $Utils.Optional<OperationConfigCountAggregateOutputType> | number
          }
        }
      }
      VerificationCode: {
        payload: Prisma.$VerificationCodePayload<ExtArgs>
        fields: Prisma.VerificationCodeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VerificationCodeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VerificationCodeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          findFirst: {
            args: Prisma.VerificationCodeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VerificationCodeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          findMany: {
            args: Prisma.VerificationCodeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>[]
          }
          create: {
            args: Prisma.VerificationCodeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          createMany: {
            args: Prisma.VerificationCodeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VerificationCodeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>[]
          }
          delete: {
            args: Prisma.VerificationCodeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          update: {
            args: Prisma.VerificationCodeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          deleteMany: {
            args: Prisma.VerificationCodeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VerificationCodeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VerificationCodeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>[]
          }
          upsert: {
            args: Prisma.VerificationCodeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationCodePayload>
          }
          aggregate: {
            args: Prisma.VerificationCodeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVerificationCode>
          }
          groupBy: {
            args: Prisma.VerificationCodeGroupByArgs<ExtArgs>
            result: $Utils.Optional<VerificationCodeGroupByOutputType>[]
          }
          count: {
            args: Prisma.VerificationCodeCountArgs<ExtArgs>
            result: $Utils.Optional<VerificationCodeCountAggregateOutputType> | number
          }
        }
      }
      CanvasBackup: {
        payload: Prisma.$CanvasBackupPayload<ExtArgs>
        fields: Prisma.CanvasBackupFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CanvasBackupFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CanvasBackupFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          findFirst: {
            args: Prisma.CanvasBackupFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CanvasBackupFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          findMany: {
            args: Prisma.CanvasBackupFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>[]
          }
          create: {
            args: Prisma.CanvasBackupCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          createMany: {
            args: Prisma.CanvasBackupCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CanvasBackupCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>[]
          }
          delete: {
            args: Prisma.CanvasBackupDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          update: {
            args: Prisma.CanvasBackupUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          deleteMany: {
            args: Prisma.CanvasBackupDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CanvasBackupUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CanvasBackupUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>[]
          }
          upsert: {
            args: Prisma.CanvasBackupUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CanvasBackupPayload>
          }
          aggregate: {
            args: Prisma.CanvasBackupAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCanvasBackup>
          }
          groupBy: {
            args: Prisma.CanvasBackupGroupByArgs<ExtArgs>
            result: $Utils.Optional<CanvasBackupGroupByOutputType>[]
          }
          count: {
            args: Prisma.CanvasBackupCountArgs<ExtArgs>
            result: $Utils.Optional<CanvasBackupCountAggregateOutputType> | number
          }
        }
      }
      RateLimitEntry: {
        payload: Prisma.$RateLimitEntryPayload<ExtArgs>
        fields: Prisma.RateLimitEntryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RateLimitEntryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RateLimitEntryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          findFirst: {
            args: Prisma.RateLimitEntryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RateLimitEntryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          findMany: {
            args: Prisma.RateLimitEntryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>[]
          }
          create: {
            args: Prisma.RateLimitEntryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          createMany: {
            args: Prisma.RateLimitEntryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RateLimitEntryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>[]
          }
          delete: {
            args: Prisma.RateLimitEntryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          update: {
            args: Prisma.RateLimitEntryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          deleteMany: {
            args: Prisma.RateLimitEntryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RateLimitEntryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RateLimitEntryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>[]
          }
          upsert: {
            args: Prisma.RateLimitEntryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RateLimitEntryPayload>
          }
          aggregate: {
            args: Prisma.RateLimitEntryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRateLimitEntry>
          }
          groupBy: {
            args: Prisma.RateLimitEntryGroupByArgs<ExtArgs>
            result: $Utils.Optional<RateLimitEntryGroupByOutputType>[]
          }
          count: {
            args: Prisma.RateLimitEntryCountArgs<ExtArgs>
            result: $Utils.Optional<RateLimitEntryCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    plan?: PlanOmit
    entitlement?: EntitlementOmit
    subscription?: SubscriptionOmit
    usageRecord?: UsageRecordOmit
    generationJob?: GenerationJobOmit
    order?: OrderOmit
    paymentEvent?: PaymentEventOmit
    adminAuditLog?: AdminAuditLogOmit
    modelConfig?: ModelConfigOmit
    operationConfig?: OperationConfigOmit
    verificationCode?: VerificationCodeOmit
    canvasBackup?: CanvasBackupOmit
    rateLimitEntry?: RateLimitEntryOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    subscriptions: number
    orders: number
    usageRecords: number
    generationJobs: number
    auditLogs: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subscriptions?: boolean | UserCountOutputTypeCountSubscriptionsArgs
    orders?: boolean | UserCountOutputTypeCountOrdersArgs
    usageRecords?: boolean | UserCountOutputTypeCountUsageRecordsArgs
    generationJobs?: boolean | UserCountOutputTypeCountGenerationJobsArgs
    auditLogs?: boolean | UserCountOutputTypeCountAuditLogsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSubscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountOrdersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUsageRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsageRecordWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGenerationJobsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GenerationJobWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminAuditLogWhereInput
  }


  /**
   * Count Type PlanCountOutputType
   */

  export type PlanCountOutputType = {
    entitlements: number
    subscriptions: number
    orders: number
  }

  export type PlanCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    entitlements?: boolean | PlanCountOutputTypeCountEntitlementsArgs
    subscriptions?: boolean | PlanCountOutputTypeCountSubscriptionsArgs
    orders?: boolean | PlanCountOutputTypeCountOrdersArgs
  }

  // Custom InputTypes
  /**
   * PlanCountOutputType without action
   */
  export type PlanCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlanCountOutputType
     */
    select?: PlanCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PlanCountOutputType without action
   */
  export type PlanCountOutputTypeCountEntitlementsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EntitlementWhereInput
  }

  /**
   * PlanCountOutputType without action
   */
  export type PlanCountOutputTypeCountSubscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
  }

  /**
   * PlanCountOutputType without action
   */
  export type PlanCountOutputTypeCountOrdersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
  }


  /**
   * Count Type OrderCountOutputType
   */

  export type OrderCountOutputType = {
    paymentEvents: number
  }

  export type OrderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    paymentEvents?: boolean | OrderCountOutputTypeCountPaymentEventsArgs
  }

  // Custom InputTypes
  /**
   * OrderCountOutputType without action
   */
  export type OrderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrderCountOutputType
     */
    select?: OrderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * OrderCountOutputType without action
   */
  export type OrderCountOutputTypeCountPaymentEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentEventWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    password: string | null
    phone: string | null
    emailVerified: Date | null
    phoneVerified: Date | null
    avatarUrl: string | null
    githubId: string | null
    role: string | null
    bannedAt: Date | null
    banReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    name: string | null
    password: string | null
    phone: string | null
    emailVerified: Date | null
    phoneVerified: Date | null
    avatarUrl: string | null
    githubId: string | null
    role: string | null
    bannedAt: Date | null
    banReason: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    name: number
    password: number
    phone: number
    emailVerified: number
    phoneVerified: number
    avatarUrl: number
    githubId: number
    role: number
    bannedAt: number
    banReason: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    name?: true
    password?: true
    phone?: true
    emailVerified?: true
    phoneVerified?: true
    avatarUrl?: true
    githubId?: true
    role?: true
    bannedAt?: true
    banReason?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    name?: true
    password?: true
    phone?: true
    emailVerified?: true
    phoneVerified?: true
    avatarUrl?: true
    githubId?: true
    role?: true
    bannedAt?: true
    banReason?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    name?: true
    password?: true
    phone?: true
    emailVerified?: true
    phoneVerified?: true
    avatarUrl?: true
    githubId?: true
    role?: true
    bannedAt?: true
    banReason?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    name: string
    password: string | null
    phone: string | null
    emailVerified: Date | null
    phoneVerified: Date | null
    avatarUrl: string | null
    githubId: string | null
    role: string
    bannedAt: Date | null
    banReason: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    password?: boolean
    phone?: boolean
    emailVerified?: boolean
    phoneVerified?: boolean
    avatarUrl?: boolean
    githubId?: boolean
    role?: boolean
    bannedAt?: boolean
    banReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    subscriptions?: boolean | User$subscriptionsArgs<ExtArgs>
    orders?: boolean | User$ordersArgs<ExtArgs>
    usageRecords?: boolean | User$usageRecordsArgs<ExtArgs>
    generationJobs?: boolean | User$generationJobsArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    password?: boolean
    phone?: boolean
    emailVerified?: boolean
    phoneVerified?: boolean
    avatarUrl?: boolean
    githubId?: boolean
    role?: boolean
    bannedAt?: boolean
    banReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    name?: boolean
    password?: boolean
    phone?: boolean
    emailVerified?: boolean
    phoneVerified?: boolean
    avatarUrl?: boolean
    githubId?: boolean
    role?: boolean
    bannedAt?: boolean
    banReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    name?: boolean
    password?: boolean
    phone?: boolean
    emailVerified?: boolean
    phoneVerified?: boolean
    avatarUrl?: boolean
    githubId?: boolean
    role?: boolean
    bannedAt?: boolean
    banReason?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "name" | "password" | "phone" | "emailVerified" | "phoneVerified" | "avatarUrl" | "githubId" | "role" | "bannedAt" | "banReason" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subscriptions?: boolean | User$subscriptionsArgs<ExtArgs>
    orders?: boolean | User$ordersArgs<ExtArgs>
    usageRecords?: boolean | User$usageRecordsArgs<ExtArgs>
    generationJobs?: boolean | User$generationJobsArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      subscriptions: Prisma.$SubscriptionPayload<ExtArgs>[]
      orders: Prisma.$OrderPayload<ExtArgs>[]
      usageRecords: Prisma.$UsageRecordPayload<ExtArgs>[]
      generationJobs: Prisma.$GenerationJobPayload<ExtArgs>[]
      auditLogs: Prisma.$AdminAuditLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      name: string
      password: string | null
      phone: string | null
      emailVerified: Date | null
      phoneVerified: Date | null
      avatarUrl: string | null
      githubId: string | null
      role: string
      bannedAt: Date | null
      banReason: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    subscriptions<T extends User$subscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, User$subscriptionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    orders<T extends User$ordersArgs<ExtArgs> = {}>(args?: Subset<T, User$ordersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    usageRecords<T extends User$usageRecordsArgs<ExtArgs> = {}>(args?: Subset<T, User$usageRecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    generationJobs<T extends User$generationJobsArgs<ExtArgs> = {}>(args?: Subset<T, User$generationJobsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditLogs<T extends User$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly emailVerified: FieldRef<"User", 'DateTime'>
    readonly phoneVerified: FieldRef<"User", 'DateTime'>
    readonly avatarUrl: FieldRef<"User", 'String'>
    readonly githubId: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly bannedAt: FieldRef<"User", 'DateTime'>
    readonly banReason: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.subscriptions
   */
  export type User$subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    cursor?: SubscriptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * User.orders
   */
  export type User$ordersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    cursor?: OrderWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * User.usageRecords
   */
  export type User$usageRecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    where?: UsageRecordWhereInput
    orderBy?: UsageRecordOrderByWithRelationInput | UsageRecordOrderByWithRelationInput[]
    cursor?: UsageRecordWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UsageRecordScalarFieldEnum | UsageRecordScalarFieldEnum[]
  }

  /**
   * User.generationJobs
   */
  export type User$generationJobsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    where?: GenerationJobWhereInput
    orderBy?: GenerationJobOrderByWithRelationInput | GenerationJobOrderByWithRelationInput[]
    cursor?: GenerationJobWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GenerationJobScalarFieldEnum | GenerationJobScalarFieldEnum[]
  }

  /**
   * User.auditLogs
   */
  export type User$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    where?: AdminAuditLogWhereInput
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    cursor?: AdminAuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Plan
   */

  export type AggregatePlan = {
    _count: PlanCountAggregateOutputType | null
    _avg: PlanAvgAggregateOutputType | null
    _sum: PlanSumAggregateOutputType | null
    _min: PlanMinAggregateOutputType | null
    _max: PlanMaxAggregateOutputType | null
  }

  export type PlanAvgAggregateOutputType = {
    monthlyPrice: number | null
    yearlyPrice: number | null
    sortOrder: number | null
  }

  export type PlanSumAggregateOutputType = {
    monthlyPrice: number | null
    yearlyPrice: number | null
    sortOrder: number | null
  }

  export type PlanMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    monthlyPrice: number | null
    yearlyPrice: number | null
    currency: string | null
    sortOrder: number | null
    isActive: boolean | null
    isPopular: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlanMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    monthlyPrice: number | null
    yearlyPrice: number | null
    currency: string | null
    sortOrder: number | null
    isActive: boolean | null
    isPopular: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlanCountAggregateOutputType = {
    id: number
    name: number
    description: number
    monthlyPrice: number
    yearlyPrice: number
    currency: number
    sortOrder: number
    isActive: number
    isPopular: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PlanAvgAggregateInputType = {
    monthlyPrice?: true
    yearlyPrice?: true
    sortOrder?: true
  }

  export type PlanSumAggregateInputType = {
    monthlyPrice?: true
    yearlyPrice?: true
    sortOrder?: true
  }

  export type PlanMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    monthlyPrice?: true
    yearlyPrice?: true
    currency?: true
    sortOrder?: true
    isActive?: true
    isPopular?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlanMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    monthlyPrice?: true
    yearlyPrice?: true
    currency?: true
    sortOrder?: true
    isActive?: true
    isPopular?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlanCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    monthlyPrice?: true
    yearlyPrice?: true
    currency?: true
    sortOrder?: true
    isActive?: true
    isPopular?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PlanAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Plan to aggregate.
     */
    where?: PlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Plans to fetch.
     */
    orderBy?: PlanOrderByWithRelationInput | PlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Plans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Plans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Plans
    **/
    _count?: true | PlanCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlanAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlanSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlanMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlanMaxAggregateInputType
  }

  export type GetPlanAggregateType<T extends PlanAggregateArgs> = {
        [P in keyof T & keyof AggregatePlan]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlan[P]>
      : GetScalarType<T[P], AggregatePlan[P]>
  }




  export type PlanGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlanWhereInput
    orderBy?: PlanOrderByWithAggregationInput | PlanOrderByWithAggregationInput[]
    by: PlanScalarFieldEnum[] | PlanScalarFieldEnum
    having?: PlanScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlanCountAggregateInputType | true
    _avg?: PlanAvgAggregateInputType
    _sum?: PlanSumAggregateInputType
    _min?: PlanMinAggregateInputType
    _max?: PlanMaxAggregateInputType
  }

  export type PlanGroupByOutputType = {
    id: string
    name: string
    description: string
    monthlyPrice: number
    yearlyPrice: number
    currency: string
    sortOrder: number
    isActive: boolean
    isPopular: boolean
    createdAt: Date
    updatedAt: Date
    _count: PlanCountAggregateOutputType | null
    _avg: PlanAvgAggregateOutputType | null
    _sum: PlanSumAggregateOutputType | null
    _min: PlanMinAggregateOutputType | null
    _max: PlanMaxAggregateOutputType | null
  }

  type GetPlanGroupByPayload<T extends PlanGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlanGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlanGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlanGroupByOutputType[P]>
            : GetScalarType<T[P], PlanGroupByOutputType[P]>
        }
      >
    >


  export type PlanSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    monthlyPrice?: boolean
    yearlyPrice?: boolean
    currency?: boolean
    sortOrder?: boolean
    isActive?: boolean
    isPopular?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    entitlements?: boolean | Plan$entitlementsArgs<ExtArgs>
    subscriptions?: boolean | Plan$subscriptionsArgs<ExtArgs>
    orders?: boolean | Plan$ordersArgs<ExtArgs>
    _count?: boolean | PlanCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["plan"]>

  export type PlanSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    monthlyPrice?: boolean
    yearlyPrice?: boolean
    currency?: boolean
    sortOrder?: boolean
    isActive?: boolean
    isPopular?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["plan"]>

  export type PlanSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    monthlyPrice?: boolean
    yearlyPrice?: boolean
    currency?: boolean
    sortOrder?: boolean
    isActive?: boolean
    isPopular?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["plan"]>

  export type PlanSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    monthlyPrice?: boolean
    yearlyPrice?: boolean
    currency?: boolean
    sortOrder?: boolean
    isActive?: boolean
    isPopular?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PlanOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "monthlyPrice" | "yearlyPrice" | "currency" | "sortOrder" | "isActive" | "isPopular" | "createdAt" | "updatedAt", ExtArgs["result"]["plan"]>
  export type PlanInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    entitlements?: boolean | Plan$entitlementsArgs<ExtArgs>
    subscriptions?: boolean | Plan$subscriptionsArgs<ExtArgs>
    orders?: boolean | Plan$ordersArgs<ExtArgs>
    _count?: boolean | PlanCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PlanIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type PlanIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $PlanPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Plan"
    objects: {
      entitlements: Prisma.$EntitlementPayload<ExtArgs>[]
      subscriptions: Prisma.$SubscriptionPayload<ExtArgs>[]
      orders: Prisma.$OrderPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string
      monthlyPrice: number
      yearlyPrice: number
      currency: string
      sortOrder: number
      isActive: boolean
      isPopular: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["plan"]>
    composites: {}
  }

  type PlanGetPayload<S extends boolean | null | undefined | PlanDefaultArgs> = $Result.GetResult<Prisma.$PlanPayload, S>

  type PlanCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PlanFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlanCountAggregateInputType | true
    }

  export interface PlanDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Plan'], meta: { name: 'Plan' } }
    /**
     * Find zero or one Plan that matches the filter.
     * @param {PlanFindUniqueArgs} args - Arguments to find a Plan
     * @example
     * // Get one Plan
     * const plan = await prisma.plan.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlanFindUniqueArgs>(args: SelectSubset<T, PlanFindUniqueArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Plan that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PlanFindUniqueOrThrowArgs} args - Arguments to find a Plan
     * @example
     * // Get one Plan
     * const plan = await prisma.plan.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlanFindUniqueOrThrowArgs>(args: SelectSubset<T, PlanFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Plan that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanFindFirstArgs} args - Arguments to find a Plan
     * @example
     * // Get one Plan
     * const plan = await prisma.plan.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlanFindFirstArgs>(args?: SelectSubset<T, PlanFindFirstArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Plan that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanFindFirstOrThrowArgs} args - Arguments to find a Plan
     * @example
     * // Get one Plan
     * const plan = await prisma.plan.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlanFindFirstOrThrowArgs>(args?: SelectSubset<T, PlanFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Plans that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Plans
     * const plans = await prisma.plan.findMany()
     * 
     * // Get first 10 Plans
     * const plans = await prisma.plan.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const planWithIdOnly = await prisma.plan.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlanFindManyArgs>(args?: SelectSubset<T, PlanFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Plan.
     * @param {PlanCreateArgs} args - Arguments to create a Plan.
     * @example
     * // Create one Plan
     * const Plan = await prisma.plan.create({
     *   data: {
     *     // ... data to create a Plan
     *   }
     * })
     * 
     */
    create<T extends PlanCreateArgs>(args: SelectSubset<T, PlanCreateArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Plans.
     * @param {PlanCreateManyArgs} args - Arguments to create many Plans.
     * @example
     * // Create many Plans
     * const plan = await prisma.plan.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlanCreateManyArgs>(args?: SelectSubset<T, PlanCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Plans and returns the data saved in the database.
     * @param {PlanCreateManyAndReturnArgs} args - Arguments to create many Plans.
     * @example
     * // Create many Plans
     * const plan = await prisma.plan.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Plans and only return the `id`
     * const planWithIdOnly = await prisma.plan.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlanCreateManyAndReturnArgs>(args?: SelectSubset<T, PlanCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Plan.
     * @param {PlanDeleteArgs} args - Arguments to delete one Plan.
     * @example
     * // Delete one Plan
     * const Plan = await prisma.plan.delete({
     *   where: {
     *     // ... filter to delete one Plan
     *   }
     * })
     * 
     */
    delete<T extends PlanDeleteArgs>(args: SelectSubset<T, PlanDeleteArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Plan.
     * @param {PlanUpdateArgs} args - Arguments to update one Plan.
     * @example
     * // Update one Plan
     * const plan = await prisma.plan.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlanUpdateArgs>(args: SelectSubset<T, PlanUpdateArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Plans.
     * @param {PlanDeleteManyArgs} args - Arguments to filter Plans to delete.
     * @example
     * // Delete a few Plans
     * const { count } = await prisma.plan.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlanDeleteManyArgs>(args?: SelectSubset<T, PlanDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Plans.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Plans
     * const plan = await prisma.plan.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlanUpdateManyArgs>(args: SelectSubset<T, PlanUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Plans and returns the data updated in the database.
     * @param {PlanUpdateManyAndReturnArgs} args - Arguments to update many Plans.
     * @example
     * // Update many Plans
     * const plan = await prisma.plan.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Plans and only return the `id`
     * const planWithIdOnly = await prisma.plan.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PlanUpdateManyAndReturnArgs>(args: SelectSubset<T, PlanUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Plan.
     * @param {PlanUpsertArgs} args - Arguments to update or create a Plan.
     * @example
     * // Update or create a Plan
     * const plan = await prisma.plan.upsert({
     *   create: {
     *     // ... data to create a Plan
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Plan we want to update
     *   }
     * })
     */
    upsert<T extends PlanUpsertArgs>(args: SelectSubset<T, PlanUpsertArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Plans.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanCountArgs} args - Arguments to filter Plans to count.
     * @example
     * // Count the number of Plans
     * const count = await prisma.plan.count({
     *   where: {
     *     // ... the filter for the Plans we want to count
     *   }
     * })
    **/
    count<T extends PlanCountArgs>(
      args?: Subset<T, PlanCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlanCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Plan.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlanAggregateArgs>(args: Subset<T, PlanAggregateArgs>): Prisma.PrismaPromise<GetPlanAggregateType<T>>

    /**
     * Group by Plan.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlanGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlanGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlanGroupByArgs['orderBy'] }
        : { orderBy?: PlanGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlanGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlanGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Plan model
   */
  readonly fields: PlanFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Plan.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlanClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    entitlements<T extends Plan$entitlementsArgs<ExtArgs> = {}>(args?: Subset<T, Plan$entitlementsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    subscriptions<T extends Plan$subscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, Plan$subscriptionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    orders<T extends Plan$ordersArgs<ExtArgs> = {}>(args?: Subset<T, Plan$ordersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Plan model
   */
  interface PlanFieldRefs {
    readonly id: FieldRef<"Plan", 'String'>
    readonly name: FieldRef<"Plan", 'String'>
    readonly description: FieldRef<"Plan", 'String'>
    readonly monthlyPrice: FieldRef<"Plan", 'Int'>
    readonly yearlyPrice: FieldRef<"Plan", 'Int'>
    readonly currency: FieldRef<"Plan", 'String'>
    readonly sortOrder: FieldRef<"Plan", 'Int'>
    readonly isActive: FieldRef<"Plan", 'Boolean'>
    readonly isPopular: FieldRef<"Plan", 'Boolean'>
    readonly createdAt: FieldRef<"Plan", 'DateTime'>
    readonly updatedAt: FieldRef<"Plan", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Plan findUnique
   */
  export type PlanFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter, which Plan to fetch.
     */
    where: PlanWhereUniqueInput
  }

  /**
   * Plan findUniqueOrThrow
   */
  export type PlanFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter, which Plan to fetch.
     */
    where: PlanWhereUniqueInput
  }

  /**
   * Plan findFirst
   */
  export type PlanFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter, which Plan to fetch.
     */
    where?: PlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Plans to fetch.
     */
    orderBy?: PlanOrderByWithRelationInput | PlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Plans.
     */
    cursor?: PlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Plans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Plans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Plans.
     */
    distinct?: PlanScalarFieldEnum | PlanScalarFieldEnum[]
  }

  /**
   * Plan findFirstOrThrow
   */
  export type PlanFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter, which Plan to fetch.
     */
    where?: PlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Plans to fetch.
     */
    orderBy?: PlanOrderByWithRelationInput | PlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Plans.
     */
    cursor?: PlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Plans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Plans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Plans.
     */
    distinct?: PlanScalarFieldEnum | PlanScalarFieldEnum[]
  }

  /**
   * Plan findMany
   */
  export type PlanFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter, which Plans to fetch.
     */
    where?: PlanWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Plans to fetch.
     */
    orderBy?: PlanOrderByWithRelationInput | PlanOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Plans.
     */
    cursor?: PlanWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Plans from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Plans.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Plans.
     */
    distinct?: PlanScalarFieldEnum | PlanScalarFieldEnum[]
  }

  /**
   * Plan create
   */
  export type PlanCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * The data needed to create a Plan.
     */
    data: XOR<PlanCreateInput, PlanUncheckedCreateInput>
  }

  /**
   * Plan createMany
   */
  export type PlanCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Plans.
     */
    data: PlanCreateManyInput | PlanCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Plan createManyAndReturn
   */
  export type PlanCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * The data used to create many Plans.
     */
    data: PlanCreateManyInput | PlanCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Plan update
   */
  export type PlanUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * The data needed to update a Plan.
     */
    data: XOR<PlanUpdateInput, PlanUncheckedUpdateInput>
    /**
     * Choose, which Plan to update.
     */
    where: PlanWhereUniqueInput
  }

  /**
   * Plan updateMany
   */
  export type PlanUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Plans.
     */
    data: XOR<PlanUpdateManyMutationInput, PlanUncheckedUpdateManyInput>
    /**
     * Filter which Plans to update
     */
    where?: PlanWhereInput
    /**
     * Limit how many Plans to update.
     */
    limit?: number
  }

  /**
   * Plan updateManyAndReturn
   */
  export type PlanUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * The data used to update Plans.
     */
    data: XOR<PlanUpdateManyMutationInput, PlanUncheckedUpdateManyInput>
    /**
     * Filter which Plans to update
     */
    where?: PlanWhereInput
    /**
     * Limit how many Plans to update.
     */
    limit?: number
  }

  /**
   * Plan upsert
   */
  export type PlanUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * The filter to search for the Plan to update in case it exists.
     */
    where: PlanWhereUniqueInput
    /**
     * In case the Plan found by the `where` argument doesn't exist, create a new Plan with this data.
     */
    create: XOR<PlanCreateInput, PlanUncheckedCreateInput>
    /**
     * In case the Plan was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlanUpdateInput, PlanUncheckedUpdateInput>
  }

  /**
   * Plan delete
   */
  export type PlanDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    /**
     * Filter which Plan to delete.
     */
    where: PlanWhereUniqueInput
  }

  /**
   * Plan deleteMany
   */
  export type PlanDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Plans to delete
     */
    where?: PlanWhereInput
    /**
     * Limit how many Plans to delete.
     */
    limit?: number
  }

  /**
   * Plan.entitlements
   */
  export type Plan$entitlementsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    where?: EntitlementWhereInput
    orderBy?: EntitlementOrderByWithRelationInput | EntitlementOrderByWithRelationInput[]
    cursor?: EntitlementWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EntitlementScalarFieldEnum | EntitlementScalarFieldEnum[]
  }

  /**
   * Plan.subscriptions
   */
  export type Plan$subscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    cursor?: SubscriptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Plan.orders
   */
  export type Plan$ordersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    cursor?: OrderWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Plan without action
   */
  export type PlanDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
  }


  /**
   * Model Entitlement
   */

  export type AggregateEntitlement = {
    _count: EntitlementCountAggregateOutputType | null
    _min: EntitlementMinAggregateOutputType | null
    _max: EntitlementMaxAggregateOutputType | null
  }

  export type EntitlementMinAggregateOutputType = {
    id: string | null
    planId: string | null
    key: string | null
    label: string | null
    value: string | null
    unit: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EntitlementMaxAggregateOutputType = {
    id: string | null
    planId: string | null
    key: string | null
    label: string | null
    value: string | null
    unit: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EntitlementCountAggregateOutputType = {
    id: number
    planId: number
    key: number
    label: number
    value: number
    unit: number
    description: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type EntitlementMinAggregateInputType = {
    id?: true
    planId?: true
    key?: true
    label?: true
    value?: true
    unit?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EntitlementMaxAggregateInputType = {
    id?: true
    planId?: true
    key?: true
    label?: true
    value?: true
    unit?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EntitlementCountAggregateInputType = {
    id?: true
    planId?: true
    key?: true
    label?: true
    value?: true
    unit?: true
    description?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type EntitlementAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Entitlement to aggregate.
     */
    where?: EntitlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Entitlements to fetch.
     */
    orderBy?: EntitlementOrderByWithRelationInput | EntitlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EntitlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Entitlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Entitlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Entitlements
    **/
    _count?: true | EntitlementCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EntitlementMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EntitlementMaxAggregateInputType
  }

  export type GetEntitlementAggregateType<T extends EntitlementAggregateArgs> = {
        [P in keyof T & keyof AggregateEntitlement]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEntitlement[P]>
      : GetScalarType<T[P], AggregateEntitlement[P]>
  }




  export type EntitlementGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EntitlementWhereInput
    orderBy?: EntitlementOrderByWithAggregationInput | EntitlementOrderByWithAggregationInput[]
    by: EntitlementScalarFieldEnum[] | EntitlementScalarFieldEnum
    having?: EntitlementScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EntitlementCountAggregateInputType | true
    _min?: EntitlementMinAggregateInputType
    _max?: EntitlementMaxAggregateInputType
  }

  export type EntitlementGroupByOutputType = {
    id: string
    planId: string
    key: string
    label: string
    value: string
    unit: string
    description: string
    createdAt: Date
    updatedAt: Date
    _count: EntitlementCountAggregateOutputType | null
    _min: EntitlementMinAggregateOutputType | null
    _max: EntitlementMaxAggregateOutputType | null
  }

  type GetEntitlementGroupByPayload<T extends EntitlementGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EntitlementGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EntitlementGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EntitlementGroupByOutputType[P]>
            : GetScalarType<T[P], EntitlementGroupByOutputType[P]>
        }
      >
    >


  export type EntitlementSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    key?: boolean
    label?: boolean
    value?: boolean
    unit?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["entitlement"]>

  export type EntitlementSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    key?: boolean
    label?: boolean
    value?: boolean
    unit?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["entitlement"]>

  export type EntitlementSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    planId?: boolean
    key?: boolean
    label?: boolean
    value?: boolean
    unit?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["entitlement"]>

  export type EntitlementSelectScalar = {
    id?: boolean
    planId?: boolean
    key?: boolean
    label?: boolean
    value?: boolean
    unit?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type EntitlementOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "planId" | "key" | "label" | "value" | "unit" | "description" | "createdAt" | "updatedAt", ExtArgs["result"]["entitlement"]>
  export type EntitlementInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }
  export type EntitlementIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }
  export type EntitlementIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }

  export type $EntitlementPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Entitlement"
    objects: {
      plan: Prisma.$PlanPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      planId: string
      key: string
      label: string
      value: string
      unit: string
      description: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["entitlement"]>
    composites: {}
  }

  type EntitlementGetPayload<S extends boolean | null | undefined | EntitlementDefaultArgs> = $Result.GetResult<Prisma.$EntitlementPayload, S>

  type EntitlementCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EntitlementFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EntitlementCountAggregateInputType | true
    }

  export interface EntitlementDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Entitlement'], meta: { name: 'Entitlement' } }
    /**
     * Find zero or one Entitlement that matches the filter.
     * @param {EntitlementFindUniqueArgs} args - Arguments to find a Entitlement
     * @example
     * // Get one Entitlement
     * const entitlement = await prisma.entitlement.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EntitlementFindUniqueArgs>(args: SelectSubset<T, EntitlementFindUniqueArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Entitlement that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EntitlementFindUniqueOrThrowArgs} args - Arguments to find a Entitlement
     * @example
     * // Get one Entitlement
     * const entitlement = await prisma.entitlement.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EntitlementFindUniqueOrThrowArgs>(args: SelectSubset<T, EntitlementFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Entitlement that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementFindFirstArgs} args - Arguments to find a Entitlement
     * @example
     * // Get one Entitlement
     * const entitlement = await prisma.entitlement.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EntitlementFindFirstArgs>(args?: SelectSubset<T, EntitlementFindFirstArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Entitlement that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementFindFirstOrThrowArgs} args - Arguments to find a Entitlement
     * @example
     * // Get one Entitlement
     * const entitlement = await prisma.entitlement.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EntitlementFindFirstOrThrowArgs>(args?: SelectSubset<T, EntitlementFindFirstOrThrowArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Entitlements that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Entitlements
     * const entitlements = await prisma.entitlement.findMany()
     * 
     * // Get first 10 Entitlements
     * const entitlements = await prisma.entitlement.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const entitlementWithIdOnly = await prisma.entitlement.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EntitlementFindManyArgs>(args?: SelectSubset<T, EntitlementFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Entitlement.
     * @param {EntitlementCreateArgs} args - Arguments to create a Entitlement.
     * @example
     * // Create one Entitlement
     * const Entitlement = await prisma.entitlement.create({
     *   data: {
     *     // ... data to create a Entitlement
     *   }
     * })
     * 
     */
    create<T extends EntitlementCreateArgs>(args: SelectSubset<T, EntitlementCreateArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Entitlements.
     * @param {EntitlementCreateManyArgs} args - Arguments to create many Entitlements.
     * @example
     * // Create many Entitlements
     * const entitlement = await prisma.entitlement.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EntitlementCreateManyArgs>(args?: SelectSubset<T, EntitlementCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Entitlements and returns the data saved in the database.
     * @param {EntitlementCreateManyAndReturnArgs} args - Arguments to create many Entitlements.
     * @example
     * // Create many Entitlements
     * const entitlement = await prisma.entitlement.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Entitlements and only return the `id`
     * const entitlementWithIdOnly = await prisma.entitlement.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EntitlementCreateManyAndReturnArgs>(args?: SelectSubset<T, EntitlementCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Entitlement.
     * @param {EntitlementDeleteArgs} args - Arguments to delete one Entitlement.
     * @example
     * // Delete one Entitlement
     * const Entitlement = await prisma.entitlement.delete({
     *   where: {
     *     // ... filter to delete one Entitlement
     *   }
     * })
     * 
     */
    delete<T extends EntitlementDeleteArgs>(args: SelectSubset<T, EntitlementDeleteArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Entitlement.
     * @param {EntitlementUpdateArgs} args - Arguments to update one Entitlement.
     * @example
     * // Update one Entitlement
     * const entitlement = await prisma.entitlement.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EntitlementUpdateArgs>(args: SelectSubset<T, EntitlementUpdateArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Entitlements.
     * @param {EntitlementDeleteManyArgs} args - Arguments to filter Entitlements to delete.
     * @example
     * // Delete a few Entitlements
     * const { count } = await prisma.entitlement.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EntitlementDeleteManyArgs>(args?: SelectSubset<T, EntitlementDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Entitlements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Entitlements
     * const entitlement = await prisma.entitlement.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EntitlementUpdateManyArgs>(args: SelectSubset<T, EntitlementUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Entitlements and returns the data updated in the database.
     * @param {EntitlementUpdateManyAndReturnArgs} args - Arguments to update many Entitlements.
     * @example
     * // Update many Entitlements
     * const entitlement = await prisma.entitlement.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Entitlements and only return the `id`
     * const entitlementWithIdOnly = await prisma.entitlement.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EntitlementUpdateManyAndReturnArgs>(args: SelectSubset<T, EntitlementUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Entitlement.
     * @param {EntitlementUpsertArgs} args - Arguments to update or create a Entitlement.
     * @example
     * // Update or create a Entitlement
     * const entitlement = await prisma.entitlement.upsert({
     *   create: {
     *     // ... data to create a Entitlement
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Entitlement we want to update
     *   }
     * })
     */
    upsert<T extends EntitlementUpsertArgs>(args: SelectSubset<T, EntitlementUpsertArgs<ExtArgs>>): Prisma__EntitlementClient<$Result.GetResult<Prisma.$EntitlementPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Entitlements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementCountArgs} args - Arguments to filter Entitlements to count.
     * @example
     * // Count the number of Entitlements
     * const count = await prisma.entitlement.count({
     *   where: {
     *     // ... the filter for the Entitlements we want to count
     *   }
     * })
    **/
    count<T extends EntitlementCountArgs>(
      args?: Subset<T, EntitlementCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EntitlementCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Entitlement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EntitlementAggregateArgs>(args: Subset<T, EntitlementAggregateArgs>): Prisma.PrismaPromise<GetEntitlementAggregateType<T>>

    /**
     * Group by Entitlement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EntitlementGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EntitlementGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EntitlementGroupByArgs['orderBy'] }
        : { orderBy?: EntitlementGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EntitlementGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEntitlementGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Entitlement model
   */
  readonly fields: EntitlementFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Entitlement.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EntitlementClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    plan<T extends PlanDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlanDefaultArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Entitlement model
   */
  interface EntitlementFieldRefs {
    readonly id: FieldRef<"Entitlement", 'String'>
    readonly planId: FieldRef<"Entitlement", 'String'>
    readonly key: FieldRef<"Entitlement", 'String'>
    readonly label: FieldRef<"Entitlement", 'String'>
    readonly value: FieldRef<"Entitlement", 'String'>
    readonly unit: FieldRef<"Entitlement", 'String'>
    readonly description: FieldRef<"Entitlement", 'String'>
    readonly createdAt: FieldRef<"Entitlement", 'DateTime'>
    readonly updatedAt: FieldRef<"Entitlement", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Entitlement findUnique
   */
  export type EntitlementFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter, which Entitlement to fetch.
     */
    where: EntitlementWhereUniqueInput
  }

  /**
   * Entitlement findUniqueOrThrow
   */
  export type EntitlementFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter, which Entitlement to fetch.
     */
    where: EntitlementWhereUniqueInput
  }

  /**
   * Entitlement findFirst
   */
  export type EntitlementFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter, which Entitlement to fetch.
     */
    where?: EntitlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Entitlements to fetch.
     */
    orderBy?: EntitlementOrderByWithRelationInput | EntitlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Entitlements.
     */
    cursor?: EntitlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Entitlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Entitlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Entitlements.
     */
    distinct?: EntitlementScalarFieldEnum | EntitlementScalarFieldEnum[]
  }

  /**
   * Entitlement findFirstOrThrow
   */
  export type EntitlementFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter, which Entitlement to fetch.
     */
    where?: EntitlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Entitlements to fetch.
     */
    orderBy?: EntitlementOrderByWithRelationInput | EntitlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Entitlements.
     */
    cursor?: EntitlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Entitlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Entitlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Entitlements.
     */
    distinct?: EntitlementScalarFieldEnum | EntitlementScalarFieldEnum[]
  }

  /**
   * Entitlement findMany
   */
  export type EntitlementFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter, which Entitlements to fetch.
     */
    where?: EntitlementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Entitlements to fetch.
     */
    orderBy?: EntitlementOrderByWithRelationInput | EntitlementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Entitlements.
     */
    cursor?: EntitlementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Entitlements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Entitlements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Entitlements.
     */
    distinct?: EntitlementScalarFieldEnum | EntitlementScalarFieldEnum[]
  }

  /**
   * Entitlement create
   */
  export type EntitlementCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * The data needed to create a Entitlement.
     */
    data: XOR<EntitlementCreateInput, EntitlementUncheckedCreateInput>
  }

  /**
   * Entitlement createMany
   */
  export type EntitlementCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Entitlements.
     */
    data: EntitlementCreateManyInput | EntitlementCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Entitlement createManyAndReturn
   */
  export type EntitlementCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * The data used to create many Entitlements.
     */
    data: EntitlementCreateManyInput | EntitlementCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Entitlement update
   */
  export type EntitlementUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * The data needed to update a Entitlement.
     */
    data: XOR<EntitlementUpdateInput, EntitlementUncheckedUpdateInput>
    /**
     * Choose, which Entitlement to update.
     */
    where: EntitlementWhereUniqueInput
  }

  /**
   * Entitlement updateMany
   */
  export type EntitlementUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Entitlements.
     */
    data: XOR<EntitlementUpdateManyMutationInput, EntitlementUncheckedUpdateManyInput>
    /**
     * Filter which Entitlements to update
     */
    where?: EntitlementWhereInput
    /**
     * Limit how many Entitlements to update.
     */
    limit?: number
  }

  /**
   * Entitlement updateManyAndReturn
   */
  export type EntitlementUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * The data used to update Entitlements.
     */
    data: XOR<EntitlementUpdateManyMutationInput, EntitlementUncheckedUpdateManyInput>
    /**
     * Filter which Entitlements to update
     */
    where?: EntitlementWhereInput
    /**
     * Limit how many Entitlements to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Entitlement upsert
   */
  export type EntitlementUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * The filter to search for the Entitlement to update in case it exists.
     */
    where: EntitlementWhereUniqueInput
    /**
     * In case the Entitlement found by the `where` argument doesn't exist, create a new Entitlement with this data.
     */
    create: XOR<EntitlementCreateInput, EntitlementUncheckedCreateInput>
    /**
     * In case the Entitlement was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EntitlementUpdateInput, EntitlementUncheckedUpdateInput>
  }

  /**
   * Entitlement delete
   */
  export type EntitlementDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
    /**
     * Filter which Entitlement to delete.
     */
    where: EntitlementWhereUniqueInput
  }

  /**
   * Entitlement deleteMany
   */
  export type EntitlementDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Entitlements to delete
     */
    where?: EntitlementWhereInput
    /**
     * Limit how many Entitlements to delete.
     */
    limit?: number
  }

  /**
   * Entitlement without action
   */
  export type EntitlementDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Entitlement
     */
    select?: EntitlementSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Entitlement
     */
    omit?: EntitlementOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EntitlementInclude<ExtArgs> | null
  }


  /**
   * Model Subscription
   */

  export type AggregateSubscription = {
    _count: SubscriptionCountAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  export type SubscriptionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    planId: string | null
    status: string | null
    billingCycle: string | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean | null
    autoRenew: boolean | null
    provider: string | null
    providerSubId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    planId: string | null
    status: string | null
    billingCycle: string | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean | null
    autoRenew: boolean | null
    provider: string | null
    providerSubId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubscriptionCountAggregateOutputType = {
    id: number
    userId: number
    planId: number
    status: number
    billingCycle: number
    currentPeriodStart: number
    currentPeriodEnd: number
    cancelAtPeriodEnd: number
    autoRenew: number
    provider: number
    providerSubId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubscriptionMinAggregateInputType = {
    id?: true
    userId?: true
    planId?: true
    status?: true
    billingCycle?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    cancelAtPeriodEnd?: true
    autoRenew?: true
    provider?: true
    providerSubId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionMaxAggregateInputType = {
    id?: true
    userId?: true
    planId?: true
    status?: true
    billingCycle?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    cancelAtPeriodEnd?: true
    autoRenew?: true
    provider?: true
    providerSubId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubscriptionCountAggregateInputType = {
    id?: true
    userId?: true
    planId?: true
    status?: true
    billingCycle?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    cancelAtPeriodEnd?: true
    autoRenew?: true
    provider?: true
    providerSubId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscription to aggregate.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Subscriptions
    **/
    _count?: true | SubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubscriptionMaxAggregateInputType
  }

  export type GetSubscriptionAggregateType<T extends SubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubscription[P]>
      : GetScalarType<T[P], AggregateSubscription[P]>
  }




  export type SubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithAggregationInput | SubscriptionOrderByWithAggregationInput[]
    by: SubscriptionScalarFieldEnum[] | SubscriptionScalarFieldEnum
    having?: SubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubscriptionCountAggregateInputType | true
    _min?: SubscriptionMinAggregateInputType
    _max?: SubscriptionMaxAggregateInputType
  }

  export type SubscriptionGroupByOutputType = {
    id: string
    userId: string
    planId: string
    status: string
    billingCycle: string
    currentPeriodStart: Date
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
    autoRenew: boolean
    provider: string
    providerSubId: string | null
    createdAt: Date
    updatedAt: Date
    _count: SubscriptionCountAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  type GetSubscriptionGroupByPayload<T extends SubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type SubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    planId?: boolean
    status?: boolean
    billingCycle?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: boolean
    providerSubId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    planId?: boolean
    status?: boolean
    billingCycle?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: boolean
    providerSubId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    planId?: boolean
    status?: boolean
    billingCycle?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: boolean
    providerSubId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectScalar = {
    id?: boolean
    userId?: boolean
    planId?: boolean
    status?: boolean
    billingCycle?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: boolean
    providerSubId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "planId" | "status" | "billingCycle" | "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "autoRenew" | "provider" | "providerSubId" | "createdAt" | "updatedAt", ExtArgs["result"]["subscription"]>
  export type SubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }
  export type SubscriptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }
  export type SubscriptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | Subscription$planArgs<ExtArgs>
  }

  export type $SubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Subscription"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      plan: Prisma.$PlanPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      planId: string
      status: string
      billingCycle: string
      currentPeriodStart: Date
      currentPeriodEnd: Date | null
      cancelAtPeriodEnd: boolean
      autoRenew: boolean
      provider: string
      providerSubId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["subscription"]>
    composites: {}
  }

  type SubscriptionGetPayload<S extends boolean | null | undefined | SubscriptionDefaultArgs> = $Result.GetResult<Prisma.$SubscriptionPayload, S>

  type SubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubscriptionCountAggregateInputType | true
    }

  export interface SubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Subscription'], meta: { name: 'Subscription' } }
    /**
     * Find zero or one Subscription that matches the filter.
     * @param {SubscriptionFindUniqueArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubscriptionFindUniqueArgs>(args: SelectSubset<T, SubscriptionFindUniqueArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Subscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubscriptionFindUniqueOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubscriptionFindFirstArgs>(args?: SelectSubset<T, SubscriptionFindFirstArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Subscriptions
     * const subscriptions = await prisma.subscription.findMany()
     * 
     * // Get first 10 Subscriptions
     * const subscriptions = await prisma.subscription.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubscriptionFindManyArgs>(args?: SelectSubset<T, SubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Subscription.
     * @param {SubscriptionCreateArgs} args - Arguments to create a Subscription.
     * @example
     * // Create one Subscription
     * const Subscription = await prisma.subscription.create({
     *   data: {
     *     // ... data to create a Subscription
     *   }
     * })
     * 
     */
    create<T extends SubscriptionCreateArgs>(args: SelectSubset<T, SubscriptionCreateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Subscriptions.
     * @param {SubscriptionCreateManyArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubscriptionCreateManyArgs>(args?: SelectSubset<T, SubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Subscriptions and returns the data saved in the database.
     * @param {SubscriptionCreateManyAndReturnArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Subscriptions and only return the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubscriptionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubscriptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Subscription.
     * @param {SubscriptionDeleteArgs} args - Arguments to delete one Subscription.
     * @example
     * // Delete one Subscription
     * const Subscription = await prisma.subscription.delete({
     *   where: {
     *     // ... filter to delete one Subscription
     *   }
     * })
     * 
     */
    delete<T extends SubscriptionDeleteArgs>(args: SelectSubset<T, SubscriptionDeleteArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Subscription.
     * @param {SubscriptionUpdateArgs} args - Arguments to update one Subscription.
     * @example
     * // Update one Subscription
     * const subscription = await prisma.subscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubscriptionUpdateArgs>(args: SelectSubset<T, SubscriptionUpdateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Subscriptions.
     * @param {SubscriptionDeleteManyArgs} args - Arguments to filter Subscriptions to delete.
     * @example
     * // Delete a few Subscriptions
     * const { count } = await prisma.subscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubscriptionDeleteManyArgs>(args?: SelectSubset<T, SubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubscriptionUpdateManyArgs>(args: SelectSubset<T, SubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions and returns the data updated in the database.
     * @param {SubscriptionUpdateManyAndReturnArgs} args - Arguments to update many Subscriptions.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Subscriptions and only return the `id`
     * const subscriptionWithIdOnly = await prisma.subscription.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubscriptionUpdateManyAndReturnArgs>(args: SelectSubset<T, SubscriptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Subscription.
     * @param {SubscriptionUpsertArgs} args - Arguments to update or create a Subscription.
     * @example
     * // Update or create a Subscription
     * const subscription = await prisma.subscription.upsert({
     *   create: {
     *     // ... data to create a Subscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Subscription we want to update
     *   }
     * })
     */
    upsert<T extends SubscriptionUpsertArgs>(args: SelectSubset<T, SubscriptionUpsertArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionCountArgs} args - Arguments to filter Subscriptions to count.
     * @example
     * // Count the number of Subscriptions
     * const count = await prisma.subscription.count({
     *   where: {
     *     // ... the filter for the Subscriptions we want to count
     *   }
     * })
    **/
    count<T extends SubscriptionCountArgs>(
      args?: Subset<T, SubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubscriptionAggregateArgs>(args: Subset<T, SubscriptionAggregateArgs>): Prisma.PrismaPromise<GetSubscriptionAggregateType<T>>

    /**
     * Group by Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: SubscriptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Subscription model
   */
  readonly fields: SubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Subscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    plan<T extends Subscription$planArgs<ExtArgs> = {}>(args?: Subset<T, Subscription$planArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Subscription model
   */
  interface SubscriptionFieldRefs {
    readonly id: FieldRef<"Subscription", 'String'>
    readonly userId: FieldRef<"Subscription", 'String'>
    readonly planId: FieldRef<"Subscription", 'String'>
    readonly status: FieldRef<"Subscription", 'String'>
    readonly billingCycle: FieldRef<"Subscription", 'String'>
    readonly currentPeriodStart: FieldRef<"Subscription", 'DateTime'>
    readonly currentPeriodEnd: FieldRef<"Subscription", 'DateTime'>
    readonly cancelAtPeriodEnd: FieldRef<"Subscription", 'Boolean'>
    readonly autoRenew: FieldRef<"Subscription", 'Boolean'>
    readonly provider: FieldRef<"Subscription", 'String'>
    readonly providerSubId: FieldRef<"Subscription", 'String'>
    readonly createdAt: FieldRef<"Subscription", 'DateTime'>
    readonly updatedAt: FieldRef<"Subscription", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Subscription findUnique
   */
  export type SubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findUniqueOrThrow
   */
  export type SubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findFirst
   */
  export type SubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findFirstOrThrow
   */
  export type SubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findMany
   */
  export type SubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscriptions to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription create
   */
  export type SubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a Subscription.
     */
    data: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
  }

  /**
   * Subscription createMany
   */
  export type SubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Subscription createManyAndReturn
   */
  export type SubscriptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription update
   */
  export type SubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a Subscription.
     */
    data: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
    /**
     * Choose, which Subscription to update.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription updateMany
   */
  export type SubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
  }

  /**
   * Subscription updateManyAndReturn
   */
  export type SubscriptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription upsert
   */
  export type SubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the Subscription to update in case it exists.
     */
    where: SubscriptionWhereUniqueInput
    /**
     * In case the Subscription found by the `where` argument doesn't exist, create a new Subscription with this data.
     */
    create: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
    /**
     * In case the Subscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
  }

  /**
   * Subscription delete
   */
  export type SubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter which Subscription to delete.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription deleteMany
   */
  export type SubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscriptions to delete
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to delete.
     */
    limit?: number
  }

  /**
   * Subscription.plan
   */
  export type Subscription$planArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Plan
     */
    select?: PlanSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Plan
     */
    omit?: PlanOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlanInclude<ExtArgs> | null
    where?: PlanWhereInput
  }

  /**
   * Subscription without action
   */
  export type SubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
  }


  /**
   * Model UsageRecord
   */

  export type AggregateUsageRecord = {
    _count: UsageRecordCountAggregateOutputType | null
    _avg: UsageRecordAvgAggregateOutputType | null
    _sum: UsageRecordSumAggregateOutputType | null
    _min: UsageRecordMinAggregateOutputType | null
    _max: UsageRecordMaxAggregateOutputType | null
  }

  export type UsageRecordAvgAggregateOutputType = {
    used: number | null
    limit: number | null
  }

  export type UsageRecordSumAggregateOutputType = {
    used: number | null
    limit: number | null
  }

  export type UsageRecordMinAggregateOutputType = {
    id: string | null
    userId: string | null
    metric: string | null
    used: number | null
    limit: number | null
    period: string | null
    resetAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UsageRecordMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    metric: string | null
    used: number | null
    limit: number | null
    period: string | null
    resetAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UsageRecordCountAggregateOutputType = {
    id: number
    userId: number
    metric: number
    used: number
    limit: number
    period: number
    resetAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UsageRecordAvgAggregateInputType = {
    used?: true
    limit?: true
  }

  export type UsageRecordSumAggregateInputType = {
    used?: true
    limit?: true
  }

  export type UsageRecordMinAggregateInputType = {
    id?: true
    userId?: true
    metric?: true
    used?: true
    limit?: true
    period?: true
    resetAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UsageRecordMaxAggregateInputType = {
    id?: true
    userId?: true
    metric?: true
    used?: true
    limit?: true
    period?: true
    resetAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UsageRecordCountAggregateInputType = {
    id?: true
    userId?: true
    metric?: true
    used?: true
    limit?: true
    period?: true
    resetAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UsageRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UsageRecord to aggregate.
     */
    where?: UsageRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageRecords to fetch.
     */
    orderBy?: UsageRecordOrderByWithRelationInput | UsageRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UsageRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UsageRecords
    **/
    _count?: true | UsageRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsageRecordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsageRecordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsageRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsageRecordMaxAggregateInputType
  }

  export type GetUsageRecordAggregateType<T extends UsageRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateUsageRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsageRecord[P]>
      : GetScalarType<T[P], AggregateUsageRecord[P]>
  }




  export type UsageRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsageRecordWhereInput
    orderBy?: UsageRecordOrderByWithAggregationInput | UsageRecordOrderByWithAggregationInput[]
    by: UsageRecordScalarFieldEnum[] | UsageRecordScalarFieldEnum
    having?: UsageRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsageRecordCountAggregateInputType | true
    _avg?: UsageRecordAvgAggregateInputType
    _sum?: UsageRecordSumAggregateInputType
    _min?: UsageRecordMinAggregateInputType
    _max?: UsageRecordMaxAggregateInputType
  }

  export type UsageRecordGroupByOutputType = {
    id: string
    userId: string
    metric: string
    used: number
    limit: number | null
    period: string
    resetAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UsageRecordCountAggregateOutputType | null
    _avg: UsageRecordAvgAggregateOutputType | null
    _sum: UsageRecordSumAggregateOutputType | null
    _min: UsageRecordMinAggregateOutputType | null
    _max: UsageRecordMaxAggregateOutputType | null
  }

  type GetUsageRecordGroupByPayload<T extends UsageRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsageRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsageRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsageRecordGroupByOutputType[P]>
            : GetScalarType<T[P], UsageRecordGroupByOutputType[P]>
        }
      >
    >


  export type UsageRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    metric?: boolean
    used?: boolean
    limit?: boolean
    period?: boolean
    resetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageRecord"]>

  export type UsageRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    metric?: boolean
    used?: boolean
    limit?: boolean
    period?: boolean
    resetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageRecord"]>

  export type UsageRecordSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    metric?: boolean
    used?: boolean
    limit?: boolean
    period?: boolean
    resetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usageRecord"]>

  export type UsageRecordSelectScalar = {
    id?: boolean
    userId?: boolean
    metric?: boolean
    used?: boolean
    limit?: boolean
    period?: boolean
    resetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UsageRecordOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "metric" | "used" | "limit" | "period" | "resetAt" | "createdAt" | "updatedAt", ExtArgs["result"]["usageRecord"]>
  export type UsageRecordInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UsageRecordIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UsageRecordIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UsageRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UsageRecord"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      metric: string
      used: number
      limit: number | null
      period: string
      resetAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["usageRecord"]>
    composites: {}
  }

  type UsageRecordGetPayload<S extends boolean | null | undefined | UsageRecordDefaultArgs> = $Result.GetResult<Prisma.$UsageRecordPayload, S>

  type UsageRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UsageRecordFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsageRecordCountAggregateInputType | true
    }

  export interface UsageRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UsageRecord'], meta: { name: 'UsageRecord' } }
    /**
     * Find zero or one UsageRecord that matches the filter.
     * @param {UsageRecordFindUniqueArgs} args - Arguments to find a UsageRecord
     * @example
     * // Get one UsageRecord
     * const usageRecord = await prisma.usageRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UsageRecordFindUniqueArgs>(args: SelectSubset<T, UsageRecordFindUniqueArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UsageRecord that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UsageRecordFindUniqueOrThrowArgs} args - Arguments to find a UsageRecord
     * @example
     * // Get one UsageRecord
     * const usageRecord = await prisma.usageRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UsageRecordFindUniqueOrThrowArgs>(args: SelectSubset<T, UsageRecordFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UsageRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordFindFirstArgs} args - Arguments to find a UsageRecord
     * @example
     * // Get one UsageRecord
     * const usageRecord = await prisma.usageRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UsageRecordFindFirstArgs>(args?: SelectSubset<T, UsageRecordFindFirstArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UsageRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordFindFirstOrThrowArgs} args - Arguments to find a UsageRecord
     * @example
     * // Get one UsageRecord
     * const usageRecord = await prisma.usageRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UsageRecordFindFirstOrThrowArgs>(args?: SelectSubset<T, UsageRecordFindFirstOrThrowArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UsageRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UsageRecords
     * const usageRecords = await prisma.usageRecord.findMany()
     * 
     * // Get first 10 UsageRecords
     * const usageRecords = await prisma.usageRecord.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usageRecordWithIdOnly = await prisma.usageRecord.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UsageRecordFindManyArgs>(args?: SelectSubset<T, UsageRecordFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UsageRecord.
     * @param {UsageRecordCreateArgs} args - Arguments to create a UsageRecord.
     * @example
     * // Create one UsageRecord
     * const UsageRecord = await prisma.usageRecord.create({
     *   data: {
     *     // ... data to create a UsageRecord
     *   }
     * })
     * 
     */
    create<T extends UsageRecordCreateArgs>(args: SelectSubset<T, UsageRecordCreateArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UsageRecords.
     * @param {UsageRecordCreateManyArgs} args - Arguments to create many UsageRecords.
     * @example
     * // Create many UsageRecords
     * const usageRecord = await prisma.usageRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UsageRecordCreateManyArgs>(args?: SelectSubset<T, UsageRecordCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UsageRecords and returns the data saved in the database.
     * @param {UsageRecordCreateManyAndReturnArgs} args - Arguments to create many UsageRecords.
     * @example
     * // Create many UsageRecords
     * const usageRecord = await prisma.usageRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UsageRecords and only return the `id`
     * const usageRecordWithIdOnly = await prisma.usageRecord.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UsageRecordCreateManyAndReturnArgs>(args?: SelectSubset<T, UsageRecordCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UsageRecord.
     * @param {UsageRecordDeleteArgs} args - Arguments to delete one UsageRecord.
     * @example
     * // Delete one UsageRecord
     * const UsageRecord = await prisma.usageRecord.delete({
     *   where: {
     *     // ... filter to delete one UsageRecord
     *   }
     * })
     * 
     */
    delete<T extends UsageRecordDeleteArgs>(args: SelectSubset<T, UsageRecordDeleteArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UsageRecord.
     * @param {UsageRecordUpdateArgs} args - Arguments to update one UsageRecord.
     * @example
     * // Update one UsageRecord
     * const usageRecord = await prisma.usageRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UsageRecordUpdateArgs>(args: SelectSubset<T, UsageRecordUpdateArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UsageRecords.
     * @param {UsageRecordDeleteManyArgs} args - Arguments to filter UsageRecords to delete.
     * @example
     * // Delete a few UsageRecords
     * const { count } = await prisma.usageRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UsageRecordDeleteManyArgs>(args?: SelectSubset<T, UsageRecordDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UsageRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UsageRecords
     * const usageRecord = await prisma.usageRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UsageRecordUpdateManyArgs>(args: SelectSubset<T, UsageRecordUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UsageRecords and returns the data updated in the database.
     * @param {UsageRecordUpdateManyAndReturnArgs} args - Arguments to update many UsageRecords.
     * @example
     * // Update many UsageRecords
     * const usageRecord = await prisma.usageRecord.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UsageRecords and only return the `id`
     * const usageRecordWithIdOnly = await prisma.usageRecord.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UsageRecordUpdateManyAndReturnArgs>(args: SelectSubset<T, UsageRecordUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UsageRecord.
     * @param {UsageRecordUpsertArgs} args - Arguments to update or create a UsageRecord.
     * @example
     * // Update or create a UsageRecord
     * const usageRecord = await prisma.usageRecord.upsert({
     *   create: {
     *     // ... data to create a UsageRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UsageRecord we want to update
     *   }
     * })
     */
    upsert<T extends UsageRecordUpsertArgs>(args: SelectSubset<T, UsageRecordUpsertArgs<ExtArgs>>): Prisma__UsageRecordClient<$Result.GetResult<Prisma.$UsageRecordPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UsageRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordCountArgs} args - Arguments to filter UsageRecords to count.
     * @example
     * // Count the number of UsageRecords
     * const count = await prisma.usageRecord.count({
     *   where: {
     *     // ... the filter for the UsageRecords we want to count
     *   }
     * })
    **/
    count<T extends UsageRecordCountArgs>(
      args?: Subset<T, UsageRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsageRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UsageRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsageRecordAggregateArgs>(args: Subset<T, UsageRecordAggregateArgs>): Prisma.PrismaPromise<GetUsageRecordAggregateType<T>>

    /**
     * Group by UsageRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsageRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UsageRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UsageRecordGroupByArgs['orderBy'] }
        : { orderBy?: UsageRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UsageRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsageRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UsageRecord model
   */
  readonly fields: UsageRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UsageRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UsageRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UsageRecord model
   */
  interface UsageRecordFieldRefs {
    readonly id: FieldRef<"UsageRecord", 'String'>
    readonly userId: FieldRef<"UsageRecord", 'String'>
    readonly metric: FieldRef<"UsageRecord", 'String'>
    readonly used: FieldRef<"UsageRecord", 'Int'>
    readonly limit: FieldRef<"UsageRecord", 'Int'>
    readonly period: FieldRef<"UsageRecord", 'String'>
    readonly resetAt: FieldRef<"UsageRecord", 'DateTime'>
    readonly createdAt: FieldRef<"UsageRecord", 'DateTime'>
    readonly updatedAt: FieldRef<"UsageRecord", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UsageRecord findUnique
   */
  export type UsageRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter, which UsageRecord to fetch.
     */
    where: UsageRecordWhereUniqueInput
  }

  /**
   * UsageRecord findUniqueOrThrow
   */
  export type UsageRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter, which UsageRecord to fetch.
     */
    where: UsageRecordWhereUniqueInput
  }

  /**
   * UsageRecord findFirst
   */
  export type UsageRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter, which UsageRecord to fetch.
     */
    where?: UsageRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageRecords to fetch.
     */
    orderBy?: UsageRecordOrderByWithRelationInput | UsageRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UsageRecords.
     */
    cursor?: UsageRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UsageRecords.
     */
    distinct?: UsageRecordScalarFieldEnum | UsageRecordScalarFieldEnum[]
  }

  /**
   * UsageRecord findFirstOrThrow
   */
  export type UsageRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter, which UsageRecord to fetch.
     */
    where?: UsageRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageRecords to fetch.
     */
    orderBy?: UsageRecordOrderByWithRelationInput | UsageRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UsageRecords.
     */
    cursor?: UsageRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UsageRecords.
     */
    distinct?: UsageRecordScalarFieldEnum | UsageRecordScalarFieldEnum[]
  }

  /**
   * UsageRecord findMany
   */
  export type UsageRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter, which UsageRecords to fetch.
     */
    where?: UsageRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UsageRecords to fetch.
     */
    orderBy?: UsageRecordOrderByWithRelationInput | UsageRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UsageRecords.
     */
    cursor?: UsageRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UsageRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UsageRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UsageRecords.
     */
    distinct?: UsageRecordScalarFieldEnum | UsageRecordScalarFieldEnum[]
  }

  /**
   * UsageRecord create
   */
  export type UsageRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * The data needed to create a UsageRecord.
     */
    data: XOR<UsageRecordCreateInput, UsageRecordUncheckedCreateInput>
  }

  /**
   * UsageRecord createMany
   */
  export type UsageRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UsageRecords.
     */
    data: UsageRecordCreateManyInput | UsageRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UsageRecord createManyAndReturn
   */
  export type UsageRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * The data used to create many UsageRecords.
     */
    data: UsageRecordCreateManyInput | UsageRecordCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UsageRecord update
   */
  export type UsageRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * The data needed to update a UsageRecord.
     */
    data: XOR<UsageRecordUpdateInput, UsageRecordUncheckedUpdateInput>
    /**
     * Choose, which UsageRecord to update.
     */
    where: UsageRecordWhereUniqueInput
  }

  /**
   * UsageRecord updateMany
   */
  export type UsageRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UsageRecords.
     */
    data: XOR<UsageRecordUpdateManyMutationInput, UsageRecordUncheckedUpdateManyInput>
    /**
     * Filter which UsageRecords to update
     */
    where?: UsageRecordWhereInput
    /**
     * Limit how many UsageRecords to update.
     */
    limit?: number
  }

  /**
   * UsageRecord updateManyAndReturn
   */
  export type UsageRecordUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * The data used to update UsageRecords.
     */
    data: XOR<UsageRecordUpdateManyMutationInput, UsageRecordUncheckedUpdateManyInput>
    /**
     * Filter which UsageRecords to update
     */
    where?: UsageRecordWhereInput
    /**
     * Limit how many UsageRecords to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UsageRecord upsert
   */
  export type UsageRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * The filter to search for the UsageRecord to update in case it exists.
     */
    where: UsageRecordWhereUniqueInput
    /**
     * In case the UsageRecord found by the `where` argument doesn't exist, create a new UsageRecord with this data.
     */
    create: XOR<UsageRecordCreateInput, UsageRecordUncheckedCreateInput>
    /**
     * In case the UsageRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UsageRecordUpdateInput, UsageRecordUncheckedUpdateInput>
  }

  /**
   * UsageRecord delete
   */
  export type UsageRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
    /**
     * Filter which UsageRecord to delete.
     */
    where: UsageRecordWhereUniqueInput
  }

  /**
   * UsageRecord deleteMany
   */
  export type UsageRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UsageRecords to delete
     */
    where?: UsageRecordWhereInput
    /**
     * Limit how many UsageRecords to delete.
     */
    limit?: number
  }

  /**
   * UsageRecord without action
   */
  export type UsageRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsageRecord
     */
    select?: UsageRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UsageRecord
     */
    omit?: UsageRecordOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsageRecordInclude<ExtArgs> | null
  }


  /**
   * Model GenerationJob
   */

  export type AggregateGenerationJob = {
    _count: GenerationJobCountAggregateOutputType | null
    _avg: GenerationJobAvgAggregateOutputType | null
    _sum: GenerationJobSumAggregateOutputType | null
    _min: GenerationJobMinAggregateOutputType | null
    _max: GenerationJobMaxAggregateOutputType | null
  }

  export type GenerationJobAvgAggregateOutputType = {
    count: number | null
  }

  export type GenerationJobSumAggregateOutputType = {
    count: number | null
  }

  export type GenerationJobMinAggregateOutputType = {
    id: string | null
    userId: string | null
    requestKey: string | null
    kind: string | null
    count: number | null
    status: string | null
    error: string | null
    quotaRefunded: boolean | null
    startedAt: Date | null
    finishedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GenerationJobMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    requestKey: string | null
    kind: string | null
    count: number | null
    status: string | null
    error: string | null
    quotaRefunded: boolean | null
    startedAt: Date | null
    finishedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GenerationJobCountAggregateOutputType = {
    id: number
    userId: number
    requestKey: number
    kind: number
    count: number
    status: number
    error: number
    metadata: number
    quotaRefunded: number
    startedAt: number
    finishedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type GenerationJobAvgAggregateInputType = {
    count?: true
  }

  export type GenerationJobSumAggregateInputType = {
    count?: true
  }

  export type GenerationJobMinAggregateInputType = {
    id?: true
    userId?: true
    requestKey?: true
    kind?: true
    count?: true
    status?: true
    error?: true
    quotaRefunded?: true
    startedAt?: true
    finishedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GenerationJobMaxAggregateInputType = {
    id?: true
    userId?: true
    requestKey?: true
    kind?: true
    count?: true
    status?: true
    error?: true
    quotaRefunded?: true
    startedAt?: true
    finishedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GenerationJobCountAggregateInputType = {
    id?: true
    userId?: true
    requestKey?: true
    kind?: true
    count?: true
    status?: true
    error?: true
    metadata?: true
    quotaRefunded?: true
    startedAt?: true
    finishedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type GenerationJobAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GenerationJob to aggregate.
     */
    where?: GenerationJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GenerationJobs to fetch.
     */
    orderBy?: GenerationJobOrderByWithRelationInput | GenerationJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GenerationJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GenerationJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GenerationJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GenerationJobs
    **/
    _count?: true | GenerationJobCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GenerationJobAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GenerationJobSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GenerationJobMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GenerationJobMaxAggregateInputType
  }

  export type GetGenerationJobAggregateType<T extends GenerationJobAggregateArgs> = {
        [P in keyof T & keyof AggregateGenerationJob]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGenerationJob[P]>
      : GetScalarType<T[P], AggregateGenerationJob[P]>
  }




  export type GenerationJobGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GenerationJobWhereInput
    orderBy?: GenerationJobOrderByWithAggregationInput | GenerationJobOrderByWithAggregationInput[]
    by: GenerationJobScalarFieldEnum[] | GenerationJobScalarFieldEnum
    having?: GenerationJobScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GenerationJobCountAggregateInputType | true
    _avg?: GenerationJobAvgAggregateInputType
    _sum?: GenerationJobSumAggregateInputType
    _min?: GenerationJobMinAggregateInputType
    _max?: GenerationJobMaxAggregateInputType
  }

  export type GenerationJobGroupByOutputType = {
    id: string
    userId: string
    requestKey: string
    kind: string
    count: number
    status: string
    error: string | null
    metadata: JsonValue | null
    quotaRefunded: boolean
    startedAt: Date
    finishedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: GenerationJobCountAggregateOutputType | null
    _avg: GenerationJobAvgAggregateOutputType | null
    _sum: GenerationJobSumAggregateOutputType | null
    _min: GenerationJobMinAggregateOutputType | null
    _max: GenerationJobMaxAggregateOutputType | null
  }

  type GetGenerationJobGroupByPayload<T extends GenerationJobGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GenerationJobGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GenerationJobGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GenerationJobGroupByOutputType[P]>
            : GetScalarType<T[P], GenerationJobGroupByOutputType[P]>
        }
      >
    >


  export type GenerationJobSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    requestKey?: boolean
    kind?: boolean
    count?: boolean
    status?: boolean
    error?: boolean
    metadata?: boolean
    quotaRefunded?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["generationJob"]>

  export type GenerationJobSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    requestKey?: boolean
    kind?: boolean
    count?: boolean
    status?: boolean
    error?: boolean
    metadata?: boolean
    quotaRefunded?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["generationJob"]>

  export type GenerationJobSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    requestKey?: boolean
    kind?: boolean
    count?: boolean
    status?: boolean
    error?: boolean
    metadata?: boolean
    quotaRefunded?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["generationJob"]>

  export type GenerationJobSelectScalar = {
    id?: boolean
    userId?: boolean
    requestKey?: boolean
    kind?: boolean
    count?: boolean
    status?: boolean
    error?: boolean
    metadata?: boolean
    quotaRefunded?: boolean
    startedAt?: boolean
    finishedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type GenerationJobOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "requestKey" | "kind" | "count" | "status" | "error" | "metadata" | "quotaRefunded" | "startedAt" | "finishedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["generationJob"]>
  export type GenerationJobInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GenerationJobIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GenerationJobIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $GenerationJobPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GenerationJob"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      requestKey: string
      kind: string
      count: number
      status: string
      error: string | null
      metadata: Prisma.JsonValue | null
      quotaRefunded: boolean
      startedAt: Date
      finishedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["generationJob"]>
    composites: {}
  }

  type GenerationJobGetPayload<S extends boolean | null | undefined | GenerationJobDefaultArgs> = $Result.GetResult<Prisma.$GenerationJobPayload, S>

  type GenerationJobCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GenerationJobFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GenerationJobCountAggregateInputType | true
    }

  export interface GenerationJobDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GenerationJob'], meta: { name: 'GenerationJob' } }
    /**
     * Find zero or one GenerationJob that matches the filter.
     * @param {GenerationJobFindUniqueArgs} args - Arguments to find a GenerationJob
     * @example
     * // Get one GenerationJob
     * const generationJob = await prisma.generationJob.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GenerationJobFindUniqueArgs>(args: SelectSubset<T, GenerationJobFindUniqueArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GenerationJob that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GenerationJobFindUniqueOrThrowArgs} args - Arguments to find a GenerationJob
     * @example
     * // Get one GenerationJob
     * const generationJob = await prisma.generationJob.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GenerationJobFindUniqueOrThrowArgs>(args: SelectSubset<T, GenerationJobFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GenerationJob that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobFindFirstArgs} args - Arguments to find a GenerationJob
     * @example
     * // Get one GenerationJob
     * const generationJob = await prisma.generationJob.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GenerationJobFindFirstArgs>(args?: SelectSubset<T, GenerationJobFindFirstArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GenerationJob that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobFindFirstOrThrowArgs} args - Arguments to find a GenerationJob
     * @example
     * // Get one GenerationJob
     * const generationJob = await prisma.generationJob.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GenerationJobFindFirstOrThrowArgs>(args?: SelectSubset<T, GenerationJobFindFirstOrThrowArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GenerationJobs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GenerationJobs
     * const generationJobs = await prisma.generationJob.findMany()
     * 
     * // Get first 10 GenerationJobs
     * const generationJobs = await prisma.generationJob.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const generationJobWithIdOnly = await prisma.generationJob.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GenerationJobFindManyArgs>(args?: SelectSubset<T, GenerationJobFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GenerationJob.
     * @param {GenerationJobCreateArgs} args - Arguments to create a GenerationJob.
     * @example
     * // Create one GenerationJob
     * const GenerationJob = await prisma.generationJob.create({
     *   data: {
     *     // ... data to create a GenerationJob
     *   }
     * })
     * 
     */
    create<T extends GenerationJobCreateArgs>(args: SelectSubset<T, GenerationJobCreateArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GenerationJobs.
     * @param {GenerationJobCreateManyArgs} args - Arguments to create many GenerationJobs.
     * @example
     * // Create many GenerationJobs
     * const generationJob = await prisma.generationJob.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GenerationJobCreateManyArgs>(args?: SelectSubset<T, GenerationJobCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GenerationJobs and returns the data saved in the database.
     * @param {GenerationJobCreateManyAndReturnArgs} args - Arguments to create many GenerationJobs.
     * @example
     * // Create many GenerationJobs
     * const generationJob = await prisma.generationJob.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GenerationJobs and only return the `id`
     * const generationJobWithIdOnly = await prisma.generationJob.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GenerationJobCreateManyAndReturnArgs>(args?: SelectSubset<T, GenerationJobCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GenerationJob.
     * @param {GenerationJobDeleteArgs} args - Arguments to delete one GenerationJob.
     * @example
     * // Delete one GenerationJob
     * const GenerationJob = await prisma.generationJob.delete({
     *   where: {
     *     // ... filter to delete one GenerationJob
     *   }
     * })
     * 
     */
    delete<T extends GenerationJobDeleteArgs>(args: SelectSubset<T, GenerationJobDeleteArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GenerationJob.
     * @param {GenerationJobUpdateArgs} args - Arguments to update one GenerationJob.
     * @example
     * // Update one GenerationJob
     * const generationJob = await prisma.generationJob.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GenerationJobUpdateArgs>(args: SelectSubset<T, GenerationJobUpdateArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GenerationJobs.
     * @param {GenerationJobDeleteManyArgs} args - Arguments to filter GenerationJobs to delete.
     * @example
     * // Delete a few GenerationJobs
     * const { count } = await prisma.generationJob.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GenerationJobDeleteManyArgs>(args?: SelectSubset<T, GenerationJobDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GenerationJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GenerationJobs
     * const generationJob = await prisma.generationJob.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GenerationJobUpdateManyArgs>(args: SelectSubset<T, GenerationJobUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GenerationJobs and returns the data updated in the database.
     * @param {GenerationJobUpdateManyAndReturnArgs} args - Arguments to update many GenerationJobs.
     * @example
     * // Update many GenerationJobs
     * const generationJob = await prisma.generationJob.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GenerationJobs and only return the `id`
     * const generationJobWithIdOnly = await prisma.generationJob.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GenerationJobUpdateManyAndReturnArgs>(args: SelectSubset<T, GenerationJobUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GenerationJob.
     * @param {GenerationJobUpsertArgs} args - Arguments to update or create a GenerationJob.
     * @example
     * // Update or create a GenerationJob
     * const generationJob = await prisma.generationJob.upsert({
     *   create: {
     *     // ... data to create a GenerationJob
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GenerationJob we want to update
     *   }
     * })
     */
    upsert<T extends GenerationJobUpsertArgs>(args: SelectSubset<T, GenerationJobUpsertArgs<ExtArgs>>): Prisma__GenerationJobClient<$Result.GetResult<Prisma.$GenerationJobPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GenerationJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobCountArgs} args - Arguments to filter GenerationJobs to count.
     * @example
     * // Count the number of GenerationJobs
     * const count = await prisma.generationJob.count({
     *   where: {
     *     // ... the filter for the GenerationJobs we want to count
     *   }
     * })
    **/
    count<T extends GenerationJobCountArgs>(
      args?: Subset<T, GenerationJobCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GenerationJobCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GenerationJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GenerationJobAggregateArgs>(args: Subset<T, GenerationJobAggregateArgs>): Prisma.PrismaPromise<GetGenerationJobAggregateType<T>>

    /**
     * Group by GenerationJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GenerationJobGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GenerationJobGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GenerationJobGroupByArgs['orderBy'] }
        : { orderBy?: GenerationJobGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GenerationJobGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGenerationJobGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GenerationJob model
   */
  readonly fields: GenerationJobFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GenerationJob.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GenerationJobClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the GenerationJob model
   */
  interface GenerationJobFieldRefs {
    readonly id: FieldRef<"GenerationJob", 'String'>
    readonly userId: FieldRef<"GenerationJob", 'String'>
    readonly requestKey: FieldRef<"GenerationJob", 'String'>
    readonly kind: FieldRef<"GenerationJob", 'String'>
    readonly count: FieldRef<"GenerationJob", 'Int'>
    readonly status: FieldRef<"GenerationJob", 'String'>
    readonly error: FieldRef<"GenerationJob", 'String'>
    readonly metadata: FieldRef<"GenerationJob", 'Json'>
    readonly quotaRefunded: FieldRef<"GenerationJob", 'Boolean'>
    readonly startedAt: FieldRef<"GenerationJob", 'DateTime'>
    readonly finishedAt: FieldRef<"GenerationJob", 'DateTime'>
    readonly createdAt: FieldRef<"GenerationJob", 'DateTime'>
    readonly updatedAt: FieldRef<"GenerationJob", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GenerationJob findUnique
   */
  export type GenerationJobFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter, which GenerationJob to fetch.
     */
    where: GenerationJobWhereUniqueInput
  }

  /**
   * GenerationJob findUniqueOrThrow
   */
  export type GenerationJobFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter, which GenerationJob to fetch.
     */
    where: GenerationJobWhereUniqueInput
  }

  /**
   * GenerationJob findFirst
   */
  export type GenerationJobFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter, which GenerationJob to fetch.
     */
    where?: GenerationJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GenerationJobs to fetch.
     */
    orderBy?: GenerationJobOrderByWithRelationInput | GenerationJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GenerationJobs.
     */
    cursor?: GenerationJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GenerationJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GenerationJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GenerationJobs.
     */
    distinct?: GenerationJobScalarFieldEnum | GenerationJobScalarFieldEnum[]
  }

  /**
   * GenerationJob findFirstOrThrow
   */
  export type GenerationJobFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter, which GenerationJob to fetch.
     */
    where?: GenerationJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GenerationJobs to fetch.
     */
    orderBy?: GenerationJobOrderByWithRelationInput | GenerationJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GenerationJobs.
     */
    cursor?: GenerationJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GenerationJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GenerationJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GenerationJobs.
     */
    distinct?: GenerationJobScalarFieldEnum | GenerationJobScalarFieldEnum[]
  }

  /**
   * GenerationJob findMany
   */
  export type GenerationJobFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter, which GenerationJobs to fetch.
     */
    where?: GenerationJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GenerationJobs to fetch.
     */
    orderBy?: GenerationJobOrderByWithRelationInput | GenerationJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GenerationJobs.
     */
    cursor?: GenerationJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GenerationJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GenerationJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GenerationJobs.
     */
    distinct?: GenerationJobScalarFieldEnum | GenerationJobScalarFieldEnum[]
  }

  /**
   * GenerationJob create
   */
  export type GenerationJobCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * The data needed to create a GenerationJob.
     */
    data: XOR<GenerationJobCreateInput, GenerationJobUncheckedCreateInput>
  }

  /**
   * GenerationJob createMany
   */
  export type GenerationJobCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GenerationJobs.
     */
    data: GenerationJobCreateManyInput | GenerationJobCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GenerationJob createManyAndReturn
   */
  export type GenerationJobCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * The data used to create many GenerationJobs.
     */
    data: GenerationJobCreateManyInput | GenerationJobCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GenerationJob update
   */
  export type GenerationJobUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * The data needed to update a GenerationJob.
     */
    data: XOR<GenerationJobUpdateInput, GenerationJobUncheckedUpdateInput>
    /**
     * Choose, which GenerationJob to update.
     */
    where: GenerationJobWhereUniqueInput
  }

  /**
   * GenerationJob updateMany
   */
  export type GenerationJobUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GenerationJobs.
     */
    data: XOR<GenerationJobUpdateManyMutationInput, GenerationJobUncheckedUpdateManyInput>
    /**
     * Filter which GenerationJobs to update
     */
    where?: GenerationJobWhereInput
    /**
     * Limit how many GenerationJobs to update.
     */
    limit?: number
  }

  /**
   * GenerationJob updateManyAndReturn
   */
  export type GenerationJobUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * The data used to update GenerationJobs.
     */
    data: XOR<GenerationJobUpdateManyMutationInput, GenerationJobUncheckedUpdateManyInput>
    /**
     * Filter which GenerationJobs to update
     */
    where?: GenerationJobWhereInput
    /**
     * Limit how many GenerationJobs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GenerationJob upsert
   */
  export type GenerationJobUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * The filter to search for the GenerationJob to update in case it exists.
     */
    where: GenerationJobWhereUniqueInput
    /**
     * In case the GenerationJob found by the `where` argument doesn't exist, create a new GenerationJob with this data.
     */
    create: XOR<GenerationJobCreateInput, GenerationJobUncheckedCreateInput>
    /**
     * In case the GenerationJob was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GenerationJobUpdateInput, GenerationJobUncheckedUpdateInput>
  }

  /**
   * GenerationJob delete
   */
  export type GenerationJobDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
    /**
     * Filter which GenerationJob to delete.
     */
    where: GenerationJobWhereUniqueInput
  }

  /**
   * GenerationJob deleteMany
   */
  export type GenerationJobDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GenerationJobs to delete
     */
    where?: GenerationJobWhereInput
    /**
     * Limit how many GenerationJobs to delete.
     */
    limit?: number
  }

  /**
   * GenerationJob without action
   */
  export type GenerationJobDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GenerationJob
     */
    select?: GenerationJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GenerationJob
     */
    omit?: GenerationJobOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GenerationJobInclude<ExtArgs> | null
  }


  /**
   * Model Order
   */

  export type AggregateOrder = {
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  export type OrderAvgAggregateOutputType = {
    amount: number | null
  }

  export type OrderSumAggregateOutputType = {
    amount: number | null
  }

  export type OrderMinAggregateOutputType = {
    id: string | null
    orderNo: string | null
    userId: string | null
    planId: string | null
    amount: number | null
    currency: string | null
    status: string | null
    provider: string | null
    billingCycle: string | null
    providerOrderNo: string | null
    paidAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrderMaxAggregateOutputType = {
    id: string | null
    orderNo: string | null
    userId: string | null
    planId: string | null
    amount: number | null
    currency: string | null
    status: string | null
    provider: string | null
    billingCycle: string | null
    providerOrderNo: string | null
    paidAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrderCountAggregateOutputType = {
    id: number
    orderNo: number
    userId: number
    planId: number
    amount: number
    currency: number
    status: number
    provider: number
    billingCycle: number
    providerOrderNo: number
    paidAt: number
    metadata: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OrderAvgAggregateInputType = {
    amount?: true
  }

  export type OrderSumAggregateInputType = {
    amount?: true
  }

  export type OrderMinAggregateInputType = {
    id?: true
    orderNo?: true
    userId?: true
    planId?: true
    amount?: true
    currency?: true
    status?: true
    provider?: true
    billingCycle?: true
    providerOrderNo?: true
    paidAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrderMaxAggregateInputType = {
    id?: true
    orderNo?: true
    userId?: true
    planId?: true
    amount?: true
    currency?: true
    status?: true
    provider?: true
    billingCycle?: true
    providerOrderNo?: true
    paidAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrderCountAggregateInputType = {
    id?: true
    orderNo?: true
    userId?: true
    planId?: true
    amount?: true
    currency?: true
    status?: true
    provider?: true
    billingCycle?: true
    providerOrderNo?: true
    paidAt?: true
    metadata?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OrderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Order to aggregate.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Orders
    **/
    _count?: true | OrderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrderAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrderSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrderMaxAggregateInputType
  }

  export type GetOrderAggregateType<T extends OrderAggregateArgs> = {
        [P in keyof T & keyof AggregateOrder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrder[P]>
      : GetScalarType<T[P], AggregateOrder[P]>
  }




  export type OrderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrderWhereInput
    orderBy?: OrderOrderByWithAggregationInput | OrderOrderByWithAggregationInput[]
    by: OrderScalarFieldEnum[] | OrderScalarFieldEnum
    having?: OrderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrderCountAggregateInputType | true
    _avg?: OrderAvgAggregateInputType
    _sum?: OrderSumAggregateInputType
    _min?: OrderMinAggregateInputType
    _max?: OrderMaxAggregateInputType
  }

  export type OrderGroupByOutputType = {
    id: string
    orderNo: string
    userId: string
    planId: string
    amount: number
    currency: string
    status: string
    provider: string
    billingCycle: string
    providerOrderNo: string | null
    paidAt: Date | null
    metadata: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: OrderCountAggregateOutputType | null
    _avg: OrderAvgAggregateOutputType | null
    _sum: OrderSumAggregateOutputType | null
    _min: OrderMinAggregateOutputType | null
    _max: OrderMaxAggregateOutputType | null
  }

  type GetOrderGroupByPayload<T extends OrderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrderGroupByOutputType[P]>
            : GetScalarType<T[P], OrderGroupByOutputType[P]>
        }
      >
    >


  export type OrderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderNo?: boolean
    userId?: boolean
    planId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    provider?: boolean
    billingCycle?: boolean
    providerOrderNo?: boolean
    paidAt?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
    paymentEvents?: boolean | Order$paymentEventsArgs<ExtArgs>
    _count?: boolean | OrderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderNo?: boolean
    userId?: boolean
    planId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    provider?: boolean
    billingCycle?: boolean
    providerOrderNo?: boolean
    paidAt?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderNo?: boolean
    userId?: boolean
    planId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    provider?: boolean
    billingCycle?: boolean
    providerOrderNo?: boolean
    paidAt?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["order"]>

  export type OrderSelectScalar = {
    id?: boolean
    orderNo?: boolean
    userId?: boolean
    planId?: boolean
    amount?: boolean
    currency?: boolean
    status?: boolean
    provider?: boolean
    billingCycle?: boolean
    providerOrderNo?: boolean
    paidAt?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OrderOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "orderNo" | "userId" | "planId" | "amount" | "currency" | "status" | "provider" | "billingCycle" | "providerOrderNo" | "paidAt" | "metadata" | "createdAt" | "updatedAt", ExtArgs["result"]["order"]>
  export type OrderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
    paymentEvents?: boolean | Order$paymentEventsArgs<ExtArgs>
    _count?: boolean | OrderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type OrderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }
  export type OrderIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    plan?: boolean | PlanDefaultArgs<ExtArgs>
  }

  export type $OrderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Order"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      plan: Prisma.$PlanPayload<ExtArgs>
      paymentEvents: Prisma.$PaymentEventPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      orderNo: string
      userId: string
      planId: string
      amount: number
      currency: string
      status: string
      provider: string
      billingCycle: string
      providerOrderNo: string | null
      paidAt: Date | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["order"]>
    composites: {}
  }

  type OrderGetPayload<S extends boolean | null | undefined | OrderDefaultArgs> = $Result.GetResult<Prisma.$OrderPayload, S>

  type OrderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OrderFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OrderCountAggregateInputType | true
    }

  export interface OrderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Order'], meta: { name: 'Order' } }
    /**
     * Find zero or one Order that matches the filter.
     * @param {OrderFindUniqueArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OrderFindUniqueArgs>(args: SelectSubset<T, OrderFindUniqueArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Order that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OrderFindUniqueOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OrderFindUniqueOrThrowArgs>(args: SelectSubset<T, OrderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Order that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OrderFindFirstArgs>(args?: SelectSubset<T, OrderFindFirstArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Order that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindFirstOrThrowArgs} args - Arguments to find a Order
     * @example
     * // Get one Order
     * const order = await prisma.order.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OrderFindFirstOrThrowArgs>(args?: SelectSubset<T, OrderFindFirstOrThrowArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Orders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Orders
     * const orders = await prisma.order.findMany()
     * 
     * // Get first 10 Orders
     * const orders = await prisma.order.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const orderWithIdOnly = await prisma.order.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OrderFindManyArgs>(args?: SelectSubset<T, OrderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Order.
     * @param {OrderCreateArgs} args - Arguments to create a Order.
     * @example
     * // Create one Order
     * const Order = await prisma.order.create({
     *   data: {
     *     // ... data to create a Order
     *   }
     * })
     * 
     */
    create<T extends OrderCreateArgs>(args: SelectSubset<T, OrderCreateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Orders.
     * @param {OrderCreateManyArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OrderCreateManyArgs>(args?: SelectSubset<T, OrderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Orders and returns the data saved in the database.
     * @param {OrderCreateManyAndReturnArgs} args - Arguments to create many Orders.
     * @example
     * // Create many Orders
     * const order = await prisma.order.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Orders and only return the `id`
     * const orderWithIdOnly = await prisma.order.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OrderCreateManyAndReturnArgs>(args?: SelectSubset<T, OrderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Order.
     * @param {OrderDeleteArgs} args - Arguments to delete one Order.
     * @example
     * // Delete one Order
     * const Order = await prisma.order.delete({
     *   where: {
     *     // ... filter to delete one Order
     *   }
     * })
     * 
     */
    delete<T extends OrderDeleteArgs>(args: SelectSubset<T, OrderDeleteArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Order.
     * @param {OrderUpdateArgs} args - Arguments to update one Order.
     * @example
     * // Update one Order
     * const order = await prisma.order.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OrderUpdateArgs>(args: SelectSubset<T, OrderUpdateArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Orders.
     * @param {OrderDeleteManyArgs} args - Arguments to filter Orders to delete.
     * @example
     * // Delete a few Orders
     * const { count } = await prisma.order.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OrderDeleteManyArgs>(args?: SelectSubset<T, OrderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Orders
     * const order = await prisma.order.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OrderUpdateManyArgs>(args: SelectSubset<T, OrderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Orders and returns the data updated in the database.
     * @param {OrderUpdateManyAndReturnArgs} args - Arguments to update many Orders.
     * @example
     * // Update many Orders
     * const order = await prisma.order.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Orders and only return the `id`
     * const orderWithIdOnly = await prisma.order.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OrderUpdateManyAndReturnArgs>(args: SelectSubset<T, OrderUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Order.
     * @param {OrderUpsertArgs} args - Arguments to update or create a Order.
     * @example
     * // Update or create a Order
     * const order = await prisma.order.upsert({
     *   create: {
     *     // ... data to create a Order
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Order we want to update
     *   }
     * })
     */
    upsert<T extends OrderUpsertArgs>(args: SelectSubset<T, OrderUpsertArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Orders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderCountArgs} args - Arguments to filter Orders to count.
     * @example
     * // Count the number of Orders
     * const count = await prisma.order.count({
     *   where: {
     *     // ... the filter for the Orders we want to count
     *   }
     * })
    **/
    count<T extends OrderCountArgs>(
      args?: Subset<T, OrderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrderAggregateArgs>(args: Subset<T, OrderAggregateArgs>): Prisma.PrismaPromise<GetOrderAggregateType<T>>

    /**
     * Group by Order.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrderGroupByArgs['orderBy'] }
        : { orderBy?: OrderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Order model
   */
  readonly fields: OrderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Order.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    plan<T extends PlanDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlanDefaultArgs<ExtArgs>>): Prisma__PlanClient<$Result.GetResult<Prisma.$PlanPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    paymentEvents<T extends Order$paymentEventsArgs<ExtArgs> = {}>(args?: Subset<T, Order$paymentEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Order model
   */
  interface OrderFieldRefs {
    readonly id: FieldRef<"Order", 'String'>
    readonly orderNo: FieldRef<"Order", 'String'>
    readonly userId: FieldRef<"Order", 'String'>
    readonly planId: FieldRef<"Order", 'String'>
    readonly amount: FieldRef<"Order", 'Int'>
    readonly currency: FieldRef<"Order", 'String'>
    readonly status: FieldRef<"Order", 'String'>
    readonly provider: FieldRef<"Order", 'String'>
    readonly billingCycle: FieldRef<"Order", 'String'>
    readonly providerOrderNo: FieldRef<"Order", 'String'>
    readonly paidAt: FieldRef<"Order", 'DateTime'>
    readonly metadata: FieldRef<"Order", 'Json'>
    readonly createdAt: FieldRef<"Order", 'DateTime'>
    readonly updatedAt: FieldRef<"Order", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Order findUnique
   */
  export type OrderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findUniqueOrThrow
   */
  export type OrderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order findFirst
   */
  export type OrderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findFirstOrThrow
   */
  export type OrderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Order to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order findMany
   */
  export type OrderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter, which Orders to fetch.
     */
    where?: OrderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Orders to fetch.
     */
    orderBy?: OrderOrderByWithRelationInput | OrderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Orders.
     */
    cursor?: OrderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Orders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Orders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Orders.
     */
    distinct?: OrderScalarFieldEnum | OrderScalarFieldEnum[]
  }

  /**
   * Order create
   */
  export type OrderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to create a Order.
     */
    data: XOR<OrderCreateInput, OrderUncheckedCreateInput>
  }

  /**
   * Order createMany
   */
  export type OrderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Order createManyAndReturn
   */
  export type OrderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * The data used to create many Orders.
     */
    data: OrderCreateManyInput | OrderCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Order update
   */
  export type OrderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The data needed to update a Order.
     */
    data: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
    /**
     * Choose, which Order to update.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order updateMany
   */
  export type OrderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Orders.
     */
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyInput>
    /**
     * Filter which Orders to update
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to update.
     */
    limit?: number
  }

  /**
   * Order updateManyAndReturn
   */
  export type OrderUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * The data used to update Orders.
     */
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyInput>
    /**
     * Filter which Orders to update
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Order upsert
   */
  export type OrderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * The filter to search for the Order to update in case it exists.
     */
    where: OrderWhereUniqueInput
    /**
     * In case the Order found by the `where` argument doesn't exist, create a new Order with this data.
     */
    create: XOR<OrderCreateInput, OrderUncheckedCreateInput>
    /**
     * In case the Order was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrderUpdateInput, OrderUncheckedUpdateInput>
  }

  /**
   * Order delete
   */
  export type OrderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
    /**
     * Filter which Order to delete.
     */
    where: OrderWhereUniqueInput
  }

  /**
   * Order deleteMany
   */
  export type OrderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Orders to delete
     */
    where?: OrderWhereInput
    /**
     * Limit how many Orders to delete.
     */
    limit?: number
  }

  /**
   * Order.paymentEvents
   */
  export type Order$paymentEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    where?: PaymentEventWhereInput
    orderBy?: PaymentEventOrderByWithRelationInput | PaymentEventOrderByWithRelationInput[]
    cursor?: PaymentEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PaymentEventScalarFieldEnum | PaymentEventScalarFieldEnum[]
  }

  /**
   * Order without action
   */
  export type OrderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Order
     */
    select?: OrderSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Order
     */
    omit?: OrderOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OrderInclude<ExtArgs> | null
  }


  /**
   * Model PaymentEvent
   */

  export type AggregatePaymentEvent = {
    _count: PaymentEventCountAggregateOutputType | null
    _min: PaymentEventMinAggregateOutputType | null
    _max: PaymentEventMaxAggregateOutputType | null
  }

  export type PaymentEventMinAggregateOutputType = {
    id: string | null
    orderId: string | null
    provider: string | null
    eventType: string | null
    providerEventId: string | null
    createdAt: Date | null
  }

  export type PaymentEventMaxAggregateOutputType = {
    id: string | null
    orderId: string | null
    provider: string | null
    eventType: string | null
    providerEventId: string | null
    createdAt: Date | null
  }

  export type PaymentEventCountAggregateOutputType = {
    id: number
    orderId: number
    provider: number
    eventType: number
    providerEventId: number
    payload: number
    createdAt: number
    _all: number
  }


  export type PaymentEventMinAggregateInputType = {
    id?: true
    orderId?: true
    provider?: true
    eventType?: true
    providerEventId?: true
    createdAt?: true
  }

  export type PaymentEventMaxAggregateInputType = {
    id?: true
    orderId?: true
    provider?: true
    eventType?: true
    providerEventId?: true
    createdAt?: true
  }

  export type PaymentEventCountAggregateInputType = {
    id?: true
    orderId?: true
    provider?: true
    eventType?: true
    providerEventId?: true
    payload?: true
    createdAt?: true
    _all?: true
  }

  export type PaymentEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentEvent to aggregate.
     */
    where?: PaymentEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentEvents to fetch.
     */
    orderBy?: PaymentEventOrderByWithRelationInput | PaymentEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PaymentEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PaymentEvents
    **/
    _count?: true | PaymentEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PaymentEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PaymentEventMaxAggregateInputType
  }

  export type GetPaymentEventAggregateType<T extends PaymentEventAggregateArgs> = {
        [P in keyof T & keyof AggregatePaymentEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePaymentEvent[P]>
      : GetScalarType<T[P], AggregatePaymentEvent[P]>
  }




  export type PaymentEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentEventWhereInput
    orderBy?: PaymentEventOrderByWithAggregationInput | PaymentEventOrderByWithAggregationInput[]
    by: PaymentEventScalarFieldEnum[] | PaymentEventScalarFieldEnum
    having?: PaymentEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PaymentEventCountAggregateInputType | true
    _min?: PaymentEventMinAggregateInputType
    _max?: PaymentEventMaxAggregateInputType
  }

  export type PaymentEventGroupByOutputType = {
    id: string
    orderId: string
    provider: string
    eventType: string
    providerEventId: string | null
    payload: JsonValue | null
    createdAt: Date
    _count: PaymentEventCountAggregateOutputType | null
    _min: PaymentEventMinAggregateOutputType | null
    _max: PaymentEventMaxAggregateOutputType | null
  }

  type GetPaymentEventGroupByPayload<T extends PaymentEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PaymentEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PaymentEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PaymentEventGroupByOutputType[P]>
            : GetScalarType<T[P], PaymentEventGroupByOutputType[P]>
        }
      >
    >


  export type PaymentEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderId?: boolean
    provider?: boolean
    eventType?: boolean
    providerEventId?: boolean
    payload?: boolean
    createdAt?: boolean
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentEvent"]>

  export type PaymentEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderId?: boolean
    provider?: boolean
    eventType?: boolean
    providerEventId?: boolean
    payload?: boolean
    createdAt?: boolean
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentEvent"]>

  export type PaymentEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    orderId?: boolean
    provider?: boolean
    eventType?: boolean
    providerEventId?: boolean
    payload?: boolean
    createdAt?: boolean
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentEvent"]>

  export type PaymentEventSelectScalar = {
    id?: boolean
    orderId?: boolean
    provider?: boolean
    eventType?: boolean
    providerEventId?: boolean
    payload?: boolean
    createdAt?: boolean
  }

  export type PaymentEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "orderId" | "provider" | "eventType" | "providerEventId" | "payload" | "createdAt", ExtArgs["result"]["paymentEvent"]>
  export type PaymentEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }
  export type PaymentEventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }
  export type PaymentEventIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    order?: boolean | OrderDefaultArgs<ExtArgs>
  }

  export type $PaymentEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PaymentEvent"
    objects: {
      order: Prisma.$OrderPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      orderId: string
      provider: string
      eventType: string
      providerEventId: string | null
      payload: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["paymentEvent"]>
    composites: {}
  }

  type PaymentEventGetPayload<S extends boolean | null | undefined | PaymentEventDefaultArgs> = $Result.GetResult<Prisma.$PaymentEventPayload, S>

  type PaymentEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PaymentEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PaymentEventCountAggregateInputType | true
    }

  export interface PaymentEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PaymentEvent'], meta: { name: 'PaymentEvent' } }
    /**
     * Find zero or one PaymentEvent that matches the filter.
     * @param {PaymentEventFindUniqueArgs} args - Arguments to find a PaymentEvent
     * @example
     * // Get one PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PaymentEventFindUniqueArgs>(args: SelectSubset<T, PaymentEventFindUniqueArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PaymentEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PaymentEventFindUniqueOrThrowArgs} args - Arguments to find a PaymentEvent
     * @example
     * // Get one PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PaymentEventFindUniqueOrThrowArgs>(args: SelectSubset<T, PaymentEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaymentEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventFindFirstArgs} args - Arguments to find a PaymentEvent
     * @example
     * // Get one PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PaymentEventFindFirstArgs>(args?: SelectSubset<T, PaymentEventFindFirstArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PaymentEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventFindFirstOrThrowArgs} args - Arguments to find a PaymentEvent
     * @example
     * // Get one PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PaymentEventFindFirstOrThrowArgs>(args?: SelectSubset<T, PaymentEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PaymentEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PaymentEvents
     * const paymentEvents = await prisma.paymentEvent.findMany()
     * 
     * // Get first 10 PaymentEvents
     * const paymentEvents = await prisma.paymentEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const paymentEventWithIdOnly = await prisma.paymentEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PaymentEventFindManyArgs>(args?: SelectSubset<T, PaymentEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PaymentEvent.
     * @param {PaymentEventCreateArgs} args - Arguments to create a PaymentEvent.
     * @example
     * // Create one PaymentEvent
     * const PaymentEvent = await prisma.paymentEvent.create({
     *   data: {
     *     // ... data to create a PaymentEvent
     *   }
     * })
     * 
     */
    create<T extends PaymentEventCreateArgs>(args: SelectSubset<T, PaymentEventCreateArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PaymentEvents.
     * @param {PaymentEventCreateManyArgs} args - Arguments to create many PaymentEvents.
     * @example
     * // Create many PaymentEvents
     * const paymentEvent = await prisma.paymentEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PaymentEventCreateManyArgs>(args?: SelectSubset<T, PaymentEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PaymentEvents and returns the data saved in the database.
     * @param {PaymentEventCreateManyAndReturnArgs} args - Arguments to create many PaymentEvents.
     * @example
     * // Create many PaymentEvents
     * const paymentEvent = await prisma.paymentEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PaymentEvents and only return the `id`
     * const paymentEventWithIdOnly = await prisma.paymentEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PaymentEventCreateManyAndReturnArgs>(args?: SelectSubset<T, PaymentEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PaymentEvent.
     * @param {PaymentEventDeleteArgs} args - Arguments to delete one PaymentEvent.
     * @example
     * // Delete one PaymentEvent
     * const PaymentEvent = await prisma.paymentEvent.delete({
     *   where: {
     *     // ... filter to delete one PaymentEvent
     *   }
     * })
     * 
     */
    delete<T extends PaymentEventDeleteArgs>(args: SelectSubset<T, PaymentEventDeleteArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PaymentEvent.
     * @param {PaymentEventUpdateArgs} args - Arguments to update one PaymentEvent.
     * @example
     * // Update one PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PaymentEventUpdateArgs>(args: SelectSubset<T, PaymentEventUpdateArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PaymentEvents.
     * @param {PaymentEventDeleteManyArgs} args - Arguments to filter PaymentEvents to delete.
     * @example
     * // Delete a few PaymentEvents
     * const { count } = await prisma.paymentEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PaymentEventDeleteManyArgs>(args?: SelectSubset<T, PaymentEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaymentEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PaymentEvents
     * const paymentEvent = await prisma.paymentEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PaymentEventUpdateManyArgs>(args: SelectSubset<T, PaymentEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaymentEvents and returns the data updated in the database.
     * @param {PaymentEventUpdateManyAndReturnArgs} args - Arguments to update many PaymentEvents.
     * @example
     * // Update many PaymentEvents
     * const paymentEvent = await prisma.paymentEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PaymentEvents and only return the `id`
     * const paymentEventWithIdOnly = await prisma.paymentEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PaymentEventUpdateManyAndReturnArgs>(args: SelectSubset<T, PaymentEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PaymentEvent.
     * @param {PaymentEventUpsertArgs} args - Arguments to update or create a PaymentEvent.
     * @example
     * // Update or create a PaymentEvent
     * const paymentEvent = await prisma.paymentEvent.upsert({
     *   create: {
     *     // ... data to create a PaymentEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PaymentEvent we want to update
     *   }
     * })
     */
    upsert<T extends PaymentEventUpsertArgs>(args: SelectSubset<T, PaymentEventUpsertArgs<ExtArgs>>): Prisma__PaymentEventClient<$Result.GetResult<Prisma.$PaymentEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PaymentEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventCountArgs} args - Arguments to filter PaymentEvents to count.
     * @example
     * // Count the number of PaymentEvents
     * const count = await prisma.paymentEvent.count({
     *   where: {
     *     // ... the filter for the PaymentEvents we want to count
     *   }
     * })
    **/
    count<T extends PaymentEventCountArgs>(
      args?: Subset<T, PaymentEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PaymentEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PaymentEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PaymentEventAggregateArgs>(args: Subset<T, PaymentEventAggregateArgs>): Prisma.PrismaPromise<GetPaymentEventAggregateType<T>>

    /**
     * Group by PaymentEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PaymentEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PaymentEventGroupByArgs['orderBy'] }
        : { orderBy?: PaymentEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PaymentEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPaymentEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PaymentEvent model
   */
  readonly fields: PaymentEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PaymentEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PaymentEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    order<T extends OrderDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrderDefaultArgs<ExtArgs>>): Prisma__OrderClient<$Result.GetResult<Prisma.$OrderPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PaymentEvent model
   */
  interface PaymentEventFieldRefs {
    readonly id: FieldRef<"PaymentEvent", 'String'>
    readonly orderId: FieldRef<"PaymentEvent", 'String'>
    readonly provider: FieldRef<"PaymentEvent", 'String'>
    readonly eventType: FieldRef<"PaymentEvent", 'String'>
    readonly providerEventId: FieldRef<"PaymentEvent", 'String'>
    readonly payload: FieldRef<"PaymentEvent", 'Json'>
    readonly createdAt: FieldRef<"PaymentEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PaymentEvent findUnique
   */
  export type PaymentEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter, which PaymentEvent to fetch.
     */
    where: PaymentEventWhereUniqueInput
  }

  /**
   * PaymentEvent findUniqueOrThrow
   */
  export type PaymentEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter, which PaymentEvent to fetch.
     */
    where: PaymentEventWhereUniqueInput
  }

  /**
   * PaymentEvent findFirst
   */
  export type PaymentEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter, which PaymentEvent to fetch.
     */
    where?: PaymentEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentEvents to fetch.
     */
    orderBy?: PaymentEventOrderByWithRelationInput | PaymentEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentEvents.
     */
    cursor?: PaymentEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentEvents.
     */
    distinct?: PaymentEventScalarFieldEnum | PaymentEventScalarFieldEnum[]
  }

  /**
   * PaymentEvent findFirstOrThrow
   */
  export type PaymentEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter, which PaymentEvent to fetch.
     */
    where?: PaymentEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentEvents to fetch.
     */
    orderBy?: PaymentEventOrderByWithRelationInput | PaymentEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentEvents.
     */
    cursor?: PaymentEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentEvents.
     */
    distinct?: PaymentEventScalarFieldEnum | PaymentEventScalarFieldEnum[]
  }

  /**
   * PaymentEvent findMany
   */
  export type PaymentEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter, which PaymentEvents to fetch.
     */
    where?: PaymentEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentEvents to fetch.
     */
    orderBy?: PaymentEventOrderByWithRelationInput | PaymentEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PaymentEvents.
     */
    cursor?: PaymentEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentEvents.
     */
    distinct?: PaymentEventScalarFieldEnum | PaymentEventScalarFieldEnum[]
  }

  /**
   * PaymentEvent create
   */
  export type PaymentEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * The data needed to create a PaymentEvent.
     */
    data: XOR<PaymentEventCreateInput, PaymentEventUncheckedCreateInput>
  }

  /**
   * PaymentEvent createMany
   */
  export type PaymentEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PaymentEvents.
     */
    data: PaymentEventCreateManyInput | PaymentEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PaymentEvent createManyAndReturn
   */
  export type PaymentEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * The data used to create many PaymentEvents.
     */
    data: PaymentEventCreateManyInput | PaymentEventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaymentEvent update
   */
  export type PaymentEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * The data needed to update a PaymentEvent.
     */
    data: XOR<PaymentEventUpdateInput, PaymentEventUncheckedUpdateInput>
    /**
     * Choose, which PaymentEvent to update.
     */
    where: PaymentEventWhereUniqueInput
  }

  /**
   * PaymentEvent updateMany
   */
  export type PaymentEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PaymentEvents.
     */
    data: XOR<PaymentEventUpdateManyMutationInput, PaymentEventUncheckedUpdateManyInput>
    /**
     * Filter which PaymentEvents to update
     */
    where?: PaymentEventWhereInput
    /**
     * Limit how many PaymentEvents to update.
     */
    limit?: number
  }

  /**
   * PaymentEvent updateManyAndReturn
   */
  export type PaymentEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * The data used to update PaymentEvents.
     */
    data: XOR<PaymentEventUpdateManyMutationInput, PaymentEventUncheckedUpdateManyInput>
    /**
     * Filter which PaymentEvents to update
     */
    where?: PaymentEventWhereInput
    /**
     * Limit how many PaymentEvents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaymentEvent upsert
   */
  export type PaymentEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * The filter to search for the PaymentEvent to update in case it exists.
     */
    where: PaymentEventWhereUniqueInput
    /**
     * In case the PaymentEvent found by the `where` argument doesn't exist, create a new PaymentEvent with this data.
     */
    create: XOR<PaymentEventCreateInput, PaymentEventUncheckedCreateInput>
    /**
     * In case the PaymentEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PaymentEventUpdateInput, PaymentEventUncheckedUpdateInput>
  }

  /**
   * PaymentEvent delete
   */
  export type PaymentEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
    /**
     * Filter which PaymentEvent to delete.
     */
    where: PaymentEventWhereUniqueInput
  }

  /**
   * PaymentEvent deleteMany
   */
  export type PaymentEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentEvents to delete
     */
    where?: PaymentEventWhereInput
    /**
     * Limit how many PaymentEvents to delete.
     */
    limit?: number
  }

  /**
   * PaymentEvent without action
   */
  export type PaymentEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentEvent
     */
    select?: PaymentEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PaymentEvent
     */
    omit?: PaymentEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentEventInclude<ExtArgs> | null
  }


  /**
   * Model AdminAuditLog
   */

  export type AggregateAdminAuditLog = {
    _count: AdminAuditLogCountAggregateOutputType | null
    _min: AdminAuditLogMinAggregateOutputType | null
    _max: AdminAuditLogMaxAggregateOutputType | null
  }

  export type AdminAuditLogMinAggregateOutputType = {
    id: string | null
    actorId: string | null
    action: string | null
    target: string | null
    targetId: string | null
    createdAt: Date | null
  }

  export type AdminAuditLogMaxAggregateOutputType = {
    id: string | null
    actorId: string | null
    action: string | null
    target: string | null
    targetId: string | null
    createdAt: Date | null
  }

  export type AdminAuditLogCountAggregateOutputType = {
    id: number
    actorId: number
    action: number
    target: number
    targetId: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type AdminAuditLogMinAggregateInputType = {
    id?: true
    actorId?: true
    action?: true
    target?: true
    targetId?: true
    createdAt?: true
  }

  export type AdminAuditLogMaxAggregateInputType = {
    id?: true
    actorId?: true
    action?: true
    target?: true
    targetId?: true
    createdAt?: true
  }

  export type AdminAuditLogCountAggregateInputType = {
    id?: true
    actorId?: true
    action?: true
    target?: true
    targetId?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type AdminAuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminAuditLog to aggregate.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AdminAuditLogs
    **/
    _count?: true | AdminAuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminAuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminAuditLogMaxAggregateInputType
  }

  export type GetAdminAuditLogAggregateType<T extends AdminAuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAdminAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdminAuditLog[P]>
      : GetScalarType<T[P], AggregateAdminAuditLog[P]>
  }




  export type AdminAuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AdminAuditLogWhereInput
    orderBy?: AdminAuditLogOrderByWithAggregationInput | AdminAuditLogOrderByWithAggregationInput[]
    by: AdminAuditLogScalarFieldEnum[] | AdminAuditLogScalarFieldEnum
    having?: AdminAuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminAuditLogCountAggregateInputType | true
    _min?: AdminAuditLogMinAggregateInputType
    _max?: AdminAuditLogMaxAggregateInputType
  }

  export type AdminAuditLogGroupByOutputType = {
    id: string
    actorId: string | null
    action: string
    target: string
    targetId: string | null
    metadata: JsonValue | null
    createdAt: Date
    _count: AdminAuditLogCountAggregateOutputType | null
    _min: AdminAuditLogMinAggregateOutputType | null
    _max: AdminAuditLogMaxAggregateOutputType | null
  }

  type GetAdminAuditLogGroupByPayload<T extends AdminAuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminAuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminAuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminAuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AdminAuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AdminAuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    actorId?: boolean
    action?: boolean
    target?: boolean
    targetId?: boolean
    metadata?: boolean
    createdAt?: boolean
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    actorId?: boolean
    action?: boolean
    target?: boolean
    targetId?: boolean
    metadata?: boolean
    createdAt?: boolean
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    actorId?: boolean
    action?: boolean
    target?: boolean
    targetId?: boolean
    metadata?: boolean
    createdAt?: boolean
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }, ExtArgs["result"]["adminAuditLog"]>

  export type AdminAuditLogSelectScalar = {
    id?: boolean
    actorId?: boolean
    action?: boolean
    target?: boolean
    targetId?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type AdminAuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "actorId" | "action" | "target" | "targetId" | "metadata" | "createdAt", ExtArgs["result"]["adminAuditLog"]>
  export type AdminAuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }
  export type AdminAuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }
  export type AdminAuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    actor?: boolean | AdminAuditLog$actorArgs<ExtArgs>
  }

  export type $AdminAuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AdminAuditLog"
    objects: {
      actor: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      actorId: string | null
      action: string
      target: string
      targetId: string | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["adminAuditLog"]>
    composites: {}
  }

  type AdminAuditLogGetPayload<S extends boolean | null | undefined | AdminAuditLogDefaultArgs> = $Result.GetResult<Prisma.$AdminAuditLogPayload, S>

  type AdminAuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AdminAuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AdminAuditLogCountAggregateInputType | true
    }

  export interface AdminAuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AdminAuditLog'], meta: { name: 'AdminAuditLog' } }
    /**
     * Find zero or one AdminAuditLog that matches the filter.
     * @param {AdminAuditLogFindUniqueArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AdminAuditLogFindUniqueArgs>(args: SelectSubset<T, AdminAuditLogFindUniqueArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AdminAuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AdminAuditLogFindUniqueOrThrowArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AdminAuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AdminAuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminAuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindFirstArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AdminAuditLogFindFirstArgs>(args?: SelectSubset<T, AdminAuditLogFindFirstArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AdminAuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindFirstOrThrowArgs} args - Arguments to find a AdminAuditLog
     * @example
     * // Get one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AdminAuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AdminAuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AdminAuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AdminAuditLogs
     * const adminAuditLogs = await prisma.adminAuditLog.findMany()
     * 
     * // Get first 10 AdminAuditLogs
     * const adminAuditLogs = await prisma.adminAuditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AdminAuditLogFindManyArgs>(args?: SelectSubset<T, AdminAuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AdminAuditLog.
     * @param {AdminAuditLogCreateArgs} args - Arguments to create a AdminAuditLog.
     * @example
     * // Create one AdminAuditLog
     * const AdminAuditLog = await prisma.adminAuditLog.create({
     *   data: {
     *     // ... data to create a AdminAuditLog
     *   }
     * })
     * 
     */
    create<T extends AdminAuditLogCreateArgs>(args: SelectSubset<T, AdminAuditLogCreateArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AdminAuditLogs.
     * @param {AdminAuditLogCreateManyArgs} args - Arguments to create many AdminAuditLogs.
     * @example
     * // Create many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AdminAuditLogCreateManyArgs>(args?: SelectSubset<T, AdminAuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AdminAuditLogs and returns the data saved in the database.
     * @param {AdminAuditLogCreateManyAndReturnArgs} args - Arguments to create many AdminAuditLogs.
     * @example
     * // Create many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AdminAuditLogs and only return the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AdminAuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AdminAuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AdminAuditLog.
     * @param {AdminAuditLogDeleteArgs} args - Arguments to delete one AdminAuditLog.
     * @example
     * // Delete one AdminAuditLog
     * const AdminAuditLog = await prisma.adminAuditLog.delete({
     *   where: {
     *     // ... filter to delete one AdminAuditLog
     *   }
     * })
     * 
     */
    delete<T extends AdminAuditLogDeleteArgs>(args: SelectSubset<T, AdminAuditLogDeleteArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AdminAuditLog.
     * @param {AdminAuditLogUpdateArgs} args - Arguments to update one AdminAuditLog.
     * @example
     * // Update one AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AdminAuditLogUpdateArgs>(args: SelectSubset<T, AdminAuditLogUpdateArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AdminAuditLogs.
     * @param {AdminAuditLogDeleteManyArgs} args - Arguments to filter AdminAuditLogs to delete.
     * @example
     * // Delete a few AdminAuditLogs
     * const { count } = await prisma.adminAuditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AdminAuditLogDeleteManyArgs>(args?: SelectSubset<T, AdminAuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminAuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AdminAuditLogUpdateManyArgs>(args: SelectSubset<T, AdminAuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AdminAuditLogs and returns the data updated in the database.
     * @param {AdminAuditLogUpdateManyAndReturnArgs} args - Arguments to update many AdminAuditLogs.
     * @example
     * // Update many AdminAuditLogs
     * const adminAuditLog = await prisma.adminAuditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AdminAuditLogs and only return the `id`
     * const adminAuditLogWithIdOnly = await prisma.adminAuditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AdminAuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AdminAuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AdminAuditLog.
     * @param {AdminAuditLogUpsertArgs} args - Arguments to update or create a AdminAuditLog.
     * @example
     * // Update or create a AdminAuditLog
     * const adminAuditLog = await prisma.adminAuditLog.upsert({
     *   create: {
     *     // ... data to create a AdminAuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AdminAuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AdminAuditLogUpsertArgs>(args: SelectSubset<T, AdminAuditLogUpsertArgs<ExtArgs>>): Prisma__AdminAuditLogClient<$Result.GetResult<Prisma.$AdminAuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AdminAuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogCountArgs} args - Arguments to filter AdminAuditLogs to count.
     * @example
     * // Count the number of AdminAuditLogs
     * const count = await prisma.adminAuditLog.count({
     *   where: {
     *     // ... the filter for the AdminAuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AdminAuditLogCountArgs>(
      args?: Subset<T, AdminAuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminAuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AdminAuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminAuditLogAggregateArgs>(args: Subset<T, AdminAuditLogAggregateArgs>): Prisma.PrismaPromise<GetAdminAuditLogAggregateType<T>>

    /**
     * Group by AdminAuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AdminAuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AdminAuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AdminAuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AdminAuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AdminAuditLog model
   */
  readonly fields: AdminAuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AdminAuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AdminAuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    actor<T extends AdminAuditLog$actorArgs<ExtArgs> = {}>(args?: Subset<T, AdminAuditLog$actorArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AdminAuditLog model
   */
  interface AdminAuditLogFieldRefs {
    readonly id: FieldRef<"AdminAuditLog", 'String'>
    readonly actorId: FieldRef<"AdminAuditLog", 'String'>
    readonly action: FieldRef<"AdminAuditLog", 'String'>
    readonly target: FieldRef<"AdminAuditLog", 'String'>
    readonly targetId: FieldRef<"AdminAuditLog", 'String'>
    readonly metadata: FieldRef<"AdminAuditLog", 'Json'>
    readonly createdAt: FieldRef<"AdminAuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AdminAuditLog findUnique
   */
  export type AdminAuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog findUniqueOrThrow
   */
  export type AdminAuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog findFirst
   */
  export type AdminAuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminAuditLogs.
     */
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog findFirstOrThrow
   */
  export type AdminAuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLog to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminAuditLogs.
     */
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog findMany
   */
  export type AdminAuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AdminAuditLogs to fetch.
     */
    where?: AdminAuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AdminAuditLogs to fetch.
     */
    orderBy?: AdminAuditLogOrderByWithRelationInput | AdminAuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AdminAuditLogs.
     */
    cursor?: AdminAuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AdminAuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AdminAuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AdminAuditLogs.
     */
    distinct?: AdminAuditLogScalarFieldEnum | AdminAuditLogScalarFieldEnum[]
  }

  /**
   * AdminAuditLog create
   */
  export type AdminAuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AdminAuditLog.
     */
    data: XOR<AdminAuditLogCreateInput, AdminAuditLogUncheckedCreateInput>
  }

  /**
   * AdminAuditLog createMany
   */
  export type AdminAuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AdminAuditLogs.
     */
    data: AdminAuditLogCreateManyInput | AdminAuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AdminAuditLog createManyAndReturn
   */
  export type AdminAuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AdminAuditLogs.
     */
    data: AdminAuditLogCreateManyInput | AdminAuditLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminAuditLog update
   */
  export type AdminAuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AdminAuditLog.
     */
    data: XOR<AdminAuditLogUpdateInput, AdminAuditLogUncheckedUpdateInput>
    /**
     * Choose, which AdminAuditLog to update.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog updateMany
   */
  export type AdminAuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AdminAuditLogs.
     */
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AdminAuditLogs to update
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to update.
     */
    limit?: number
  }

  /**
   * AdminAuditLog updateManyAndReturn
   */
  export type AdminAuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AdminAuditLogs.
     */
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AdminAuditLogs to update
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AdminAuditLog upsert
   */
  export type AdminAuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AdminAuditLog to update in case it exists.
     */
    where: AdminAuditLogWhereUniqueInput
    /**
     * In case the AdminAuditLog found by the `where` argument doesn't exist, create a new AdminAuditLog with this data.
     */
    create: XOR<AdminAuditLogCreateInput, AdminAuditLogUncheckedCreateInput>
    /**
     * In case the AdminAuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AdminAuditLogUpdateInput, AdminAuditLogUncheckedUpdateInput>
  }

  /**
   * AdminAuditLog delete
   */
  export type AdminAuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
    /**
     * Filter which AdminAuditLog to delete.
     */
    where: AdminAuditLogWhereUniqueInput
  }

  /**
   * AdminAuditLog deleteMany
   */
  export type AdminAuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AdminAuditLogs to delete
     */
    where?: AdminAuditLogWhereInput
    /**
     * Limit how many AdminAuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AdminAuditLog.actor
   */
  export type AdminAuditLog$actorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AdminAuditLog without action
   */
  export type AdminAuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AdminAuditLog
     */
    select?: AdminAuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AdminAuditLog
     */
    omit?: AdminAuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AdminAuditLogInclude<ExtArgs> | null
  }


  /**
   * Model ModelConfig
   */

  export type AggregateModelConfig = {
    _count: ModelConfigCountAggregateOutputType | null
    _min: ModelConfigMinAggregateOutputType | null
    _max: ModelConfigMaxAggregateOutputType | null
  }

  export type ModelConfigMinAggregateOutputType = {
    id: string | null
    provider: string | null
    model: string | null
    displayName: string | null
    type: string | null
    enabled: boolean | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ModelConfigMaxAggregateOutputType = {
    id: string | null
    provider: string | null
    model: string | null
    displayName: string | null
    type: string | null
    enabled: boolean | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ModelConfigCountAggregateOutputType = {
    id: number
    provider: number
    model: number
    displayName: number
    type: number
    enabled: number
    isDefault: number
    params: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ModelConfigMinAggregateInputType = {
    id?: true
    provider?: true
    model?: true
    displayName?: true
    type?: true
    enabled?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ModelConfigMaxAggregateInputType = {
    id?: true
    provider?: true
    model?: true
    displayName?: true
    type?: true
    enabled?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ModelConfigCountAggregateInputType = {
    id?: true
    provider?: true
    model?: true
    displayName?: true
    type?: true
    enabled?: true
    isDefault?: true
    params?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ModelConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ModelConfig to aggregate.
     */
    where?: ModelConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelConfigs to fetch.
     */
    orderBy?: ModelConfigOrderByWithRelationInput | ModelConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ModelConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ModelConfigs
    **/
    _count?: true | ModelConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ModelConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ModelConfigMaxAggregateInputType
  }

  export type GetModelConfigAggregateType<T extends ModelConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateModelConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateModelConfig[P]>
      : GetScalarType<T[P], AggregateModelConfig[P]>
  }




  export type ModelConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ModelConfigWhereInput
    orderBy?: ModelConfigOrderByWithAggregationInput | ModelConfigOrderByWithAggregationInput[]
    by: ModelConfigScalarFieldEnum[] | ModelConfigScalarFieldEnum
    having?: ModelConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ModelConfigCountAggregateInputType | true
    _min?: ModelConfigMinAggregateInputType
    _max?: ModelConfigMaxAggregateInputType
  }

  export type ModelConfigGroupByOutputType = {
    id: string
    provider: string
    model: string
    displayName: string
    type: string
    enabled: boolean
    isDefault: boolean
    params: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: ModelConfigCountAggregateOutputType | null
    _min: ModelConfigMinAggregateOutputType | null
    _max: ModelConfigMaxAggregateOutputType | null
  }

  type GetModelConfigGroupByPayload<T extends ModelConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ModelConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ModelConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ModelConfigGroupByOutputType[P]>
            : GetScalarType<T[P], ModelConfigGroupByOutputType[P]>
        }
      >
    >


  export type ModelConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    model?: boolean
    displayName?: boolean
    type?: boolean
    enabled?: boolean
    isDefault?: boolean
    params?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["modelConfig"]>

  export type ModelConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    model?: boolean
    displayName?: boolean
    type?: boolean
    enabled?: boolean
    isDefault?: boolean
    params?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["modelConfig"]>

  export type ModelConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    provider?: boolean
    model?: boolean
    displayName?: boolean
    type?: boolean
    enabled?: boolean
    isDefault?: boolean
    params?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["modelConfig"]>

  export type ModelConfigSelectScalar = {
    id?: boolean
    provider?: boolean
    model?: boolean
    displayName?: boolean
    type?: boolean
    enabled?: boolean
    isDefault?: boolean
    params?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ModelConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "provider" | "model" | "displayName" | "type" | "enabled" | "isDefault" | "params" | "createdAt" | "updatedAt", ExtArgs["result"]["modelConfig"]>

  export type $ModelConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ModelConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      provider: string
      model: string
      displayName: string
      type: string
      enabled: boolean
      isDefault: boolean
      params: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["modelConfig"]>
    composites: {}
  }

  type ModelConfigGetPayload<S extends boolean | null | undefined | ModelConfigDefaultArgs> = $Result.GetResult<Prisma.$ModelConfigPayload, S>

  type ModelConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ModelConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ModelConfigCountAggregateInputType | true
    }

  export interface ModelConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ModelConfig'], meta: { name: 'ModelConfig' } }
    /**
     * Find zero or one ModelConfig that matches the filter.
     * @param {ModelConfigFindUniqueArgs} args - Arguments to find a ModelConfig
     * @example
     * // Get one ModelConfig
     * const modelConfig = await prisma.modelConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ModelConfigFindUniqueArgs>(args: SelectSubset<T, ModelConfigFindUniqueArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ModelConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ModelConfigFindUniqueOrThrowArgs} args - Arguments to find a ModelConfig
     * @example
     * // Get one ModelConfig
     * const modelConfig = await prisma.modelConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ModelConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, ModelConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ModelConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigFindFirstArgs} args - Arguments to find a ModelConfig
     * @example
     * // Get one ModelConfig
     * const modelConfig = await prisma.modelConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ModelConfigFindFirstArgs>(args?: SelectSubset<T, ModelConfigFindFirstArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ModelConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigFindFirstOrThrowArgs} args - Arguments to find a ModelConfig
     * @example
     * // Get one ModelConfig
     * const modelConfig = await prisma.modelConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ModelConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, ModelConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ModelConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ModelConfigs
     * const modelConfigs = await prisma.modelConfig.findMany()
     * 
     * // Get first 10 ModelConfigs
     * const modelConfigs = await prisma.modelConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const modelConfigWithIdOnly = await prisma.modelConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ModelConfigFindManyArgs>(args?: SelectSubset<T, ModelConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ModelConfig.
     * @param {ModelConfigCreateArgs} args - Arguments to create a ModelConfig.
     * @example
     * // Create one ModelConfig
     * const ModelConfig = await prisma.modelConfig.create({
     *   data: {
     *     // ... data to create a ModelConfig
     *   }
     * })
     * 
     */
    create<T extends ModelConfigCreateArgs>(args: SelectSubset<T, ModelConfigCreateArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ModelConfigs.
     * @param {ModelConfigCreateManyArgs} args - Arguments to create many ModelConfigs.
     * @example
     * // Create many ModelConfigs
     * const modelConfig = await prisma.modelConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ModelConfigCreateManyArgs>(args?: SelectSubset<T, ModelConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ModelConfigs and returns the data saved in the database.
     * @param {ModelConfigCreateManyAndReturnArgs} args - Arguments to create many ModelConfigs.
     * @example
     * // Create many ModelConfigs
     * const modelConfig = await prisma.modelConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ModelConfigs and only return the `id`
     * const modelConfigWithIdOnly = await prisma.modelConfig.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ModelConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, ModelConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ModelConfig.
     * @param {ModelConfigDeleteArgs} args - Arguments to delete one ModelConfig.
     * @example
     * // Delete one ModelConfig
     * const ModelConfig = await prisma.modelConfig.delete({
     *   where: {
     *     // ... filter to delete one ModelConfig
     *   }
     * })
     * 
     */
    delete<T extends ModelConfigDeleteArgs>(args: SelectSubset<T, ModelConfigDeleteArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ModelConfig.
     * @param {ModelConfigUpdateArgs} args - Arguments to update one ModelConfig.
     * @example
     * // Update one ModelConfig
     * const modelConfig = await prisma.modelConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ModelConfigUpdateArgs>(args: SelectSubset<T, ModelConfigUpdateArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ModelConfigs.
     * @param {ModelConfigDeleteManyArgs} args - Arguments to filter ModelConfigs to delete.
     * @example
     * // Delete a few ModelConfigs
     * const { count } = await prisma.modelConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ModelConfigDeleteManyArgs>(args?: SelectSubset<T, ModelConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ModelConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ModelConfigs
     * const modelConfig = await prisma.modelConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ModelConfigUpdateManyArgs>(args: SelectSubset<T, ModelConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ModelConfigs and returns the data updated in the database.
     * @param {ModelConfigUpdateManyAndReturnArgs} args - Arguments to update many ModelConfigs.
     * @example
     * // Update many ModelConfigs
     * const modelConfig = await prisma.modelConfig.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ModelConfigs and only return the `id`
     * const modelConfigWithIdOnly = await prisma.modelConfig.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ModelConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, ModelConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ModelConfig.
     * @param {ModelConfigUpsertArgs} args - Arguments to update or create a ModelConfig.
     * @example
     * // Update or create a ModelConfig
     * const modelConfig = await prisma.modelConfig.upsert({
     *   create: {
     *     // ... data to create a ModelConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ModelConfig we want to update
     *   }
     * })
     */
    upsert<T extends ModelConfigUpsertArgs>(args: SelectSubset<T, ModelConfigUpsertArgs<ExtArgs>>): Prisma__ModelConfigClient<$Result.GetResult<Prisma.$ModelConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ModelConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigCountArgs} args - Arguments to filter ModelConfigs to count.
     * @example
     * // Count the number of ModelConfigs
     * const count = await prisma.modelConfig.count({
     *   where: {
     *     // ... the filter for the ModelConfigs we want to count
     *   }
     * })
    **/
    count<T extends ModelConfigCountArgs>(
      args?: Subset<T, ModelConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ModelConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ModelConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ModelConfigAggregateArgs>(args: Subset<T, ModelConfigAggregateArgs>): Prisma.PrismaPromise<GetModelConfigAggregateType<T>>

    /**
     * Group by ModelConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ModelConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ModelConfigGroupByArgs['orderBy'] }
        : { orderBy?: ModelConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ModelConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetModelConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ModelConfig model
   */
  readonly fields: ModelConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ModelConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ModelConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ModelConfig model
   */
  interface ModelConfigFieldRefs {
    readonly id: FieldRef<"ModelConfig", 'String'>
    readonly provider: FieldRef<"ModelConfig", 'String'>
    readonly model: FieldRef<"ModelConfig", 'String'>
    readonly displayName: FieldRef<"ModelConfig", 'String'>
    readonly type: FieldRef<"ModelConfig", 'String'>
    readonly enabled: FieldRef<"ModelConfig", 'Boolean'>
    readonly isDefault: FieldRef<"ModelConfig", 'Boolean'>
    readonly params: FieldRef<"ModelConfig", 'Json'>
    readonly createdAt: FieldRef<"ModelConfig", 'DateTime'>
    readonly updatedAt: FieldRef<"ModelConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ModelConfig findUnique
   */
  export type ModelConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter, which ModelConfig to fetch.
     */
    where: ModelConfigWhereUniqueInput
  }

  /**
   * ModelConfig findUniqueOrThrow
   */
  export type ModelConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter, which ModelConfig to fetch.
     */
    where: ModelConfigWhereUniqueInput
  }

  /**
   * ModelConfig findFirst
   */
  export type ModelConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter, which ModelConfig to fetch.
     */
    where?: ModelConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelConfigs to fetch.
     */
    orderBy?: ModelConfigOrderByWithRelationInput | ModelConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ModelConfigs.
     */
    cursor?: ModelConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ModelConfigs.
     */
    distinct?: ModelConfigScalarFieldEnum | ModelConfigScalarFieldEnum[]
  }

  /**
   * ModelConfig findFirstOrThrow
   */
  export type ModelConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter, which ModelConfig to fetch.
     */
    where?: ModelConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelConfigs to fetch.
     */
    orderBy?: ModelConfigOrderByWithRelationInput | ModelConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ModelConfigs.
     */
    cursor?: ModelConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ModelConfigs.
     */
    distinct?: ModelConfigScalarFieldEnum | ModelConfigScalarFieldEnum[]
  }

  /**
   * ModelConfig findMany
   */
  export type ModelConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter, which ModelConfigs to fetch.
     */
    where?: ModelConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelConfigs to fetch.
     */
    orderBy?: ModelConfigOrderByWithRelationInput | ModelConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ModelConfigs.
     */
    cursor?: ModelConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ModelConfigs.
     */
    distinct?: ModelConfigScalarFieldEnum | ModelConfigScalarFieldEnum[]
  }

  /**
   * ModelConfig create
   */
  export type ModelConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a ModelConfig.
     */
    data: XOR<ModelConfigCreateInput, ModelConfigUncheckedCreateInput>
  }

  /**
   * ModelConfig createMany
   */
  export type ModelConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ModelConfigs.
     */
    data: ModelConfigCreateManyInput | ModelConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ModelConfig createManyAndReturn
   */
  export type ModelConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * The data used to create many ModelConfigs.
     */
    data: ModelConfigCreateManyInput | ModelConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ModelConfig update
   */
  export type ModelConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a ModelConfig.
     */
    data: XOR<ModelConfigUpdateInput, ModelConfigUncheckedUpdateInput>
    /**
     * Choose, which ModelConfig to update.
     */
    where: ModelConfigWhereUniqueInput
  }

  /**
   * ModelConfig updateMany
   */
  export type ModelConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ModelConfigs.
     */
    data: XOR<ModelConfigUpdateManyMutationInput, ModelConfigUncheckedUpdateManyInput>
    /**
     * Filter which ModelConfigs to update
     */
    where?: ModelConfigWhereInput
    /**
     * Limit how many ModelConfigs to update.
     */
    limit?: number
  }

  /**
   * ModelConfig updateManyAndReturn
   */
  export type ModelConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * The data used to update ModelConfigs.
     */
    data: XOR<ModelConfigUpdateManyMutationInput, ModelConfigUncheckedUpdateManyInput>
    /**
     * Filter which ModelConfigs to update
     */
    where?: ModelConfigWhereInput
    /**
     * Limit how many ModelConfigs to update.
     */
    limit?: number
  }

  /**
   * ModelConfig upsert
   */
  export type ModelConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the ModelConfig to update in case it exists.
     */
    where: ModelConfigWhereUniqueInput
    /**
     * In case the ModelConfig found by the `where` argument doesn't exist, create a new ModelConfig with this data.
     */
    create: XOR<ModelConfigCreateInput, ModelConfigUncheckedCreateInput>
    /**
     * In case the ModelConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ModelConfigUpdateInput, ModelConfigUncheckedUpdateInput>
  }

  /**
   * ModelConfig delete
   */
  export type ModelConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
    /**
     * Filter which ModelConfig to delete.
     */
    where: ModelConfigWhereUniqueInput
  }

  /**
   * ModelConfig deleteMany
   */
  export type ModelConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ModelConfigs to delete
     */
    where?: ModelConfigWhereInput
    /**
     * Limit how many ModelConfigs to delete.
     */
    limit?: number
  }

  /**
   * ModelConfig without action
   */
  export type ModelConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelConfig
     */
    select?: ModelConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ModelConfig
     */
    omit?: ModelConfigOmit<ExtArgs> | null
  }


  /**
   * Model OperationConfig
   */

  export type AggregateOperationConfig = {
    _count: OperationConfigCountAggregateOutputType | null
    _min: OperationConfigMinAggregateOutputType | null
    _max: OperationConfigMaxAggregateOutputType | null
  }

  export type OperationConfigMinAggregateOutputType = {
    id: string | null
    key: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OperationConfigMaxAggregateOutputType = {
    id: string | null
    key: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OperationConfigCountAggregateOutputType = {
    id: number
    key: number
    value: number
    description: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OperationConfigMinAggregateInputType = {
    id?: true
    key?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OperationConfigMaxAggregateInputType = {
    id?: true
    key?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OperationConfigCountAggregateInputType = {
    id?: true
    key?: true
    value?: true
    description?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OperationConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OperationConfig to aggregate.
     */
    where?: OperationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OperationConfigs to fetch.
     */
    orderBy?: OperationConfigOrderByWithRelationInput | OperationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OperationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OperationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OperationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OperationConfigs
    **/
    _count?: true | OperationConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OperationConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OperationConfigMaxAggregateInputType
  }

  export type GetOperationConfigAggregateType<T extends OperationConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateOperationConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOperationConfig[P]>
      : GetScalarType<T[P], AggregateOperationConfig[P]>
  }




  export type OperationConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OperationConfigWhereInput
    orderBy?: OperationConfigOrderByWithAggregationInput | OperationConfigOrderByWithAggregationInput[]
    by: OperationConfigScalarFieldEnum[] | OperationConfigScalarFieldEnum
    having?: OperationConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OperationConfigCountAggregateInputType | true
    _min?: OperationConfigMinAggregateInputType
    _max?: OperationConfigMaxAggregateInputType
  }

  export type OperationConfigGroupByOutputType = {
    id: string
    key: string
    value: JsonValue | null
    description: string
    createdAt: Date
    updatedAt: Date
    _count: OperationConfigCountAggregateOutputType | null
    _min: OperationConfigMinAggregateOutputType | null
    _max: OperationConfigMaxAggregateOutputType | null
  }

  type GetOperationConfigGroupByPayload<T extends OperationConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OperationConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OperationConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OperationConfigGroupByOutputType[P]>
            : GetScalarType<T[P], OperationConfigGroupByOutputType[P]>
        }
      >
    >


  export type OperationConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["operationConfig"]>

  export type OperationConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["operationConfig"]>

  export type OperationConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["operationConfig"]>

  export type OperationConfigSelectScalar = {
    id?: boolean
    key?: boolean
    value?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OperationConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "value" | "description" | "createdAt" | "updatedAt", ExtArgs["result"]["operationConfig"]>

  export type $OperationConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OperationConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      key: string
      value: Prisma.JsonValue | null
      description: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["operationConfig"]>
    composites: {}
  }

  type OperationConfigGetPayload<S extends boolean | null | undefined | OperationConfigDefaultArgs> = $Result.GetResult<Prisma.$OperationConfigPayload, S>

  type OperationConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OperationConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OperationConfigCountAggregateInputType | true
    }

  export interface OperationConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OperationConfig'], meta: { name: 'OperationConfig' } }
    /**
     * Find zero or one OperationConfig that matches the filter.
     * @param {OperationConfigFindUniqueArgs} args - Arguments to find a OperationConfig
     * @example
     * // Get one OperationConfig
     * const operationConfig = await prisma.operationConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OperationConfigFindUniqueArgs>(args: SelectSubset<T, OperationConfigFindUniqueArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one OperationConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OperationConfigFindUniqueOrThrowArgs} args - Arguments to find a OperationConfig
     * @example
     * // Get one OperationConfig
     * const operationConfig = await prisma.operationConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OperationConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, OperationConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OperationConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigFindFirstArgs} args - Arguments to find a OperationConfig
     * @example
     * // Get one OperationConfig
     * const operationConfig = await prisma.operationConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OperationConfigFindFirstArgs>(args?: SelectSubset<T, OperationConfigFindFirstArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OperationConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigFindFirstOrThrowArgs} args - Arguments to find a OperationConfig
     * @example
     * // Get one OperationConfig
     * const operationConfig = await prisma.operationConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OperationConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, OperationConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more OperationConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OperationConfigs
     * const operationConfigs = await prisma.operationConfig.findMany()
     * 
     * // Get first 10 OperationConfigs
     * const operationConfigs = await prisma.operationConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const operationConfigWithIdOnly = await prisma.operationConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OperationConfigFindManyArgs>(args?: SelectSubset<T, OperationConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a OperationConfig.
     * @param {OperationConfigCreateArgs} args - Arguments to create a OperationConfig.
     * @example
     * // Create one OperationConfig
     * const OperationConfig = await prisma.operationConfig.create({
     *   data: {
     *     // ... data to create a OperationConfig
     *   }
     * })
     * 
     */
    create<T extends OperationConfigCreateArgs>(args: SelectSubset<T, OperationConfigCreateArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many OperationConfigs.
     * @param {OperationConfigCreateManyArgs} args - Arguments to create many OperationConfigs.
     * @example
     * // Create many OperationConfigs
     * const operationConfig = await prisma.operationConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OperationConfigCreateManyArgs>(args?: SelectSubset<T, OperationConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OperationConfigs and returns the data saved in the database.
     * @param {OperationConfigCreateManyAndReturnArgs} args - Arguments to create many OperationConfigs.
     * @example
     * // Create many OperationConfigs
     * const operationConfig = await prisma.operationConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OperationConfigs and only return the `id`
     * const operationConfigWithIdOnly = await prisma.operationConfig.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OperationConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, OperationConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a OperationConfig.
     * @param {OperationConfigDeleteArgs} args - Arguments to delete one OperationConfig.
     * @example
     * // Delete one OperationConfig
     * const OperationConfig = await prisma.operationConfig.delete({
     *   where: {
     *     // ... filter to delete one OperationConfig
     *   }
     * })
     * 
     */
    delete<T extends OperationConfigDeleteArgs>(args: SelectSubset<T, OperationConfigDeleteArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one OperationConfig.
     * @param {OperationConfigUpdateArgs} args - Arguments to update one OperationConfig.
     * @example
     * // Update one OperationConfig
     * const operationConfig = await prisma.operationConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OperationConfigUpdateArgs>(args: SelectSubset<T, OperationConfigUpdateArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more OperationConfigs.
     * @param {OperationConfigDeleteManyArgs} args - Arguments to filter OperationConfigs to delete.
     * @example
     * // Delete a few OperationConfigs
     * const { count } = await prisma.operationConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OperationConfigDeleteManyArgs>(args?: SelectSubset<T, OperationConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OperationConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OperationConfigs
     * const operationConfig = await prisma.operationConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OperationConfigUpdateManyArgs>(args: SelectSubset<T, OperationConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OperationConfigs and returns the data updated in the database.
     * @param {OperationConfigUpdateManyAndReturnArgs} args - Arguments to update many OperationConfigs.
     * @example
     * // Update many OperationConfigs
     * const operationConfig = await prisma.operationConfig.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more OperationConfigs and only return the `id`
     * const operationConfigWithIdOnly = await prisma.operationConfig.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OperationConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, OperationConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one OperationConfig.
     * @param {OperationConfigUpsertArgs} args - Arguments to update or create a OperationConfig.
     * @example
     * // Update or create a OperationConfig
     * const operationConfig = await prisma.operationConfig.upsert({
     *   create: {
     *     // ... data to create a OperationConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OperationConfig we want to update
     *   }
     * })
     */
    upsert<T extends OperationConfigUpsertArgs>(args: SelectSubset<T, OperationConfigUpsertArgs<ExtArgs>>): Prisma__OperationConfigClient<$Result.GetResult<Prisma.$OperationConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of OperationConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigCountArgs} args - Arguments to filter OperationConfigs to count.
     * @example
     * // Count the number of OperationConfigs
     * const count = await prisma.operationConfig.count({
     *   where: {
     *     // ... the filter for the OperationConfigs we want to count
     *   }
     * })
    **/
    count<T extends OperationConfigCountArgs>(
      args?: Subset<T, OperationConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OperationConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OperationConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OperationConfigAggregateArgs>(args: Subset<T, OperationConfigAggregateArgs>): Prisma.PrismaPromise<GetOperationConfigAggregateType<T>>

    /**
     * Group by OperationConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OperationConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OperationConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OperationConfigGroupByArgs['orderBy'] }
        : { orderBy?: OperationConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OperationConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOperationConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OperationConfig model
   */
  readonly fields: OperationConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OperationConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OperationConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OperationConfig model
   */
  interface OperationConfigFieldRefs {
    readonly id: FieldRef<"OperationConfig", 'String'>
    readonly key: FieldRef<"OperationConfig", 'String'>
    readonly value: FieldRef<"OperationConfig", 'Json'>
    readonly description: FieldRef<"OperationConfig", 'String'>
    readonly createdAt: FieldRef<"OperationConfig", 'DateTime'>
    readonly updatedAt: FieldRef<"OperationConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OperationConfig findUnique
   */
  export type OperationConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter, which OperationConfig to fetch.
     */
    where: OperationConfigWhereUniqueInput
  }

  /**
   * OperationConfig findUniqueOrThrow
   */
  export type OperationConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter, which OperationConfig to fetch.
     */
    where: OperationConfigWhereUniqueInput
  }

  /**
   * OperationConfig findFirst
   */
  export type OperationConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter, which OperationConfig to fetch.
     */
    where?: OperationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OperationConfigs to fetch.
     */
    orderBy?: OperationConfigOrderByWithRelationInput | OperationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OperationConfigs.
     */
    cursor?: OperationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OperationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OperationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OperationConfigs.
     */
    distinct?: OperationConfigScalarFieldEnum | OperationConfigScalarFieldEnum[]
  }

  /**
   * OperationConfig findFirstOrThrow
   */
  export type OperationConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter, which OperationConfig to fetch.
     */
    where?: OperationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OperationConfigs to fetch.
     */
    orderBy?: OperationConfigOrderByWithRelationInput | OperationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OperationConfigs.
     */
    cursor?: OperationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OperationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OperationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OperationConfigs.
     */
    distinct?: OperationConfigScalarFieldEnum | OperationConfigScalarFieldEnum[]
  }

  /**
   * OperationConfig findMany
   */
  export type OperationConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter, which OperationConfigs to fetch.
     */
    where?: OperationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OperationConfigs to fetch.
     */
    orderBy?: OperationConfigOrderByWithRelationInput | OperationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OperationConfigs.
     */
    cursor?: OperationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OperationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OperationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OperationConfigs.
     */
    distinct?: OperationConfigScalarFieldEnum | OperationConfigScalarFieldEnum[]
  }

  /**
   * OperationConfig create
   */
  export type OperationConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a OperationConfig.
     */
    data: XOR<OperationConfigCreateInput, OperationConfigUncheckedCreateInput>
  }

  /**
   * OperationConfig createMany
   */
  export type OperationConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OperationConfigs.
     */
    data: OperationConfigCreateManyInput | OperationConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OperationConfig createManyAndReturn
   */
  export type OperationConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * The data used to create many OperationConfigs.
     */
    data: OperationConfigCreateManyInput | OperationConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OperationConfig update
   */
  export type OperationConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a OperationConfig.
     */
    data: XOR<OperationConfigUpdateInput, OperationConfigUncheckedUpdateInput>
    /**
     * Choose, which OperationConfig to update.
     */
    where: OperationConfigWhereUniqueInput
  }

  /**
   * OperationConfig updateMany
   */
  export type OperationConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OperationConfigs.
     */
    data: XOR<OperationConfigUpdateManyMutationInput, OperationConfigUncheckedUpdateManyInput>
    /**
     * Filter which OperationConfigs to update
     */
    where?: OperationConfigWhereInput
    /**
     * Limit how many OperationConfigs to update.
     */
    limit?: number
  }

  /**
   * OperationConfig updateManyAndReturn
   */
  export type OperationConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * The data used to update OperationConfigs.
     */
    data: XOR<OperationConfigUpdateManyMutationInput, OperationConfigUncheckedUpdateManyInput>
    /**
     * Filter which OperationConfigs to update
     */
    where?: OperationConfigWhereInput
    /**
     * Limit how many OperationConfigs to update.
     */
    limit?: number
  }

  /**
   * OperationConfig upsert
   */
  export type OperationConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the OperationConfig to update in case it exists.
     */
    where: OperationConfigWhereUniqueInput
    /**
     * In case the OperationConfig found by the `where` argument doesn't exist, create a new OperationConfig with this data.
     */
    create: XOR<OperationConfigCreateInput, OperationConfigUncheckedCreateInput>
    /**
     * In case the OperationConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OperationConfigUpdateInput, OperationConfigUncheckedUpdateInput>
  }

  /**
   * OperationConfig delete
   */
  export type OperationConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
    /**
     * Filter which OperationConfig to delete.
     */
    where: OperationConfigWhereUniqueInput
  }

  /**
   * OperationConfig deleteMany
   */
  export type OperationConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OperationConfigs to delete
     */
    where?: OperationConfigWhereInput
    /**
     * Limit how many OperationConfigs to delete.
     */
    limit?: number
  }

  /**
   * OperationConfig without action
   */
  export type OperationConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OperationConfig
     */
    select?: OperationConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OperationConfig
     */
    omit?: OperationConfigOmit<ExtArgs> | null
  }


  /**
   * Model VerificationCode
   */

  export type AggregateVerificationCode = {
    _count: VerificationCodeCountAggregateOutputType | null
    _min: VerificationCodeMinAggregateOutputType | null
    _max: VerificationCodeMaxAggregateOutputType | null
  }

  export type VerificationCodeMinAggregateOutputType = {
    id: string | null
    target: string | null
    method: string | null
    code: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type VerificationCodeMaxAggregateOutputType = {
    id: string | null
    target: string | null
    method: string | null
    code: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type VerificationCodeCountAggregateOutputType = {
    id: number
    target: number
    method: number
    code: number
    expiresAt: number
    createdAt: number
    _all: number
  }


  export type VerificationCodeMinAggregateInputType = {
    id?: true
    target?: true
    method?: true
    code?: true
    expiresAt?: true
    createdAt?: true
  }

  export type VerificationCodeMaxAggregateInputType = {
    id?: true
    target?: true
    method?: true
    code?: true
    expiresAt?: true
    createdAt?: true
  }

  export type VerificationCodeCountAggregateInputType = {
    id?: true
    target?: true
    method?: true
    code?: true
    expiresAt?: true
    createdAt?: true
    _all?: true
  }

  export type VerificationCodeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationCode to aggregate.
     */
    where?: VerificationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationCodes to fetch.
     */
    orderBy?: VerificationCodeOrderByWithRelationInput | VerificationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VerificationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VerificationCodes
    **/
    _count?: true | VerificationCodeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VerificationCodeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VerificationCodeMaxAggregateInputType
  }

  export type GetVerificationCodeAggregateType<T extends VerificationCodeAggregateArgs> = {
        [P in keyof T & keyof AggregateVerificationCode]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVerificationCode[P]>
      : GetScalarType<T[P], AggregateVerificationCode[P]>
  }




  export type VerificationCodeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerificationCodeWhereInput
    orderBy?: VerificationCodeOrderByWithAggregationInput | VerificationCodeOrderByWithAggregationInput[]
    by: VerificationCodeScalarFieldEnum[] | VerificationCodeScalarFieldEnum
    having?: VerificationCodeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VerificationCodeCountAggregateInputType | true
    _min?: VerificationCodeMinAggregateInputType
    _max?: VerificationCodeMaxAggregateInputType
  }

  export type VerificationCodeGroupByOutputType = {
    id: string
    target: string
    method: string
    code: string
    expiresAt: Date
    createdAt: Date
    _count: VerificationCodeCountAggregateOutputType | null
    _min: VerificationCodeMinAggregateOutputType | null
    _max: VerificationCodeMaxAggregateOutputType | null
  }

  type GetVerificationCodeGroupByPayload<T extends VerificationCodeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VerificationCodeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VerificationCodeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VerificationCodeGroupByOutputType[P]>
            : GetScalarType<T[P], VerificationCodeGroupByOutputType[P]>
        }
      >
    >


  export type VerificationCodeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    target?: boolean
    method?: boolean
    code?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["verificationCode"]>

  export type VerificationCodeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    target?: boolean
    method?: boolean
    code?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["verificationCode"]>

  export type VerificationCodeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    target?: boolean
    method?: boolean
    code?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["verificationCode"]>

  export type VerificationCodeSelectScalar = {
    id?: boolean
    target?: boolean
    method?: boolean
    code?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }

  export type VerificationCodeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "target" | "method" | "code" | "expiresAt" | "createdAt", ExtArgs["result"]["verificationCode"]>

  export type $VerificationCodePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VerificationCode"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      target: string
      method: string
      code: string
      expiresAt: Date
      createdAt: Date
    }, ExtArgs["result"]["verificationCode"]>
    composites: {}
  }

  type VerificationCodeGetPayload<S extends boolean | null | undefined | VerificationCodeDefaultArgs> = $Result.GetResult<Prisma.$VerificationCodePayload, S>

  type VerificationCodeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VerificationCodeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VerificationCodeCountAggregateInputType | true
    }

  export interface VerificationCodeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VerificationCode'], meta: { name: 'VerificationCode' } }
    /**
     * Find zero or one VerificationCode that matches the filter.
     * @param {VerificationCodeFindUniqueArgs} args - Arguments to find a VerificationCode
     * @example
     * // Get one VerificationCode
     * const verificationCode = await prisma.verificationCode.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VerificationCodeFindUniqueArgs>(args: SelectSubset<T, VerificationCodeFindUniqueArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one VerificationCode that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VerificationCodeFindUniqueOrThrowArgs} args - Arguments to find a VerificationCode
     * @example
     * // Get one VerificationCode
     * const verificationCode = await prisma.verificationCode.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VerificationCodeFindUniqueOrThrowArgs>(args: SelectSubset<T, VerificationCodeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first VerificationCode that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeFindFirstArgs} args - Arguments to find a VerificationCode
     * @example
     * // Get one VerificationCode
     * const verificationCode = await prisma.verificationCode.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VerificationCodeFindFirstArgs>(args?: SelectSubset<T, VerificationCodeFindFirstArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first VerificationCode that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeFindFirstOrThrowArgs} args - Arguments to find a VerificationCode
     * @example
     * // Get one VerificationCode
     * const verificationCode = await prisma.verificationCode.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VerificationCodeFindFirstOrThrowArgs>(args?: SelectSubset<T, VerificationCodeFindFirstOrThrowArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more VerificationCodes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VerificationCodes
     * const verificationCodes = await prisma.verificationCode.findMany()
     * 
     * // Get first 10 VerificationCodes
     * const verificationCodes = await prisma.verificationCode.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const verificationCodeWithIdOnly = await prisma.verificationCode.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VerificationCodeFindManyArgs>(args?: SelectSubset<T, VerificationCodeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a VerificationCode.
     * @param {VerificationCodeCreateArgs} args - Arguments to create a VerificationCode.
     * @example
     * // Create one VerificationCode
     * const VerificationCode = await prisma.verificationCode.create({
     *   data: {
     *     // ... data to create a VerificationCode
     *   }
     * })
     * 
     */
    create<T extends VerificationCodeCreateArgs>(args: SelectSubset<T, VerificationCodeCreateArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many VerificationCodes.
     * @param {VerificationCodeCreateManyArgs} args - Arguments to create many VerificationCodes.
     * @example
     * // Create many VerificationCodes
     * const verificationCode = await prisma.verificationCode.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VerificationCodeCreateManyArgs>(args?: SelectSubset<T, VerificationCodeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VerificationCodes and returns the data saved in the database.
     * @param {VerificationCodeCreateManyAndReturnArgs} args - Arguments to create many VerificationCodes.
     * @example
     * // Create many VerificationCodes
     * const verificationCode = await prisma.verificationCode.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VerificationCodes and only return the `id`
     * const verificationCodeWithIdOnly = await prisma.verificationCode.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VerificationCodeCreateManyAndReturnArgs>(args?: SelectSubset<T, VerificationCodeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a VerificationCode.
     * @param {VerificationCodeDeleteArgs} args - Arguments to delete one VerificationCode.
     * @example
     * // Delete one VerificationCode
     * const VerificationCode = await prisma.verificationCode.delete({
     *   where: {
     *     // ... filter to delete one VerificationCode
     *   }
     * })
     * 
     */
    delete<T extends VerificationCodeDeleteArgs>(args: SelectSubset<T, VerificationCodeDeleteArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one VerificationCode.
     * @param {VerificationCodeUpdateArgs} args - Arguments to update one VerificationCode.
     * @example
     * // Update one VerificationCode
     * const verificationCode = await prisma.verificationCode.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VerificationCodeUpdateArgs>(args: SelectSubset<T, VerificationCodeUpdateArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more VerificationCodes.
     * @param {VerificationCodeDeleteManyArgs} args - Arguments to filter VerificationCodes to delete.
     * @example
     * // Delete a few VerificationCodes
     * const { count } = await prisma.verificationCode.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VerificationCodeDeleteManyArgs>(args?: SelectSubset<T, VerificationCodeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VerificationCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VerificationCodes
     * const verificationCode = await prisma.verificationCode.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VerificationCodeUpdateManyArgs>(args: SelectSubset<T, VerificationCodeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VerificationCodes and returns the data updated in the database.
     * @param {VerificationCodeUpdateManyAndReturnArgs} args - Arguments to update many VerificationCodes.
     * @example
     * // Update many VerificationCodes
     * const verificationCode = await prisma.verificationCode.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more VerificationCodes and only return the `id`
     * const verificationCodeWithIdOnly = await prisma.verificationCode.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VerificationCodeUpdateManyAndReturnArgs>(args: SelectSubset<T, VerificationCodeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one VerificationCode.
     * @param {VerificationCodeUpsertArgs} args - Arguments to update or create a VerificationCode.
     * @example
     * // Update or create a VerificationCode
     * const verificationCode = await prisma.verificationCode.upsert({
     *   create: {
     *     // ... data to create a VerificationCode
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VerificationCode we want to update
     *   }
     * })
     */
    upsert<T extends VerificationCodeUpsertArgs>(args: SelectSubset<T, VerificationCodeUpsertArgs<ExtArgs>>): Prisma__VerificationCodeClient<$Result.GetResult<Prisma.$VerificationCodePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of VerificationCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeCountArgs} args - Arguments to filter VerificationCodes to count.
     * @example
     * // Count the number of VerificationCodes
     * const count = await prisma.verificationCode.count({
     *   where: {
     *     // ... the filter for the VerificationCodes we want to count
     *   }
     * })
    **/
    count<T extends VerificationCodeCountArgs>(
      args?: Subset<T, VerificationCodeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VerificationCodeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VerificationCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VerificationCodeAggregateArgs>(args: Subset<T, VerificationCodeAggregateArgs>): Prisma.PrismaPromise<GetVerificationCodeAggregateType<T>>

    /**
     * Group by VerificationCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCodeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VerificationCodeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VerificationCodeGroupByArgs['orderBy'] }
        : { orderBy?: VerificationCodeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VerificationCodeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVerificationCodeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VerificationCode model
   */
  readonly fields: VerificationCodeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VerificationCode.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VerificationCodeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the VerificationCode model
   */
  interface VerificationCodeFieldRefs {
    readonly id: FieldRef<"VerificationCode", 'String'>
    readonly target: FieldRef<"VerificationCode", 'String'>
    readonly method: FieldRef<"VerificationCode", 'String'>
    readonly code: FieldRef<"VerificationCode", 'String'>
    readonly expiresAt: FieldRef<"VerificationCode", 'DateTime'>
    readonly createdAt: FieldRef<"VerificationCode", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * VerificationCode findUnique
   */
  export type VerificationCodeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter, which VerificationCode to fetch.
     */
    where: VerificationCodeWhereUniqueInput
  }

  /**
   * VerificationCode findUniqueOrThrow
   */
  export type VerificationCodeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter, which VerificationCode to fetch.
     */
    where: VerificationCodeWhereUniqueInput
  }

  /**
   * VerificationCode findFirst
   */
  export type VerificationCodeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter, which VerificationCode to fetch.
     */
    where?: VerificationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationCodes to fetch.
     */
    orderBy?: VerificationCodeOrderByWithRelationInput | VerificationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationCodes.
     */
    cursor?: VerificationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationCodes.
     */
    distinct?: VerificationCodeScalarFieldEnum | VerificationCodeScalarFieldEnum[]
  }

  /**
   * VerificationCode findFirstOrThrow
   */
  export type VerificationCodeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter, which VerificationCode to fetch.
     */
    where?: VerificationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationCodes to fetch.
     */
    orderBy?: VerificationCodeOrderByWithRelationInput | VerificationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationCodes.
     */
    cursor?: VerificationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationCodes.
     */
    distinct?: VerificationCodeScalarFieldEnum | VerificationCodeScalarFieldEnum[]
  }

  /**
   * VerificationCode findMany
   */
  export type VerificationCodeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter, which VerificationCodes to fetch.
     */
    where?: VerificationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationCodes to fetch.
     */
    orderBy?: VerificationCodeOrderByWithRelationInput | VerificationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VerificationCodes.
     */
    cursor?: VerificationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationCodes.
     */
    distinct?: VerificationCodeScalarFieldEnum | VerificationCodeScalarFieldEnum[]
  }

  /**
   * VerificationCode create
   */
  export type VerificationCodeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * The data needed to create a VerificationCode.
     */
    data: XOR<VerificationCodeCreateInput, VerificationCodeUncheckedCreateInput>
  }

  /**
   * VerificationCode createMany
   */
  export type VerificationCodeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VerificationCodes.
     */
    data: VerificationCodeCreateManyInput | VerificationCodeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationCode createManyAndReturn
   */
  export type VerificationCodeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * The data used to create many VerificationCodes.
     */
    data: VerificationCodeCreateManyInput | VerificationCodeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationCode update
   */
  export type VerificationCodeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * The data needed to update a VerificationCode.
     */
    data: XOR<VerificationCodeUpdateInput, VerificationCodeUncheckedUpdateInput>
    /**
     * Choose, which VerificationCode to update.
     */
    where: VerificationCodeWhereUniqueInput
  }

  /**
   * VerificationCode updateMany
   */
  export type VerificationCodeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VerificationCodes.
     */
    data: XOR<VerificationCodeUpdateManyMutationInput, VerificationCodeUncheckedUpdateManyInput>
    /**
     * Filter which VerificationCodes to update
     */
    where?: VerificationCodeWhereInput
    /**
     * Limit how many VerificationCodes to update.
     */
    limit?: number
  }

  /**
   * VerificationCode updateManyAndReturn
   */
  export type VerificationCodeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * The data used to update VerificationCodes.
     */
    data: XOR<VerificationCodeUpdateManyMutationInput, VerificationCodeUncheckedUpdateManyInput>
    /**
     * Filter which VerificationCodes to update
     */
    where?: VerificationCodeWhereInput
    /**
     * Limit how many VerificationCodes to update.
     */
    limit?: number
  }

  /**
   * VerificationCode upsert
   */
  export type VerificationCodeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * The filter to search for the VerificationCode to update in case it exists.
     */
    where: VerificationCodeWhereUniqueInput
    /**
     * In case the VerificationCode found by the `where` argument doesn't exist, create a new VerificationCode with this data.
     */
    create: XOR<VerificationCodeCreateInput, VerificationCodeUncheckedCreateInput>
    /**
     * In case the VerificationCode was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VerificationCodeUpdateInput, VerificationCodeUncheckedUpdateInput>
  }

  /**
   * VerificationCode delete
   */
  export type VerificationCodeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
    /**
     * Filter which VerificationCode to delete.
     */
    where: VerificationCodeWhereUniqueInput
  }

  /**
   * VerificationCode deleteMany
   */
  export type VerificationCodeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationCodes to delete
     */
    where?: VerificationCodeWhereInput
    /**
     * Limit how many VerificationCodes to delete.
     */
    limit?: number
  }

  /**
   * VerificationCode without action
   */
  export type VerificationCodeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationCode
     */
    select?: VerificationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationCode
     */
    omit?: VerificationCodeOmit<ExtArgs> | null
  }


  /**
   * Model CanvasBackup
   */

  export type AggregateCanvasBackup = {
    _count: CanvasBackupCountAggregateOutputType | null
    _avg: CanvasBackupAvgAggregateOutputType | null
    _sum: CanvasBackupSumAggregateOutputType | null
    _min: CanvasBackupMinAggregateOutputType | null
    _max: CanvasBackupMaxAggregateOutputType | null
  }

  export type CanvasBackupAvgAggregateOutputType = {
    version: number | null
  }

  export type CanvasBackupSumAggregateOutputType = {
    version: number | null
  }

  export type CanvasBackupMinAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    version: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CanvasBackupMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    version: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CanvasBackupCountAggregateOutputType = {
    id: number
    userId: number
    type: number
    data: number
    version: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CanvasBackupAvgAggregateInputType = {
    version?: true
  }

  export type CanvasBackupSumAggregateInputType = {
    version?: true
  }

  export type CanvasBackupMinAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    version?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CanvasBackupMaxAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    version?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CanvasBackupCountAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    data?: true
    version?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CanvasBackupAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CanvasBackup to aggregate.
     */
    where?: CanvasBackupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CanvasBackups to fetch.
     */
    orderBy?: CanvasBackupOrderByWithRelationInput | CanvasBackupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CanvasBackupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CanvasBackups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CanvasBackups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CanvasBackups
    **/
    _count?: true | CanvasBackupCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CanvasBackupAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CanvasBackupSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CanvasBackupMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CanvasBackupMaxAggregateInputType
  }

  export type GetCanvasBackupAggregateType<T extends CanvasBackupAggregateArgs> = {
        [P in keyof T & keyof AggregateCanvasBackup]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCanvasBackup[P]>
      : GetScalarType<T[P], AggregateCanvasBackup[P]>
  }




  export type CanvasBackupGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CanvasBackupWhereInput
    orderBy?: CanvasBackupOrderByWithAggregationInput | CanvasBackupOrderByWithAggregationInput[]
    by: CanvasBackupScalarFieldEnum[] | CanvasBackupScalarFieldEnum
    having?: CanvasBackupScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CanvasBackupCountAggregateInputType | true
    _avg?: CanvasBackupAvgAggregateInputType
    _sum?: CanvasBackupSumAggregateInputType
    _min?: CanvasBackupMinAggregateInputType
    _max?: CanvasBackupMaxAggregateInputType
  }

  export type CanvasBackupGroupByOutputType = {
    id: string
    userId: string
    type: string
    data: JsonValue | null
    version: number
    createdAt: Date
    updatedAt: Date
    _count: CanvasBackupCountAggregateOutputType | null
    _avg: CanvasBackupAvgAggregateOutputType | null
    _sum: CanvasBackupSumAggregateOutputType | null
    _min: CanvasBackupMinAggregateOutputType | null
    _max: CanvasBackupMaxAggregateOutputType | null
  }

  type GetCanvasBackupGroupByPayload<T extends CanvasBackupGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CanvasBackupGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CanvasBackupGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CanvasBackupGroupByOutputType[P]>
            : GetScalarType<T[P], CanvasBackupGroupByOutputType[P]>
        }
      >
    >


  export type CanvasBackupSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    data?: boolean
    version?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["canvasBackup"]>

  export type CanvasBackupSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    data?: boolean
    version?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["canvasBackup"]>

  export type CanvasBackupSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    data?: boolean
    version?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["canvasBackup"]>

  export type CanvasBackupSelectScalar = {
    id?: boolean
    userId?: boolean
    type?: boolean
    data?: boolean
    version?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CanvasBackupOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "type" | "data" | "version" | "createdAt" | "updatedAt", ExtArgs["result"]["canvasBackup"]>

  export type $CanvasBackupPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CanvasBackup"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      type: string
      data: Prisma.JsonValue | null
      version: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["canvasBackup"]>
    composites: {}
  }

  type CanvasBackupGetPayload<S extends boolean | null | undefined | CanvasBackupDefaultArgs> = $Result.GetResult<Prisma.$CanvasBackupPayload, S>

  type CanvasBackupCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CanvasBackupFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CanvasBackupCountAggregateInputType | true
    }

  export interface CanvasBackupDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CanvasBackup'], meta: { name: 'CanvasBackup' } }
    /**
     * Find zero or one CanvasBackup that matches the filter.
     * @param {CanvasBackupFindUniqueArgs} args - Arguments to find a CanvasBackup
     * @example
     * // Get one CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CanvasBackupFindUniqueArgs>(args: SelectSubset<T, CanvasBackupFindUniqueArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CanvasBackup that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CanvasBackupFindUniqueOrThrowArgs} args - Arguments to find a CanvasBackup
     * @example
     * // Get one CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CanvasBackupFindUniqueOrThrowArgs>(args: SelectSubset<T, CanvasBackupFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CanvasBackup that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupFindFirstArgs} args - Arguments to find a CanvasBackup
     * @example
     * // Get one CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CanvasBackupFindFirstArgs>(args?: SelectSubset<T, CanvasBackupFindFirstArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CanvasBackup that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupFindFirstOrThrowArgs} args - Arguments to find a CanvasBackup
     * @example
     * // Get one CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CanvasBackupFindFirstOrThrowArgs>(args?: SelectSubset<T, CanvasBackupFindFirstOrThrowArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CanvasBackups that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CanvasBackups
     * const canvasBackups = await prisma.canvasBackup.findMany()
     * 
     * // Get first 10 CanvasBackups
     * const canvasBackups = await prisma.canvasBackup.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const canvasBackupWithIdOnly = await prisma.canvasBackup.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CanvasBackupFindManyArgs>(args?: SelectSubset<T, CanvasBackupFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CanvasBackup.
     * @param {CanvasBackupCreateArgs} args - Arguments to create a CanvasBackup.
     * @example
     * // Create one CanvasBackup
     * const CanvasBackup = await prisma.canvasBackup.create({
     *   data: {
     *     // ... data to create a CanvasBackup
     *   }
     * })
     * 
     */
    create<T extends CanvasBackupCreateArgs>(args: SelectSubset<T, CanvasBackupCreateArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CanvasBackups.
     * @param {CanvasBackupCreateManyArgs} args - Arguments to create many CanvasBackups.
     * @example
     * // Create many CanvasBackups
     * const canvasBackup = await prisma.canvasBackup.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CanvasBackupCreateManyArgs>(args?: SelectSubset<T, CanvasBackupCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CanvasBackups and returns the data saved in the database.
     * @param {CanvasBackupCreateManyAndReturnArgs} args - Arguments to create many CanvasBackups.
     * @example
     * // Create many CanvasBackups
     * const canvasBackup = await prisma.canvasBackup.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CanvasBackups and only return the `id`
     * const canvasBackupWithIdOnly = await prisma.canvasBackup.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CanvasBackupCreateManyAndReturnArgs>(args?: SelectSubset<T, CanvasBackupCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CanvasBackup.
     * @param {CanvasBackupDeleteArgs} args - Arguments to delete one CanvasBackup.
     * @example
     * // Delete one CanvasBackup
     * const CanvasBackup = await prisma.canvasBackup.delete({
     *   where: {
     *     // ... filter to delete one CanvasBackup
     *   }
     * })
     * 
     */
    delete<T extends CanvasBackupDeleteArgs>(args: SelectSubset<T, CanvasBackupDeleteArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CanvasBackup.
     * @param {CanvasBackupUpdateArgs} args - Arguments to update one CanvasBackup.
     * @example
     * // Update one CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CanvasBackupUpdateArgs>(args: SelectSubset<T, CanvasBackupUpdateArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CanvasBackups.
     * @param {CanvasBackupDeleteManyArgs} args - Arguments to filter CanvasBackups to delete.
     * @example
     * // Delete a few CanvasBackups
     * const { count } = await prisma.canvasBackup.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CanvasBackupDeleteManyArgs>(args?: SelectSubset<T, CanvasBackupDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CanvasBackups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CanvasBackups
     * const canvasBackup = await prisma.canvasBackup.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CanvasBackupUpdateManyArgs>(args: SelectSubset<T, CanvasBackupUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CanvasBackups and returns the data updated in the database.
     * @param {CanvasBackupUpdateManyAndReturnArgs} args - Arguments to update many CanvasBackups.
     * @example
     * // Update many CanvasBackups
     * const canvasBackup = await prisma.canvasBackup.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CanvasBackups and only return the `id`
     * const canvasBackupWithIdOnly = await prisma.canvasBackup.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CanvasBackupUpdateManyAndReturnArgs>(args: SelectSubset<T, CanvasBackupUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CanvasBackup.
     * @param {CanvasBackupUpsertArgs} args - Arguments to update or create a CanvasBackup.
     * @example
     * // Update or create a CanvasBackup
     * const canvasBackup = await prisma.canvasBackup.upsert({
     *   create: {
     *     // ... data to create a CanvasBackup
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CanvasBackup we want to update
     *   }
     * })
     */
    upsert<T extends CanvasBackupUpsertArgs>(args: SelectSubset<T, CanvasBackupUpsertArgs<ExtArgs>>): Prisma__CanvasBackupClient<$Result.GetResult<Prisma.$CanvasBackupPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CanvasBackups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupCountArgs} args - Arguments to filter CanvasBackups to count.
     * @example
     * // Count the number of CanvasBackups
     * const count = await prisma.canvasBackup.count({
     *   where: {
     *     // ... the filter for the CanvasBackups we want to count
     *   }
     * })
    **/
    count<T extends CanvasBackupCountArgs>(
      args?: Subset<T, CanvasBackupCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CanvasBackupCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CanvasBackup.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CanvasBackupAggregateArgs>(args: Subset<T, CanvasBackupAggregateArgs>): Prisma.PrismaPromise<GetCanvasBackupAggregateType<T>>

    /**
     * Group by CanvasBackup.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CanvasBackupGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CanvasBackupGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CanvasBackupGroupByArgs['orderBy'] }
        : { orderBy?: CanvasBackupGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CanvasBackupGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCanvasBackupGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CanvasBackup model
   */
  readonly fields: CanvasBackupFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CanvasBackup.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CanvasBackupClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CanvasBackup model
   */
  interface CanvasBackupFieldRefs {
    readonly id: FieldRef<"CanvasBackup", 'String'>
    readonly userId: FieldRef<"CanvasBackup", 'String'>
    readonly type: FieldRef<"CanvasBackup", 'String'>
    readonly data: FieldRef<"CanvasBackup", 'Json'>
    readonly version: FieldRef<"CanvasBackup", 'Int'>
    readonly createdAt: FieldRef<"CanvasBackup", 'DateTime'>
    readonly updatedAt: FieldRef<"CanvasBackup", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CanvasBackup findUnique
   */
  export type CanvasBackupFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter, which CanvasBackup to fetch.
     */
    where: CanvasBackupWhereUniqueInput
  }

  /**
   * CanvasBackup findUniqueOrThrow
   */
  export type CanvasBackupFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter, which CanvasBackup to fetch.
     */
    where: CanvasBackupWhereUniqueInput
  }

  /**
   * CanvasBackup findFirst
   */
  export type CanvasBackupFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter, which CanvasBackup to fetch.
     */
    where?: CanvasBackupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CanvasBackups to fetch.
     */
    orderBy?: CanvasBackupOrderByWithRelationInput | CanvasBackupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CanvasBackups.
     */
    cursor?: CanvasBackupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CanvasBackups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CanvasBackups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CanvasBackups.
     */
    distinct?: CanvasBackupScalarFieldEnum | CanvasBackupScalarFieldEnum[]
  }

  /**
   * CanvasBackup findFirstOrThrow
   */
  export type CanvasBackupFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter, which CanvasBackup to fetch.
     */
    where?: CanvasBackupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CanvasBackups to fetch.
     */
    orderBy?: CanvasBackupOrderByWithRelationInput | CanvasBackupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CanvasBackups.
     */
    cursor?: CanvasBackupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CanvasBackups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CanvasBackups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CanvasBackups.
     */
    distinct?: CanvasBackupScalarFieldEnum | CanvasBackupScalarFieldEnum[]
  }

  /**
   * CanvasBackup findMany
   */
  export type CanvasBackupFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter, which CanvasBackups to fetch.
     */
    where?: CanvasBackupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CanvasBackups to fetch.
     */
    orderBy?: CanvasBackupOrderByWithRelationInput | CanvasBackupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CanvasBackups.
     */
    cursor?: CanvasBackupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CanvasBackups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CanvasBackups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CanvasBackups.
     */
    distinct?: CanvasBackupScalarFieldEnum | CanvasBackupScalarFieldEnum[]
  }

  /**
   * CanvasBackup create
   */
  export type CanvasBackupCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * The data needed to create a CanvasBackup.
     */
    data: XOR<CanvasBackupCreateInput, CanvasBackupUncheckedCreateInput>
  }

  /**
   * CanvasBackup createMany
   */
  export type CanvasBackupCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CanvasBackups.
     */
    data: CanvasBackupCreateManyInput | CanvasBackupCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CanvasBackup createManyAndReturn
   */
  export type CanvasBackupCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * The data used to create many CanvasBackups.
     */
    data: CanvasBackupCreateManyInput | CanvasBackupCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CanvasBackup update
   */
  export type CanvasBackupUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * The data needed to update a CanvasBackup.
     */
    data: XOR<CanvasBackupUpdateInput, CanvasBackupUncheckedUpdateInput>
    /**
     * Choose, which CanvasBackup to update.
     */
    where: CanvasBackupWhereUniqueInput
  }

  /**
   * CanvasBackup updateMany
   */
  export type CanvasBackupUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CanvasBackups.
     */
    data: XOR<CanvasBackupUpdateManyMutationInput, CanvasBackupUncheckedUpdateManyInput>
    /**
     * Filter which CanvasBackups to update
     */
    where?: CanvasBackupWhereInput
    /**
     * Limit how many CanvasBackups to update.
     */
    limit?: number
  }

  /**
   * CanvasBackup updateManyAndReturn
   */
  export type CanvasBackupUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * The data used to update CanvasBackups.
     */
    data: XOR<CanvasBackupUpdateManyMutationInput, CanvasBackupUncheckedUpdateManyInput>
    /**
     * Filter which CanvasBackups to update
     */
    where?: CanvasBackupWhereInput
    /**
     * Limit how many CanvasBackups to update.
     */
    limit?: number
  }

  /**
   * CanvasBackup upsert
   */
  export type CanvasBackupUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * The filter to search for the CanvasBackup to update in case it exists.
     */
    where: CanvasBackupWhereUniqueInput
    /**
     * In case the CanvasBackup found by the `where` argument doesn't exist, create a new CanvasBackup with this data.
     */
    create: XOR<CanvasBackupCreateInput, CanvasBackupUncheckedCreateInput>
    /**
     * In case the CanvasBackup was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CanvasBackupUpdateInput, CanvasBackupUncheckedUpdateInput>
  }

  /**
   * CanvasBackup delete
   */
  export type CanvasBackupDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
    /**
     * Filter which CanvasBackup to delete.
     */
    where: CanvasBackupWhereUniqueInput
  }

  /**
   * CanvasBackup deleteMany
   */
  export type CanvasBackupDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CanvasBackups to delete
     */
    where?: CanvasBackupWhereInput
    /**
     * Limit how many CanvasBackups to delete.
     */
    limit?: number
  }

  /**
   * CanvasBackup without action
   */
  export type CanvasBackupDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CanvasBackup
     */
    select?: CanvasBackupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CanvasBackup
     */
    omit?: CanvasBackupOmit<ExtArgs> | null
  }


  /**
   * Model RateLimitEntry
   */

  export type AggregateRateLimitEntry = {
    _count: RateLimitEntryCountAggregateOutputType | null
    _avg: RateLimitEntryAvgAggregateOutputType | null
    _sum: RateLimitEntrySumAggregateOutputType | null
    _min: RateLimitEntryMinAggregateOutputType | null
    _max: RateLimitEntryMaxAggregateOutputType | null
  }

  export type RateLimitEntryAvgAggregateOutputType = {
    count: number | null
  }

  export type RateLimitEntrySumAggregateOutputType = {
    count: number | null
  }

  export type RateLimitEntryMinAggregateOutputType = {
    id: string | null
    key: string | null
    count: number | null
    resetAt: Date | null
    updatedAt: Date | null
  }

  export type RateLimitEntryMaxAggregateOutputType = {
    id: string | null
    key: string | null
    count: number | null
    resetAt: Date | null
    updatedAt: Date | null
  }

  export type RateLimitEntryCountAggregateOutputType = {
    id: number
    key: number
    count: number
    resetAt: number
    updatedAt: number
    _all: number
  }


  export type RateLimitEntryAvgAggregateInputType = {
    count?: true
  }

  export type RateLimitEntrySumAggregateInputType = {
    count?: true
  }

  export type RateLimitEntryMinAggregateInputType = {
    id?: true
    key?: true
    count?: true
    resetAt?: true
    updatedAt?: true
  }

  export type RateLimitEntryMaxAggregateInputType = {
    id?: true
    key?: true
    count?: true
    resetAt?: true
    updatedAt?: true
  }

  export type RateLimitEntryCountAggregateInputType = {
    id?: true
    key?: true
    count?: true
    resetAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RateLimitEntryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RateLimitEntry to aggregate.
     */
    where?: RateLimitEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RateLimitEntries to fetch.
     */
    orderBy?: RateLimitEntryOrderByWithRelationInput | RateLimitEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RateLimitEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RateLimitEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RateLimitEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RateLimitEntries
    **/
    _count?: true | RateLimitEntryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RateLimitEntryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RateLimitEntrySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RateLimitEntryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RateLimitEntryMaxAggregateInputType
  }

  export type GetRateLimitEntryAggregateType<T extends RateLimitEntryAggregateArgs> = {
        [P in keyof T & keyof AggregateRateLimitEntry]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRateLimitEntry[P]>
      : GetScalarType<T[P], AggregateRateLimitEntry[P]>
  }




  export type RateLimitEntryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RateLimitEntryWhereInput
    orderBy?: RateLimitEntryOrderByWithAggregationInput | RateLimitEntryOrderByWithAggregationInput[]
    by: RateLimitEntryScalarFieldEnum[] | RateLimitEntryScalarFieldEnum
    having?: RateLimitEntryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RateLimitEntryCountAggregateInputType | true
    _avg?: RateLimitEntryAvgAggregateInputType
    _sum?: RateLimitEntrySumAggregateInputType
    _min?: RateLimitEntryMinAggregateInputType
    _max?: RateLimitEntryMaxAggregateInputType
  }

  export type RateLimitEntryGroupByOutputType = {
    id: string
    key: string
    count: number
    resetAt: Date
    updatedAt: Date
    _count: RateLimitEntryCountAggregateOutputType | null
    _avg: RateLimitEntryAvgAggregateOutputType | null
    _sum: RateLimitEntrySumAggregateOutputType | null
    _min: RateLimitEntryMinAggregateOutputType | null
    _max: RateLimitEntryMaxAggregateOutputType | null
  }

  type GetRateLimitEntryGroupByPayload<T extends RateLimitEntryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RateLimitEntryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RateLimitEntryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RateLimitEntryGroupByOutputType[P]>
            : GetScalarType<T[P], RateLimitEntryGroupByOutputType[P]>
        }
      >
    >


  export type RateLimitEntrySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    count?: boolean
    resetAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rateLimitEntry"]>

  export type RateLimitEntrySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    count?: boolean
    resetAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rateLimitEntry"]>

  export type RateLimitEntrySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    count?: boolean
    resetAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["rateLimitEntry"]>

  export type RateLimitEntrySelectScalar = {
    id?: boolean
    key?: boolean
    count?: boolean
    resetAt?: boolean
    updatedAt?: boolean
  }

  export type RateLimitEntryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "count" | "resetAt" | "updatedAt", ExtArgs["result"]["rateLimitEntry"]>

  export type $RateLimitEntryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RateLimitEntry"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      key: string
      count: number
      resetAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rateLimitEntry"]>
    composites: {}
  }

  type RateLimitEntryGetPayload<S extends boolean | null | undefined | RateLimitEntryDefaultArgs> = $Result.GetResult<Prisma.$RateLimitEntryPayload, S>

  type RateLimitEntryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RateLimitEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RateLimitEntryCountAggregateInputType | true
    }

  export interface RateLimitEntryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RateLimitEntry'], meta: { name: 'RateLimitEntry' } }
    /**
     * Find zero or one RateLimitEntry that matches the filter.
     * @param {RateLimitEntryFindUniqueArgs} args - Arguments to find a RateLimitEntry
     * @example
     * // Get one RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RateLimitEntryFindUniqueArgs>(args: SelectSubset<T, RateLimitEntryFindUniqueArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one RateLimitEntry that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RateLimitEntryFindUniqueOrThrowArgs} args - Arguments to find a RateLimitEntry
     * @example
     * // Get one RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RateLimitEntryFindUniqueOrThrowArgs>(args: SelectSubset<T, RateLimitEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RateLimitEntry that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryFindFirstArgs} args - Arguments to find a RateLimitEntry
     * @example
     * // Get one RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RateLimitEntryFindFirstArgs>(args?: SelectSubset<T, RateLimitEntryFindFirstArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first RateLimitEntry that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryFindFirstOrThrowArgs} args - Arguments to find a RateLimitEntry
     * @example
     * // Get one RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RateLimitEntryFindFirstOrThrowArgs>(args?: SelectSubset<T, RateLimitEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more RateLimitEntries that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RateLimitEntries
     * const rateLimitEntries = await prisma.rateLimitEntry.findMany()
     * 
     * // Get first 10 RateLimitEntries
     * const rateLimitEntries = await prisma.rateLimitEntry.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rateLimitEntryWithIdOnly = await prisma.rateLimitEntry.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RateLimitEntryFindManyArgs>(args?: SelectSubset<T, RateLimitEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a RateLimitEntry.
     * @param {RateLimitEntryCreateArgs} args - Arguments to create a RateLimitEntry.
     * @example
     * // Create one RateLimitEntry
     * const RateLimitEntry = await prisma.rateLimitEntry.create({
     *   data: {
     *     // ... data to create a RateLimitEntry
     *   }
     * })
     * 
     */
    create<T extends RateLimitEntryCreateArgs>(args: SelectSubset<T, RateLimitEntryCreateArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many RateLimitEntries.
     * @param {RateLimitEntryCreateManyArgs} args - Arguments to create many RateLimitEntries.
     * @example
     * // Create many RateLimitEntries
     * const rateLimitEntry = await prisma.rateLimitEntry.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RateLimitEntryCreateManyArgs>(args?: SelectSubset<T, RateLimitEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RateLimitEntries and returns the data saved in the database.
     * @param {RateLimitEntryCreateManyAndReturnArgs} args - Arguments to create many RateLimitEntries.
     * @example
     * // Create many RateLimitEntries
     * const rateLimitEntry = await prisma.rateLimitEntry.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RateLimitEntries and only return the `id`
     * const rateLimitEntryWithIdOnly = await prisma.rateLimitEntry.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RateLimitEntryCreateManyAndReturnArgs>(args?: SelectSubset<T, RateLimitEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a RateLimitEntry.
     * @param {RateLimitEntryDeleteArgs} args - Arguments to delete one RateLimitEntry.
     * @example
     * // Delete one RateLimitEntry
     * const RateLimitEntry = await prisma.rateLimitEntry.delete({
     *   where: {
     *     // ... filter to delete one RateLimitEntry
     *   }
     * })
     * 
     */
    delete<T extends RateLimitEntryDeleteArgs>(args: SelectSubset<T, RateLimitEntryDeleteArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one RateLimitEntry.
     * @param {RateLimitEntryUpdateArgs} args - Arguments to update one RateLimitEntry.
     * @example
     * // Update one RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RateLimitEntryUpdateArgs>(args: SelectSubset<T, RateLimitEntryUpdateArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more RateLimitEntries.
     * @param {RateLimitEntryDeleteManyArgs} args - Arguments to filter RateLimitEntries to delete.
     * @example
     * // Delete a few RateLimitEntries
     * const { count } = await prisma.rateLimitEntry.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RateLimitEntryDeleteManyArgs>(args?: SelectSubset<T, RateLimitEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RateLimitEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RateLimitEntries
     * const rateLimitEntry = await prisma.rateLimitEntry.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RateLimitEntryUpdateManyArgs>(args: SelectSubset<T, RateLimitEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RateLimitEntries and returns the data updated in the database.
     * @param {RateLimitEntryUpdateManyAndReturnArgs} args - Arguments to update many RateLimitEntries.
     * @example
     * // Update many RateLimitEntries
     * const rateLimitEntry = await prisma.rateLimitEntry.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more RateLimitEntries and only return the `id`
     * const rateLimitEntryWithIdOnly = await prisma.rateLimitEntry.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RateLimitEntryUpdateManyAndReturnArgs>(args: SelectSubset<T, RateLimitEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one RateLimitEntry.
     * @param {RateLimitEntryUpsertArgs} args - Arguments to update or create a RateLimitEntry.
     * @example
     * // Update or create a RateLimitEntry
     * const rateLimitEntry = await prisma.rateLimitEntry.upsert({
     *   create: {
     *     // ... data to create a RateLimitEntry
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RateLimitEntry we want to update
     *   }
     * })
     */
    upsert<T extends RateLimitEntryUpsertArgs>(args: SelectSubset<T, RateLimitEntryUpsertArgs<ExtArgs>>): Prisma__RateLimitEntryClient<$Result.GetResult<Prisma.$RateLimitEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of RateLimitEntries.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryCountArgs} args - Arguments to filter RateLimitEntries to count.
     * @example
     * // Count the number of RateLimitEntries
     * const count = await prisma.rateLimitEntry.count({
     *   where: {
     *     // ... the filter for the RateLimitEntries we want to count
     *   }
     * })
    **/
    count<T extends RateLimitEntryCountArgs>(
      args?: Subset<T, RateLimitEntryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RateLimitEntryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RateLimitEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RateLimitEntryAggregateArgs>(args: Subset<T, RateLimitEntryAggregateArgs>): Prisma.PrismaPromise<GetRateLimitEntryAggregateType<T>>

    /**
     * Group by RateLimitEntry.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RateLimitEntryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RateLimitEntryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RateLimitEntryGroupByArgs['orderBy'] }
        : { orderBy?: RateLimitEntryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RateLimitEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRateLimitEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RateLimitEntry model
   */
  readonly fields: RateLimitEntryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RateLimitEntry.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RateLimitEntryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RateLimitEntry model
   */
  interface RateLimitEntryFieldRefs {
    readonly id: FieldRef<"RateLimitEntry", 'String'>
    readonly key: FieldRef<"RateLimitEntry", 'String'>
    readonly count: FieldRef<"RateLimitEntry", 'Int'>
    readonly resetAt: FieldRef<"RateLimitEntry", 'DateTime'>
    readonly updatedAt: FieldRef<"RateLimitEntry", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RateLimitEntry findUnique
   */
  export type RateLimitEntryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter, which RateLimitEntry to fetch.
     */
    where: RateLimitEntryWhereUniqueInput
  }

  /**
   * RateLimitEntry findUniqueOrThrow
   */
  export type RateLimitEntryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter, which RateLimitEntry to fetch.
     */
    where: RateLimitEntryWhereUniqueInput
  }

  /**
   * RateLimitEntry findFirst
   */
  export type RateLimitEntryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter, which RateLimitEntry to fetch.
     */
    where?: RateLimitEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RateLimitEntries to fetch.
     */
    orderBy?: RateLimitEntryOrderByWithRelationInput | RateLimitEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RateLimitEntries.
     */
    cursor?: RateLimitEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RateLimitEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RateLimitEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RateLimitEntries.
     */
    distinct?: RateLimitEntryScalarFieldEnum | RateLimitEntryScalarFieldEnum[]
  }

  /**
   * RateLimitEntry findFirstOrThrow
   */
  export type RateLimitEntryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter, which RateLimitEntry to fetch.
     */
    where?: RateLimitEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RateLimitEntries to fetch.
     */
    orderBy?: RateLimitEntryOrderByWithRelationInput | RateLimitEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RateLimitEntries.
     */
    cursor?: RateLimitEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RateLimitEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RateLimitEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RateLimitEntries.
     */
    distinct?: RateLimitEntryScalarFieldEnum | RateLimitEntryScalarFieldEnum[]
  }

  /**
   * RateLimitEntry findMany
   */
  export type RateLimitEntryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter, which RateLimitEntries to fetch.
     */
    where?: RateLimitEntryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RateLimitEntries to fetch.
     */
    orderBy?: RateLimitEntryOrderByWithRelationInput | RateLimitEntryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RateLimitEntries.
     */
    cursor?: RateLimitEntryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RateLimitEntries from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RateLimitEntries.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RateLimitEntries.
     */
    distinct?: RateLimitEntryScalarFieldEnum | RateLimitEntryScalarFieldEnum[]
  }

  /**
   * RateLimitEntry create
   */
  export type RateLimitEntryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * The data needed to create a RateLimitEntry.
     */
    data: XOR<RateLimitEntryCreateInput, RateLimitEntryUncheckedCreateInput>
  }

  /**
   * RateLimitEntry createMany
   */
  export type RateLimitEntryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RateLimitEntries.
     */
    data: RateLimitEntryCreateManyInput | RateLimitEntryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RateLimitEntry createManyAndReturn
   */
  export type RateLimitEntryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * The data used to create many RateLimitEntries.
     */
    data: RateLimitEntryCreateManyInput | RateLimitEntryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RateLimitEntry update
   */
  export type RateLimitEntryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * The data needed to update a RateLimitEntry.
     */
    data: XOR<RateLimitEntryUpdateInput, RateLimitEntryUncheckedUpdateInput>
    /**
     * Choose, which RateLimitEntry to update.
     */
    where: RateLimitEntryWhereUniqueInput
  }

  /**
   * RateLimitEntry updateMany
   */
  export type RateLimitEntryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RateLimitEntries.
     */
    data: XOR<RateLimitEntryUpdateManyMutationInput, RateLimitEntryUncheckedUpdateManyInput>
    /**
     * Filter which RateLimitEntries to update
     */
    where?: RateLimitEntryWhereInput
    /**
     * Limit how many RateLimitEntries to update.
     */
    limit?: number
  }

  /**
   * RateLimitEntry updateManyAndReturn
   */
  export type RateLimitEntryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * The data used to update RateLimitEntries.
     */
    data: XOR<RateLimitEntryUpdateManyMutationInput, RateLimitEntryUncheckedUpdateManyInput>
    /**
     * Filter which RateLimitEntries to update
     */
    where?: RateLimitEntryWhereInput
    /**
     * Limit how many RateLimitEntries to update.
     */
    limit?: number
  }

  /**
   * RateLimitEntry upsert
   */
  export type RateLimitEntryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * The filter to search for the RateLimitEntry to update in case it exists.
     */
    where: RateLimitEntryWhereUniqueInput
    /**
     * In case the RateLimitEntry found by the `where` argument doesn't exist, create a new RateLimitEntry with this data.
     */
    create: XOR<RateLimitEntryCreateInput, RateLimitEntryUncheckedCreateInput>
    /**
     * In case the RateLimitEntry was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RateLimitEntryUpdateInput, RateLimitEntryUncheckedUpdateInput>
  }

  /**
   * RateLimitEntry delete
   */
  export type RateLimitEntryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
    /**
     * Filter which RateLimitEntry to delete.
     */
    where: RateLimitEntryWhereUniqueInput
  }

  /**
   * RateLimitEntry deleteMany
   */
  export type RateLimitEntryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RateLimitEntries to delete
     */
    where?: RateLimitEntryWhereInput
    /**
     * Limit how many RateLimitEntries to delete.
     */
    limit?: number
  }

  /**
   * RateLimitEntry without action
   */
  export type RateLimitEntryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RateLimitEntry
     */
    select?: RateLimitEntrySelect<ExtArgs> | null
    /**
     * Omit specific fields from the RateLimitEntry
     */
    omit?: RateLimitEntryOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    name: 'name',
    password: 'password',
    phone: 'phone',
    emailVerified: 'emailVerified',
    phoneVerified: 'phoneVerified',
    avatarUrl: 'avatarUrl',
    githubId: 'githubId',
    role: 'role',
    bannedAt: 'bannedAt',
    banReason: 'banReason',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const PlanScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    monthlyPrice: 'monthlyPrice',
    yearlyPrice: 'yearlyPrice',
    currency: 'currency',
    sortOrder: 'sortOrder',
    isActive: 'isActive',
    isPopular: 'isPopular',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PlanScalarFieldEnum = (typeof PlanScalarFieldEnum)[keyof typeof PlanScalarFieldEnum]


  export const EntitlementScalarFieldEnum: {
    id: 'id',
    planId: 'planId',
    key: 'key',
    label: 'label',
    value: 'value',
    unit: 'unit',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type EntitlementScalarFieldEnum = (typeof EntitlementScalarFieldEnum)[keyof typeof EntitlementScalarFieldEnum]


  export const SubscriptionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    planId: 'planId',
    status: 'status',
    billingCycle: 'billingCycle',
    currentPeriodStart: 'currentPeriodStart',
    currentPeriodEnd: 'currentPeriodEnd',
    cancelAtPeriodEnd: 'cancelAtPeriodEnd',
    autoRenew: 'autoRenew',
    provider: 'provider',
    providerSubId: 'providerSubId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SubscriptionScalarFieldEnum = (typeof SubscriptionScalarFieldEnum)[keyof typeof SubscriptionScalarFieldEnum]


  export const UsageRecordScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    metric: 'metric',
    used: 'used',
    limit: 'limit',
    period: 'period',
    resetAt: 'resetAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UsageRecordScalarFieldEnum = (typeof UsageRecordScalarFieldEnum)[keyof typeof UsageRecordScalarFieldEnum]


  export const GenerationJobScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    requestKey: 'requestKey',
    kind: 'kind',
    count: 'count',
    status: 'status',
    error: 'error',
    metadata: 'metadata',
    quotaRefunded: 'quotaRefunded',
    startedAt: 'startedAt',
    finishedAt: 'finishedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type GenerationJobScalarFieldEnum = (typeof GenerationJobScalarFieldEnum)[keyof typeof GenerationJobScalarFieldEnum]


  export const OrderScalarFieldEnum: {
    id: 'id',
    orderNo: 'orderNo',
    userId: 'userId',
    planId: 'planId',
    amount: 'amount',
    currency: 'currency',
    status: 'status',
    provider: 'provider',
    billingCycle: 'billingCycle',
    providerOrderNo: 'providerOrderNo',
    paidAt: 'paidAt',
    metadata: 'metadata',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OrderScalarFieldEnum = (typeof OrderScalarFieldEnum)[keyof typeof OrderScalarFieldEnum]


  export const PaymentEventScalarFieldEnum: {
    id: 'id',
    orderId: 'orderId',
    provider: 'provider',
    eventType: 'eventType',
    providerEventId: 'providerEventId',
    payload: 'payload',
    createdAt: 'createdAt'
  };

  export type PaymentEventScalarFieldEnum = (typeof PaymentEventScalarFieldEnum)[keyof typeof PaymentEventScalarFieldEnum]


  export const AdminAuditLogScalarFieldEnum: {
    id: 'id',
    actorId: 'actorId',
    action: 'action',
    target: 'target',
    targetId: 'targetId',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type AdminAuditLogScalarFieldEnum = (typeof AdminAuditLogScalarFieldEnum)[keyof typeof AdminAuditLogScalarFieldEnum]


  export const ModelConfigScalarFieldEnum: {
    id: 'id',
    provider: 'provider',
    model: 'model',
    displayName: 'displayName',
    type: 'type',
    enabled: 'enabled',
    isDefault: 'isDefault',
    params: 'params',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ModelConfigScalarFieldEnum = (typeof ModelConfigScalarFieldEnum)[keyof typeof ModelConfigScalarFieldEnum]


  export const OperationConfigScalarFieldEnum: {
    id: 'id',
    key: 'key',
    value: 'value',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OperationConfigScalarFieldEnum = (typeof OperationConfigScalarFieldEnum)[keyof typeof OperationConfigScalarFieldEnum]


  export const VerificationCodeScalarFieldEnum: {
    id: 'id',
    target: 'target',
    method: 'method',
    code: 'code',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
  };

  export type VerificationCodeScalarFieldEnum = (typeof VerificationCodeScalarFieldEnum)[keyof typeof VerificationCodeScalarFieldEnum]


  export const CanvasBackupScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    type: 'type',
    data: 'data',
    version: 'version',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CanvasBackupScalarFieldEnum = (typeof CanvasBackupScalarFieldEnum)[keyof typeof CanvasBackupScalarFieldEnum]


  export const RateLimitEntryScalarFieldEnum: {
    id: 'id',
    key: 'key',
    count: 'count',
    resetAt: 'resetAt',
    updatedAt: 'updatedAt'
  };

  export type RateLimitEntryScalarFieldEnum = (typeof RateLimitEntryScalarFieldEnum)[keyof typeof RateLimitEntryScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    phoneVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    avatarUrl?: StringNullableFilter<"User"> | string | null
    githubId?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    bannedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    banReason?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    subscriptions?: SubscriptionListRelationFilter
    orders?: OrderListRelationFilter
    usageRecords?: UsageRecordListRelationFilter
    generationJobs?: GenerationJobListRelationFilter
    auditLogs?: AdminAuditLogListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    password?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    emailVerified?: SortOrderInput | SortOrder
    phoneVerified?: SortOrderInput | SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    githubId?: SortOrderInput | SortOrder
    role?: SortOrder
    bannedAt?: SortOrderInput | SortOrder
    banReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    subscriptions?: SubscriptionOrderByRelationAggregateInput
    orders?: OrderOrderByRelationAggregateInput
    usageRecords?: UsageRecordOrderByRelationAggregateInput
    generationJobs?: GenerationJobOrderByRelationAggregateInput
    auditLogs?: AdminAuditLogOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    githubId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    phoneVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    avatarUrl?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    bannedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    banReason?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    subscriptions?: SubscriptionListRelationFilter
    orders?: OrderListRelationFilter
    usageRecords?: UsageRecordListRelationFilter
    generationJobs?: GenerationJobListRelationFilter
    auditLogs?: AdminAuditLogListRelationFilter
  }, "id" | "email" | "githubId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    password?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    emailVerified?: SortOrderInput | SortOrder
    phoneVerified?: SortOrderInput | SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    githubId?: SortOrderInput | SortOrder
    role?: SortOrder
    bannedAt?: SortOrderInput | SortOrder
    banReason?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    password?: StringNullableWithAggregatesFilter<"User"> | string | null
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    emailVerified?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    phoneVerified?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    avatarUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    githubId?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: StringWithAggregatesFilter<"User"> | string
    bannedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    banReason?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type PlanWhereInput = {
    AND?: PlanWhereInput | PlanWhereInput[]
    OR?: PlanWhereInput[]
    NOT?: PlanWhereInput | PlanWhereInput[]
    id?: StringFilter<"Plan"> | string
    name?: StringFilter<"Plan"> | string
    description?: StringFilter<"Plan"> | string
    monthlyPrice?: IntFilter<"Plan"> | number
    yearlyPrice?: IntFilter<"Plan"> | number
    currency?: StringFilter<"Plan"> | string
    sortOrder?: IntFilter<"Plan"> | number
    isActive?: BoolFilter<"Plan"> | boolean
    isPopular?: BoolFilter<"Plan"> | boolean
    createdAt?: DateTimeFilter<"Plan"> | Date | string
    updatedAt?: DateTimeFilter<"Plan"> | Date | string
    entitlements?: EntitlementListRelationFilter
    subscriptions?: SubscriptionListRelationFilter
    orders?: OrderListRelationFilter
  }

  export type PlanOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    currency?: SortOrder
    sortOrder?: SortOrder
    isActive?: SortOrder
    isPopular?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    entitlements?: EntitlementOrderByRelationAggregateInput
    subscriptions?: SubscriptionOrderByRelationAggregateInput
    orders?: OrderOrderByRelationAggregateInput
  }

  export type PlanWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PlanWhereInput | PlanWhereInput[]
    OR?: PlanWhereInput[]
    NOT?: PlanWhereInput | PlanWhereInput[]
    name?: StringFilter<"Plan"> | string
    description?: StringFilter<"Plan"> | string
    monthlyPrice?: IntFilter<"Plan"> | number
    yearlyPrice?: IntFilter<"Plan"> | number
    currency?: StringFilter<"Plan"> | string
    sortOrder?: IntFilter<"Plan"> | number
    isActive?: BoolFilter<"Plan"> | boolean
    isPopular?: BoolFilter<"Plan"> | boolean
    createdAt?: DateTimeFilter<"Plan"> | Date | string
    updatedAt?: DateTimeFilter<"Plan"> | Date | string
    entitlements?: EntitlementListRelationFilter
    subscriptions?: SubscriptionListRelationFilter
    orders?: OrderListRelationFilter
  }, "id">

  export type PlanOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    currency?: SortOrder
    sortOrder?: SortOrder
    isActive?: SortOrder
    isPopular?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PlanCountOrderByAggregateInput
    _avg?: PlanAvgOrderByAggregateInput
    _max?: PlanMaxOrderByAggregateInput
    _min?: PlanMinOrderByAggregateInput
    _sum?: PlanSumOrderByAggregateInput
  }

  export type PlanScalarWhereWithAggregatesInput = {
    AND?: PlanScalarWhereWithAggregatesInput | PlanScalarWhereWithAggregatesInput[]
    OR?: PlanScalarWhereWithAggregatesInput[]
    NOT?: PlanScalarWhereWithAggregatesInput | PlanScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Plan"> | string
    name?: StringWithAggregatesFilter<"Plan"> | string
    description?: StringWithAggregatesFilter<"Plan"> | string
    monthlyPrice?: IntWithAggregatesFilter<"Plan"> | number
    yearlyPrice?: IntWithAggregatesFilter<"Plan"> | number
    currency?: StringWithAggregatesFilter<"Plan"> | string
    sortOrder?: IntWithAggregatesFilter<"Plan"> | number
    isActive?: BoolWithAggregatesFilter<"Plan"> | boolean
    isPopular?: BoolWithAggregatesFilter<"Plan"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Plan"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Plan"> | Date | string
  }

  export type EntitlementWhereInput = {
    AND?: EntitlementWhereInput | EntitlementWhereInput[]
    OR?: EntitlementWhereInput[]
    NOT?: EntitlementWhereInput | EntitlementWhereInput[]
    id?: StringFilter<"Entitlement"> | string
    planId?: StringFilter<"Entitlement"> | string
    key?: StringFilter<"Entitlement"> | string
    label?: StringFilter<"Entitlement"> | string
    value?: StringFilter<"Entitlement"> | string
    unit?: StringFilter<"Entitlement"> | string
    description?: StringFilter<"Entitlement"> | string
    createdAt?: DateTimeFilter<"Entitlement"> | Date | string
    updatedAt?: DateTimeFilter<"Entitlement"> | Date | string
    plan?: XOR<PlanScalarRelationFilter, PlanWhereInput>
  }

  export type EntitlementOrderByWithRelationInput = {
    id?: SortOrder
    planId?: SortOrder
    key?: SortOrder
    label?: SortOrder
    value?: SortOrder
    unit?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    plan?: PlanOrderByWithRelationInput
  }

  export type EntitlementWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    planId_key?: EntitlementPlanIdKeyCompoundUniqueInput
    AND?: EntitlementWhereInput | EntitlementWhereInput[]
    OR?: EntitlementWhereInput[]
    NOT?: EntitlementWhereInput | EntitlementWhereInput[]
    planId?: StringFilter<"Entitlement"> | string
    key?: StringFilter<"Entitlement"> | string
    label?: StringFilter<"Entitlement"> | string
    value?: StringFilter<"Entitlement"> | string
    unit?: StringFilter<"Entitlement"> | string
    description?: StringFilter<"Entitlement"> | string
    createdAt?: DateTimeFilter<"Entitlement"> | Date | string
    updatedAt?: DateTimeFilter<"Entitlement"> | Date | string
    plan?: XOR<PlanScalarRelationFilter, PlanWhereInput>
  }, "id" | "planId_key">

  export type EntitlementOrderByWithAggregationInput = {
    id?: SortOrder
    planId?: SortOrder
    key?: SortOrder
    label?: SortOrder
    value?: SortOrder
    unit?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: EntitlementCountOrderByAggregateInput
    _max?: EntitlementMaxOrderByAggregateInput
    _min?: EntitlementMinOrderByAggregateInput
  }

  export type EntitlementScalarWhereWithAggregatesInput = {
    AND?: EntitlementScalarWhereWithAggregatesInput | EntitlementScalarWhereWithAggregatesInput[]
    OR?: EntitlementScalarWhereWithAggregatesInput[]
    NOT?: EntitlementScalarWhereWithAggregatesInput | EntitlementScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Entitlement"> | string
    planId?: StringWithAggregatesFilter<"Entitlement"> | string
    key?: StringWithAggregatesFilter<"Entitlement"> | string
    label?: StringWithAggregatesFilter<"Entitlement"> | string
    value?: StringWithAggregatesFilter<"Entitlement"> | string
    unit?: StringWithAggregatesFilter<"Entitlement"> | string
    description?: StringWithAggregatesFilter<"Entitlement"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Entitlement"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Entitlement"> | Date | string
  }

  export type SubscriptionWhereInput = {
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    id?: StringFilter<"Subscription"> | string
    userId?: StringFilter<"Subscription"> | string
    planId?: StringFilter<"Subscription"> | string
    status?: StringFilter<"Subscription"> | string
    billingCycle?: StringFilter<"Subscription"> | string
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    autoRenew?: BoolFilter<"Subscription"> | boolean
    provider?: StringFilter<"Subscription"> | string
    providerSubId?: StringNullableFilter<"Subscription"> | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    plan?: XOR<PlanNullableScalarRelationFilter, PlanWhereInput> | null
  }

  export type SubscriptionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingCycle?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrderInput | SortOrder
    cancelAtPeriodEnd?: SortOrder
    autoRenew?: SortOrder
    provider?: SortOrder
    providerSubId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    plan?: PlanOrderByWithRelationInput
  }

  export type SubscriptionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    userId?: StringFilter<"Subscription"> | string
    planId?: StringFilter<"Subscription"> | string
    status?: StringFilter<"Subscription"> | string
    billingCycle?: StringFilter<"Subscription"> | string
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    autoRenew?: BoolFilter<"Subscription"> | boolean
    provider?: StringFilter<"Subscription"> | string
    providerSubId?: StringNullableFilter<"Subscription"> | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    plan?: XOR<PlanNullableScalarRelationFilter, PlanWhereInput> | null
  }, "id">

  export type SubscriptionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingCycle?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrderInput | SortOrder
    cancelAtPeriodEnd?: SortOrder
    autoRenew?: SortOrder
    provider?: SortOrder
    providerSubId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubscriptionCountOrderByAggregateInput
    _max?: SubscriptionMaxOrderByAggregateInput
    _min?: SubscriptionMinOrderByAggregateInput
  }

  export type SubscriptionScalarWhereWithAggregatesInput = {
    AND?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    OR?: SubscriptionScalarWhereWithAggregatesInput[]
    NOT?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Subscription"> | string
    userId?: StringWithAggregatesFilter<"Subscription"> | string
    planId?: StringWithAggregatesFilter<"Subscription"> | string
    status?: StringWithAggregatesFilter<"Subscription"> | string
    billingCycle?: StringWithAggregatesFilter<"Subscription"> | string
    currentPeriodStart?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeNullableWithAggregatesFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolWithAggregatesFilter<"Subscription"> | boolean
    autoRenew?: BoolWithAggregatesFilter<"Subscription"> | boolean
    provider?: StringWithAggregatesFilter<"Subscription"> | string
    providerSubId?: StringNullableWithAggregatesFilter<"Subscription"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
  }

  export type UsageRecordWhereInput = {
    AND?: UsageRecordWhereInput | UsageRecordWhereInput[]
    OR?: UsageRecordWhereInput[]
    NOT?: UsageRecordWhereInput | UsageRecordWhereInput[]
    id?: StringFilter<"UsageRecord"> | string
    userId?: StringFilter<"UsageRecord"> | string
    metric?: StringFilter<"UsageRecord"> | string
    used?: IntFilter<"UsageRecord"> | number
    limit?: IntNullableFilter<"UsageRecord"> | number | null
    period?: StringFilter<"UsageRecord"> | string
    resetAt?: DateTimeNullableFilter<"UsageRecord"> | Date | string | null
    createdAt?: DateTimeFilter<"UsageRecord"> | Date | string
    updatedAt?: DateTimeFilter<"UsageRecord"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UsageRecordOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    metric?: SortOrder
    used?: SortOrder
    limit?: SortOrderInput | SortOrder
    period?: SortOrder
    resetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UsageRecordWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_metric_period?: UsageRecordUserIdMetricPeriodCompoundUniqueInput
    AND?: UsageRecordWhereInput | UsageRecordWhereInput[]
    OR?: UsageRecordWhereInput[]
    NOT?: UsageRecordWhereInput | UsageRecordWhereInput[]
    userId?: StringFilter<"UsageRecord"> | string
    metric?: StringFilter<"UsageRecord"> | string
    used?: IntFilter<"UsageRecord"> | number
    limit?: IntNullableFilter<"UsageRecord"> | number | null
    period?: StringFilter<"UsageRecord"> | string
    resetAt?: DateTimeNullableFilter<"UsageRecord"> | Date | string | null
    createdAt?: DateTimeFilter<"UsageRecord"> | Date | string
    updatedAt?: DateTimeFilter<"UsageRecord"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "userId_metric_period">

  export type UsageRecordOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    metric?: SortOrder
    used?: SortOrder
    limit?: SortOrderInput | SortOrder
    period?: SortOrder
    resetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UsageRecordCountOrderByAggregateInput
    _avg?: UsageRecordAvgOrderByAggregateInput
    _max?: UsageRecordMaxOrderByAggregateInput
    _min?: UsageRecordMinOrderByAggregateInput
    _sum?: UsageRecordSumOrderByAggregateInput
  }

  export type UsageRecordScalarWhereWithAggregatesInput = {
    AND?: UsageRecordScalarWhereWithAggregatesInput | UsageRecordScalarWhereWithAggregatesInput[]
    OR?: UsageRecordScalarWhereWithAggregatesInput[]
    NOT?: UsageRecordScalarWhereWithAggregatesInput | UsageRecordScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"UsageRecord"> | string
    userId?: StringWithAggregatesFilter<"UsageRecord"> | string
    metric?: StringWithAggregatesFilter<"UsageRecord"> | string
    used?: IntWithAggregatesFilter<"UsageRecord"> | number
    limit?: IntNullableWithAggregatesFilter<"UsageRecord"> | number | null
    period?: StringWithAggregatesFilter<"UsageRecord"> | string
    resetAt?: DateTimeNullableWithAggregatesFilter<"UsageRecord"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UsageRecord"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UsageRecord"> | Date | string
  }

  export type GenerationJobWhereInput = {
    AND?: GenerationJobWhereInput | GenerationJobWhereInput[]
    OR?: GenerationJobWhereInput[]
    NOT?: GenerationJobWhereInput | GenerationJobWhereInput[]
    id?: StringFilter<"GenerationJob"> | string
    userId?: StringFilter<"GenerationJob"> | string
    requestKey?: StringFilter<"GenerationJob"> | string
    kind?: StringFilter<"GenerationJob"> | string
    count?: IntFilter<"GenerationJob"> | number
    status?: StringFilter<"GenerationJob"> | string
    error?: StringNullableFilter<"GenerationJob"> | string | null
    metadata?: JsonNullableFilter<"GenerationJob">
    quotaRefunded?: BoolFilter<"GenerationJob"> | boolean
    startedAt?: DateTimeFilter<"GenerationJob"> | Date | string
    finishedAt?: DateTimeNullableFilter<"GenerationJob"> | Date | string | null
    createdAt?: DateTimeFilter<"GenerationJob"> | Date | string
    updatedAt?: DateTimeFilter<"GenerationJob"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type GenerationJobOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    requestKey?: SortOrder
    kind?: SortOrder
    count?: SortOrder
    status?: SortOrder
    error?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    quotaRefunded?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type GenerationJobWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    requestKey?: string
    AND?: GenerationJobWhereInput | GenerationJobWhereInput[]
    OR?: GenerationJobWhereInput[]
    NOT?: GenerationJobWhereInput | GenerationJobWhereInput[]
    userId?: StringFilter<"GenerationJob"> | string
    kind?: StringFilter<"GenerationJob"> | string
    count?: IntFilter<"GenerationJob"> | number
    status?: StringFilter<"GenerationJob"> | string
    error?: StringNullableFilter<"GenerationJob"> | string | null
    metadata?: JsonNullableFilter<"GenerationJob">
    quotaRefunded?: BoolFilter<"GenerationJob"> | boolean
    startedAt?: DateTimeFilter<"GenerationJob"> | Date | string
    finishedAt?: DateTimeNullableFilter<"GenerationJob"> | Date | string | null
    createdAt?: DateTimeFilter<"GenerationJob"> | Date | string
    updatedAt?: DateTimeFilter<"GenerationJob"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "requestKey">

  export type GenerationJobOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    requestKey?: SortOrder
    kind?: SortOrder
    count?: SortOrder
    status?: SortOrder
    error?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    quotaRefunded?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: GenerationJobCountOrderByAggregateInput
    _avg?: GenerationJobAvgOrderByAggregateInput
    _max?: GenerationJobMaxOrderByAggregateInput
    _min?: GenerationJobMinOrderByAggregateInput
    _sum?: GenerationJobSumOrderByAggregateInput
  }

  export type GenerationJobScalarWhereWithAggregatesInput = {
    AND?: GenerationJobScalarWhereWithAggregatesInput | GenerationJobScalarWhereWithAggregatesInput[]
    OR?: GenerationJobScalarWhereWithAggregatesInput[]
    NOT?: GenerationJobScalarWhereWithAggregatesInput | GenerationJobScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"GenerationJob"> | string
    userId?: StringWithAggregatesFilter<"GenerationJob"> | string
    requestKey?: StringWithAggregatesFilter<"GenerationJob"> | string
    kind?: StringWithAggregatesFilter<"GenerationJob"> | string
    count?: IntWithAggregatesFilter<"GenerationJob"> | number
    status?: StringWithAggregatesFilter<"GenerationJob"> | string
    error?: StringNullableWithAggregatesFilter<"GenerationJob"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"GenerationJob">
    quotaRefunded?: BoolWithAggregatesFilter<"GenerationJob"> | boolean
    startedAt?: DateTimeWithAggregatesFilter<"GenerationJob"> | Date | string
    finishedAt?: DateTimeNullableWithAggregatesFilter<"GenerationJob"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"GenerationJob"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"GenerationJob"> | Date | string
  }

  export type OrderWhereInput = {
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    id?: StringFilter<"Order"> | string
    orderNo?: StringFilter<"Order"> | string
    userId?: StringFilter<"Order"> | string
    planId?: StringFilter<"Order"> | string
    amount?: IntFilter<"Order"> | number
    currency?: StringFilter<"Order"> | string
    status?: StringFilter<"Order"> | string
    provider?: StringFilter<"Order"> | string
    billingCycle?: StringFilter<"Order"> | string
    providerOrderNo?: StringNullableFilter<"Order"> | string | null
    paidAt?: DateTimeNullableFilter<"Order"> | Date | string | null
    metadata?: JsonNullableFilter<"Order">
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    plan?: XOR<PlanScalarRelationFilter, PlanWhereInput>
    paymentEvents?: PaymentEventListRelationFilter
  }

  export type OrderOrderByWithRelationInput = {
    id?: SortOrder
    orderNo?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    provider?: SortOrder
    billingCycle?: SortOrder
    providerOrderNo?: SortOrderInput | SortOrder
    paidAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    plan?: PlanOrderByWithRelationInput
    paymentEvents?: PaymentEventOrderByRelationAggregateInput
  }

  export type OrderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    orderNo?: string
    AND?: OrderWhereInput | OrderWhereInput[]
    OR?: OrderWhereInput[]
    NOT?: OrderWhereInput | OrderWhereInput[]
    userId?: StringFilter<"Order"> | string
    planId?: StringFilter<"Order"> | string
    amount?: IntFilter<"Order"> | number
    currency?: StringFilter<"Order"> | string
    status?: StringFilter<"Order"> | string
    provider?: StringFilter<"Order"> | string
    billingCycle?: StringFilter<"Order"> | string
    providerOrderNo?: StringNullableFilter<"Order"> | string | null
    paidAt?: DateTimeNullableFilter<"Order"> | Date | string | null
    metadata?: JsonNullableFilter<"Order">
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    plan?: XOR<PlanScalarRelationFilter, PlanWhereInput>
    paymentEvents?: PaymentEventListRelationFilter
  }, "id" | "orderNo">

  export type OrderOrderByWithAggregationInput = {
    id?: SortOrder
    orderNo?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    provider?: SortOrder
    billingCycle?: SortOrder
    providerOrderNo?: SortOrderInput | SortOrder
    paidAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OrderCountOrderByAggregateInput
    _avg?: OrderAvgOrderByAggregateInput
    _max?: OrderMaxOrderByAggregateInput
    _min?: OrderMinOrderByAggregateInput
    _sum?: OrderSumOrderByAggregateInput
  }

  export type OrderScalarWhereWithAggregatesInput = {
    AND?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    OR?: OrderScalarWhereWithAggregatesInput[]
    NOT?: OrderScalarWhereWithAggregatesInput | OrderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Order"> | string
    orderNo?: StringWithAggregatesFilter<"Order"> | string
    userId?: StringWithAggregatesFilter<"Order"> | string
    planId?: StringWithAggregatesFilter<"Order"> | string
    amount?: IntWithAggregatesFilter<"Order"> | number
    currency?: StringWithAggregatesFilter<"Order"> | string
    status?: StringWithAggregatesFilter<"Order"> | string
    provider?: StringWithAggregatesFilter<"Order"> | string
    billingCycle?: StringWithAggregatesFilter<"Order"> | string
    providerOrderNo?: StringNullableWithAggregatesFilter<"Order"> | string | null
    paidAt?: DateTimeNullableWithAggregatesFilter<"Order"> | Date | string | null
    metadata?: JsonNullableWithAggregatesFilter<"Order">
    createdAt?: DateTimeWithAggregatesFilter<"Order"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Order"> | Date | string
  }

  export type PaymentEventWhereInput = {
    AND?: PaymentEventWhereInput | PaymentEventWhereInput[]
    OR?: PaymentEventWhereInput[]
    NOT?: PaymentEventWhereInput | PaymentEventWhereInput[]
    id?: StringFilter<"PaymentEvent"> | string
    orderId?: StringFilter<"PaymentEvent"> | string
    provider?: StringFilter<"PaymentEvent"> | string
    eventType?: StringFilter<"PaymentEvent"> | string
    providerEventId?: StringNullableFilter<"PaymentEvent"> | string | null
    payload?: JsonNullableFilter<"PaymentEvent">
    createdAt?: DateTimeFilter<"PaymentEvent"> | Date | string
    order?: XOR<OrderScalarRelationFilter, OrderWhereInput>
  }

  export type PaymentEventOrderByWithRelationInput = {
    id?: SortOrder
    orderId?: SortOrder
    provider?: SortOrder
    eventType?: SortOrder
    providerEventId?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    order?: OrderOrderByWithRelationInput
  }

  export type PaymentEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PaymentEventWhereInput | PaymentEventWhereInput[]
    OR?: PaymentEventWhereInput[]
    NOT?: PaymentEventWhereInput | PaymentEventWhereInput[]
    orderId?: StringFilter<"PaymentEvent"> | string
    provider?: StringFilter<"PaymentEvent"> | string
    eventType?: StringFilter<"PaymentEvent"> | string
    providerEventId?: StringNullableFilter<"PaymentEvent"> | string | null
    payload?: JsonNullableFilter<"PaymentEvent">
    createdAt?: DateTimeFilter<"PaymentEvent"> | Date | string
    order?: XOR<OrderScalarRelationFilter, OrderWhereInput>
  }, "id">

  export type PaymentEventOrderByWithAggregationInput = {
    id?: SortOrder
    orderId?: SortOrder
    provider?: SortOrder
    eventType?: SortOrder
    providerEventId?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: PaymentEventCountOrderByAggregateInput
    _max?: PaymentEventMaxOrderByAggregateInput
    _min?: PaymentEventMinOrderByAggregateInput
  }

  export type PaymentEventScalarWhereWithAggregatesInput = {
    AND?: PaymentEventScalarWhereWithAggregatesInput | PaymentEventScalarWhereWithAggregatesInput[]
    OR?: PaymentEventScalarWhereWithAggregatesInput[]
    NOT?: PaymentEventScalarWhereWithAggregatesInput | PaymentEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PaymentEvent"> | string
    orderId?: StringWithAggregatesFilter<"PaymentEvent"> | string
    provider?: StringWithAggregatesFilter<"PaymentEvent"> | string
    eventType?: StringWithAggregatesFilter<"PaymentEvent"> | string
    providerEventId?: StringNullableWithAggregatesFilter<"PaymentEvent"> | string | null
    payload?: JsonNullableWithAggregatesFilter<"PaymentEvent">
    createdAt?: DateTimeWithAggregatesFilter<"PaymentEvent"> | Date | string
  }

  export type AdminAuditLogWhereInput = {
    AND?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    OR?: AdminAuditLogWhereInput[]
    NOT?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    id?: StringFilter<"AdminAuditLog"> | string
    actorId?: StringNullableFilter<"AdminAuditLog"> | string | null
    action?: StringFilter<"AdminAuditLog"> | string
    target?: StringFilter<"AdminAuditLog"> | string
    targetId?: StringNullableFilter<"AdminAuditLog"> | string | null
    metadata?: JsonNullableFilter<"AdminAuditLog">
    createdAt?: DateTimeFilter<"AdminAuditLog"> | Date | string
    actor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type AdminAuditLogOrderByWithRelationInput = {
    id?: SortOrder
    actorId?: SortOrderInput | SortOrder
    action?: SortOrder
    target?: SortOrder
    targetId?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    actor?: UserOrderByWithRelationInput
  }

  export type AdminAuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    OR?: AdminAuditLogWhereInput[]
    NOT?: AdminAuditLogWhereInput | AdminAuditLogWhereInput[]
    actorId?: StringNullableFilter<"AdminAuditLog"> | string | null
    action?: StringFilter<"AdminAuditLog"> | string
    target?: StringFilter<"AdminAuditLog"> | string
    targetId?: StringNullableFilter<"AdminAuditLog"> | string | null
    metadata?: JsonNullableFilter<"AdminAuditLog">
    createdAt?: DateTimeFilter<"AdminAuditLog"> | Date | string
    actor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type AdminAuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    actorId?: SortOrderInput | SortOrder
    action?: SortOrder
    target?: SortOrder
    targetId?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AdminAuditLogCountOrderByAggregateInput
    _max?: AdminAuditLogMaxOrderByAggregateInput
    _min?: AdminAuditLogMinOrderByAggregateInput
  }

  export type AdminAuditLogScalarWhereWithAggregatesInput = {
    AND?: AdminAuditLogScalarWhereWithAggregatesInput | AdminAuditLogScalarWhereWithAggregatesInput[]
    OR?: AdminAuditLogScalarWhereWithAggregatesInput[]
    NOT?: AdminAuditLogScalarWhereWithAggregatesInput | AdminAuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    actorId?: StringNullableWithAggregatesFilter<"AdminAuditLog"> | string | null
    action?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    target?: StringWithAggregatesFilter<"AdminAuditLog"> | string
    targetId?: StringNullableWithAggregatesFilter<"AdminAuditLog"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"AdminAuditLog">
    createdAt?: DateTimeWithAggregatesFilter<"AdminAuditLog"> | Date | string
  }

  export type ModelConfigWhereInput = {
    AND?: ModelConfigWhereInput | ModelConfigWhereInput[]
    OR?: ModelConfigWhereInput[]
    NOT?: ModelConfigWhereInput | ModelConfigWhereInput[]
    id?: StringFilter<"ModelConfig"> | string
    provider?: StringFilter<"ModelConfig"> | string
    model?: StringFilter<"ModelConfig"> | string
    displayName?: StringFilter<"ModelConfig"> | string
    type?: StringFilter<"ModelConfig"> | string
    enabled?: BoolFilter<"ModelConfig"> | boolean
    isDefault?: BoolFilter<"ModelConfig"> | boolean
    params?: JsonNullableFilter<"ModelConfig">
    createdAt?: DateTimeFilter<"ModelConfig"> | Date | string
    updatedAt?: DateTimeFilter<"ModelConfig"> | Date | string
  }

  export type ModelConfigOrderByWithRelationInput = {
    id?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    displayName?: SortOrder
    type?: SortOrder
    enabled?: SortOrder
    isDefault?: SortOrder
    params?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ModelConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    provider_model_type?: ModelConfigProviderModelTypeCompoundUniqueInput
    AND?: ModelConfigWhereInput | ModelConfigWhereInput[]
    OR?: ModelConfigWhereInput[]
    NOT?: ModelConfigWhereInput | ModelConfigWhereInput[]
    provider?: StringFilter<"ModelConfig"> | string
    model?: StringFilter<"ModelConfig"> | string
    displayName?: StringFilter<"ModelConfig"> | string
    type?: StringFilter<"ModelConfig"> | string
    enabled?: BoolFilter<"ModelConfig"> | boolean
    isDefault?: BoolFilter<"ModelConfig"> | boolean
    params?: JsonNullableFilter<"ModelConfig">
    createdAt?: DateTimeFilter<"ModelConfig"> | Date | string
    updatedAt?: DateTimeFilter<"ModelConfig"> | Date | string
  }, "id" | "provider_model_type">

  export type ModelConfigOrderByWithAggregationInput = {
    id?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    displayName?: SortOrder
    type?: SortOrder
    enabled?: SortOrder
    isDefault?: SortOrder
    params?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ModelConfigCountOrderByAggregateInput
    _max?: ModelConfigMaxOrderByAggregateInput
    _min?: ModelConfigMinOrderByAggregateInput
  }

  export type ModelConfigScalarWhereWithAggregatesInput = {
    AND?: ModelConfigScalarWhereWithAggregatesInput | ModelConfigScalarWhereWithAggregatesInput[]
    OR?: ModelConfigScalarWhereWithAggregatesInput[]
    NOT?: ModelConfigScalarWhereWithAggregatesInput | ModelConfigScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ModelConfig"> | string
    provider?: StringWithAggregatesFilter<"ModelConfig"> | string
    model?: StringWithAggregatesFilter<"ModelConfig"> | string
    displayName?: StringWithAggregatesFilter<"ModelConfig"> | string
    type?: StringWithAggregatesFilter<"ModelConfig"> | string
    enabled?: BoolWithAggregatesFilter<"ModelConfig"> | boolean
    isDefault?: BoolWithAggregatesFilter<"ModelConfig"> | boolean
    params?: JsonNullableWithAggregatesFilter<"ModelConfig">
    createdAt?: DateTimeWithAggregatesFilter<"ModelConfig"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ModelConfig"> | Date | string
  }

  export type OperationConfigWhereInput = {
    AND?: OperationConfigWhereInput | OperationConfigWhereInput[]
    OR?: OperationConfigWhereInput[]
    NOT?: OperationConfigWhereInput | OperationConfigWhereInput[]
    id?: StringFilter<"OperationConfig"> | string
    key?: StringFilter<"OperationConfig"> | string
    value?: JsonNullableFilter<"OperationConfig">
    description?: StringFilter<"OperationConfig"> | string
    createdAt?: DateTimeFilter<"OperationConfig"> | Date | string
    updatedAt?: DateTimeFilter<"OperationConfig"> | Date | string
  }

  export type OperationConfigOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrderInput | SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OperationConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    key?: string
    AND?: OperationConfigWhereInput | OperationConfigWhereInput[]
    OR?: OperationConfigWhereInput[]
    NOT?: OperationConfigWhereInput | OperationConfigWhereInput[]
    value?: JsonNullableFilter<"OperationConfig">
    description?: StringFilter<"OperationConfig"> | string
    createdAt?: DateTimeFilter<"OperationConfig"> | Date | string
    updatedAt?: DateTimeFilter<"OperationConfig"> | Date | string
  }, "id" | "key">

  export type OperationConfigOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrderInput | SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OperationConfigCountOrderByAggregateInput
    _max?: OperationConfigMaxOrderByAggregateInput
    _min?: OperationConfigMinOrderByAggregateInput
  }

  export type OperationConfigScalarWhereWithAggregatesInput = {
    AND?: OperationConfigScalarWhereWithAggregatesInput | OperationConfigScalarWhereWithAggregatesInput[]
    OR?: OperationConfigScalarWhereWithAggregatesInput[]
    NOT?: OperationConfigScalarWhereWithAggregatesInput | OperationConfigScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OperationConfig"> | string
    key?: StringWithAggregatesFilter<"OperationConfig"> | string
    value?: JsonNullableWithAggregatesFilter<"OperationConfig">
    description?: StringWithAggregatesFilter<"OperationConfig"> | string
    createdAt?: DateTimeWithAggregatesFilter<"OperationConfig"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"OperationConfig"> | Date | string
  }

  export type VerificationCodeWhereInput = {
    AND?: VerificationCodeWhereInput | VerificationCodeWhereInput[]
    OR?: VerificationCodeWhereInput[]
    NOT?: VerificationCodeWhereInput | VerificationCodeWhereInput[]
    id?: StringFilter<"VerificationCode"> | string
    target?: StringFilter<"VerificationCode"> | string
    method?: StringFilter<"VerificationCode"> | string
    code?: StringFilter<"VerificationCode"> | string
    expiresAt?: DateTimeFilter<"VerificationCode"> | Date | string
    createdAt?: DateTimeFilter<"VerificationCode"> | Date | string
  }

  export type VerificationCodeOrderByWithRelationInput = {
    id?: SortOrder
    target?: SortOrder
    method?: SortOrder
    code?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type VerificationCodeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    target_method?: VerificationCodeTargetMethodCompoundUniqueInput
    AND?: VerificationCodeWhereInput | VerificationCodeWhereInput[]
    OR?: VerificationCodeWhereInput[]
    NOT?: VerificationCodeWhereInput | VerificationCodeWhereInput[]
    target?: StringFilter<"VerificationCode"> | string
    method?: StringFilter<"VerificationCode"> | string
    code?: StringFilter<"VerificationCode"> | string
    expiresAt?: DateTimeFilter<"VerificationCode"> | Date | string
    createdAt?: DateTimeFilter<"VerificationCode"> | Date | string
  }, "id" | "target_method">

  export type VerificationCodeOrderByWithAggregationInput = {
    id?: SortOrder
    target?: SortOrder
    method?: SortOrder
    code?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _count?: VerificationCodeCountOrderByAggregateInput
    _max?: VerificationCodeMaxOrderByAggregateInput
    _min?: VerificationCodeMinOrderByAggregateInput
  }

  export type VerificationCodeScalarWhereWithAggregatesInput = {
    AND?: VerificationCodeScalarWhereWithAggregatesInput | VerificationCodeScalarWhereWithAggregatesInput[]
    OR?: VerificationCodeScalarWhereWithAggregatesInput[]
    NOT?: VerificationCodeScalarWhereWithAggregatesInput | VerificationCodeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"VerificationCode"> | string
    target?: StringWithAggregatesFilter<"VerificationCode"> | string
    method?: StringWithAggregatesFilter<"VerificationCode"> | string
    code?: StringWithAggregatesFilter<"VerificationCode"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"VerificationCode"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"VerificationCode"> | Date | string
  }

  export type CanvasBackupWhereInput = {
    AND?: CanvasBackupWhereInput | CanvasBackupWhereInput[]
    OR?: CanvasBackupWhereInput[]
    NOT?: CanvasBackupWhereInput | CanvasBackupWhereInput[]
    id?: StringFilter<"CanvasBackup"> | string
    userId?: StringFilter<"CanvasBackup"> | string
    type?: StringFilter<"CanvasBackup"> | string
    data?: JsonNullableFilter<"CanvasBackup">
    version?: IntFilter<"CanvasBackup"> | number
    createdAt?: DateTimeFilter<"CanvasBackup"> | Date | string
    updatedAt?: DateTimeFilter<"CanvasBackup"> | Date | string
  }

  export type CanvasBackupOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    data?: SortOrderInput | SortOrder
    version?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CanvasBackupWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_type?: CanvasBackupUserIdTypeCompoundUniqueInput
    AND?: CanvasBackupWhereInput | CanvasBackupWhereInput[]
    OR?: CanvasBackupWhereInput[]
    NOT?: CanvasBackupWhereInput | CanvasBackupWhereInput[]
    userId?: StringFilter<"CanvasBackup"> | string
    type?: StringFilter<"CanvasBackup"> | string
    data?: JsonNullableFilter<"CanvasBackup">
    version?: IntFilter<"CanvasBackup"> | number
    createdAt?: DateTimeFilter<"CanvasBackup"> | Date | string
    updatedAt?: DateTimeFilter<"CanvasBackup"> | Date | string
  }, "id" | "userId_type">

  export type CanvasBackupOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    data?: SortOrderInput | SortOrder
    version?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CanvasBackupCountOrderByAggregateInput
    _avg?: CanvasBackupAvgOrderByAggregateInput
    _max?: CanvasBackupMaxOrderByAggregateInput
    _min?: CanvasBackupMinOrderByAggregateInput
    _sum?: CanvasBackupSumOrderByAggregateInput
  }

  export type CanvasBackupScalarWhereWithAggregatesInput = {
    AND?: CanvasBackupScalarWhereWithAggregatesInput | CanvasBackupScalarWhereWithAggregatesInput[]
    OR?: CanvasBackupScalarWhereWithAggregatesInput[]
    NOT?: CanvasBackupScalarWhereWithAggregatesInput | CanvasBackupScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CanvasBackup"> | string
    userId?: StringWithAggregatesFilter<"CanvasBackup"> | string
    type?: StringWithAggregatesFilter<"CanvasBackup"> | string
    data?: JsonNullableWithAggregatesFilter<"CanvasBackup">
    version?: IntWithAggregatesFilter<"CanvasBackup"> | number
    createdAt?: DateTimeWithAggregatesFilter<"CanvasBackup"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CanvasBackup"> | Date | string
  }

  export type RateLimitEntryWhereInput = {
    AND?: RateLimitEntryWhereInput | RateLimitEntryWhereInput[]
    OR?: RateLimitEntryWhereInput[]
    NOT?: RateLimitEntryWhereInput | RateLimitEntryWhereInput[]
    id?: StringFilter<"RateLimitEntry"> | string
    key?: StringFilter<"RateLimitEntry"> | string
    count?: IntFilter<"RateLimitEntry"> | number
    resetAt?: DateTimeFilter<"RateLimitEntry"> | Date | string
    updatedAt?: DateTimeFilter<"RateLimitEntry"> | Date | string
  }

  export type RateLimitEntryOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    count?: SortOrder
    resetAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RateLimitEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    key?: string
    AND?: RateLimitEntryWhereInput | RateLimitEntryWhereInput[]
    OR?: RateLimitEntryWhereInput[]
    NOT?: RateLimitEntryWhereInput | RateLimitEntryWhereInput[]
    count?: IntFilter<"RateLimitEntry"> | number
    resetAt?: DateTimeFilter<"RateLimitEntry"> | Date | string
    updatedAt?: DateTimeFilter<"RateLimitEntry"> | Date | string
  }, "id" | "key">

  export type RateLimitEntryOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    count?: SortOrder
    resetAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RateLimitEntryCountOrderByAggregateInput
    _avg?: RateLimitEntryAvgOrderByAggregateInput
    _max?: RateLimitEntryMaxOrderByAggregateInput
    _min?: RateLimitEntryMinOrderByAggregateInput
    _sum?: RateLimitEntrySumOrderByAggregateInput
  }

  export type RateLimitEntryScalarWhereWithAggregatesInput = {
    AND?: RateLimitEntryScalarWhereWithAggregatesInput | RateLimitEntryScalarWhereWithAggregatesInput[]
    OR?: RateLimitEntryScalarWhereWithAggregatesInput[]
    NOT?: RateLimitEntryScalarWhereWithAggregatesInput | RateLimitEntryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RateLimitEntry"> | string
    key?: StringWithAggregatesFilter<"RateLimitEntry"> | string
    count?: IntWithAggregatesFilter<"RateLimitEntry"> | number
    resetAt?: DateTimeWithAggregatesFilter<"RateLimitEntry"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RateLimitEntry"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutUserInput
    orders?: OrderCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogCreateNestedManyWithoutActorInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutUserInput
    orders?: OrderUncheckedCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordUncheckedCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutActorInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutUserNestedInput
    orders?: OrderUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUpdateManyWithoutActorNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutUserNestedInput
    orders?: OrderUncheckedUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUncheckedUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlanCreateInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementCreateNestedManyWithoutPlanInput
    subscriptions?: SubscriptionCreateNestedManyWithoutPlanInput
    orders?: OrderCreateNestedManyWithoutPlanInput
  }

  export type PlanUncheckedCreateInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementUncheckedCreateNestedManyWithoutPlanInput
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutPlanInput
    orders?: OrderUncheckedCreateNestedManyWithoutPlanInput
  }

  export type PlanUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUpdateManyWithoutPlanNestedInput
    subscriptions?: SubscriptionUpdateManyWithoutPlanNestedInput
    orders?: OrderUpdateManyWithoutPlanNestedInput
  }

  export type PlanUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUncheckedUpdateManyWithoutPlanNestedInput
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutPlanNestedInput
    orders?: OrderUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type PlanCreateManyInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlanUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlanUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementCreateInput = {
    id?: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    plan: PlanCreateNestedOneWithoutEntitlementsInput
  }

  export type EntitlementUncheckedCreateInput = {
    id?: string
    planId: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EntitlementUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    plan?: PlanUpdateOneRequiredWithoutEntitlementsNestedInput
  }

  export type EntitlementUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementCreateManyInput = {
    id?: string
    planId: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EntitlementUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionCreateInput = {
    id?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSubscriptionsInput
    plan?: PlanCreateNestedOneWithoutSubscriptionsInput
  }

  export type SubscriptionUncheckedCreateInput = {
    id?: string
    userId: string
    planId?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSubscriptionsNestedInput
    plan?: PlanUpdateOneWithoutSubscriptionsNestedInput
  }

  export type SubscriptionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionCreateManyInput = {
    id?: string
    userId: string
    planId?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordCreateInput = {
    id?: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutUsageRecordsInput
  }

  export type UsageRecordUncheckedCreateInput = {
    id?: string
    userId: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UsageRecordUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUsageRecordsNestedInput
  }

  export type UsageRecordUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordCreateManyInput = {
    id?: string
    userId: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UsageRecordUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobCreateInput = {
    id?: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutGenerationJobsInput
  }

  export type GenerationJobUncheckedCreateInput = {
    id?: string
    userId: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GenerationJobUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutGenerationJobsNestedInput
  }

  export type GenerationJobUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobCreateManyInput = {
    id?: string
    userId: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GenerationJobUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderCreateInput = {
    id?: string
    orderNo: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutOrdersInput
    plan: PlanCreateNestedOneWithoutOrdersInput
    paymentEvents?: PaymentEventCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateInput = {
    id?: string
    orderNo: string
    userId: string
    planId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    paymentEvents?: PaymentEventUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutOrdersNestedInput
    plan?: PlanUpdateOneRequiredWithoutOrdersNestedInput
    paymentEvents?: PaymentEventUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paymentEvents?: PaymentEventUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderCreateManyInput = {
    id?: string
    orderNo: string
    userId: string
    planId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventCreateInput = {
    id?: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    order: OrderCreateNestedOneWithoutPaymentEventsInput
  }

  export type PaymentEventUncheckedCreateInput = {
    id?: string
    orderId: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PaymentEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    order?: OrderUpdateOneRequiredWithoutPaymentEventsNestedInput
  }

  export type PaymentEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventCreateManyInput = {
    id?: string
    orderId: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PaymentEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogCreateInput = {
    id?: string
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    actor?: UserCreateNestedOneWithoutAuditLogsInput
  }

  export type AdminAuditLogUncheckedCreateInput = {
    id?: string
    actorId?: string | null
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AdminAuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    actor?: UserUpdateOneWithoutAuditLogsNestedInput
  }

  export type AdminAuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogCreateManyInput = {
    id?: string
    actorId?: string | null
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AdminAuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelConfigCreateInput = {
    id?: string
    provider: string
    model: string
    displayName: string
    type?: string
    enabled?: boolean
    isDefault?: boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ModelConfigUncheckedCreateInput = {
    id?: string
    provider: string
    model: string
    displayName: string
    type?: string
    enabled?: boolean
    isDefault?: boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ModelConfigUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    enabled?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelConfigUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    enabled?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelConfigCreateManyInput = {
    id?: string
    provider: string
    model: string
    displayName: string
    type?: string
    enabled?: boolean
    isDefault?: boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ModelConfigUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    enabled?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelConfigUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    model?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    enabled?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    params?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OperationConfigCreateInput = {
    id?: string
    key: string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OperationConfigUncheckedCreateInput = {
    id?: string
    key: string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OperationConfigUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OperationConfigUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OperationConfigCreateManyInput = {
    id?: string
    key: string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OperationConfigUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OperationConfigUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: NullableJsonNullValueInput | InputJsonValue
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCodeCreateInput = {
    id?: string
    target: string
    method: string
    code: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type VerificationCodeUncheckedCreateInput = {
    id?: string
    target: string
    method: string
    code: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type VerificationCodeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    method?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCodeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    method?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCodeCreateManyInput = {
    id?: string
    target: string
    method: string
    code: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type VerificationCodeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    method?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCodeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    method?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CanvasBackupCreateInput = {
    id?: string
    userId: string
    type: string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CanvasBackupUncheckedCreateInput = {
    id?: string
    userId: string
    type: string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CanvasBackupUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CanvasBackupUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CanvasBackupCreateManyInput = {
    id?: string
    userId: string
    type: string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CanvasBackupUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CanvasBackupUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    data?: NullableJsonNullValueInput | InputJsonValue
    version?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RateLimitEntryCreateInput = {
    id?: string
    key: string
    count?: number
    resetAt: Date | string
    updatedAt?: Date | string
  }

  export type RateLimitEntryUncheckedCreateInput = {
    id?: string
    key: string
    count?: number
    resetAt: Date | string
    updatedAt?: Date | string
  }

  export type RateLimitEntryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    resetAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RateLimitEntryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    resetAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RateLimitEntryCreateManyInput = {
    id?: string
    key: string
    count?: number
    resetAt: Date | string
    updatedAt?: Date | string
  }

  export type RateLimitEntryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    resetAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RateLimitEntryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    resetAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SubscriptionListRelationFilter = {
    every?: SubscriptionWhereInput
    some?: SubscriptionWhereInput
    none?: SubscriptionWhereInput
  }

  export type OrderListRelationFilter = {
    every?: OrderWhereInput
    some?: OrderWhereInput
    none?: OrderWhereInput
  }

  export type UsageRecordListRelationFilter = {
    every?: UsageRecordWhereInput
    some?: UsageRecordWhereInput
    none?: UsageRecordWhereInput
  }

  export type GenerationJobListRelationFilter = {
    every?: GenerationJobWhereInput
    some?: GenerationJobWhereInput
    none?: GenerationJobWhereInput
  }

  export type AdminAuditLogListRelationFilter = {
    every?: AdminAuditLogWhereInput
    some?: AdminAuditLogWhereInput
    none?: AdminAuditLogWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SubscriptionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrderOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UsageRecordOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GenerationJobOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AdminAuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    password?: SortOrder
    phone?: SortOrder
    emailVerified?: SortOrder
    phoneVerified?: SortOrder
    avatarUrl?: SortOrder
    githubId?: SortOrder
    role?: SortOrder
    bannedAt?: SortOrder
    banReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    password?: SortOrder
    phone?: SortOrder
    emailVerified?: SortOrder
    phoneVerified?: SortOrder
    avatarUrl?: SortOrder
    githubId?: SortOrder
    role?: SortOrder
    bannedAt?: SortOrder
    banReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    name?: SortOrder
    password?: SortOrder
    phone?: SortOrder
    emailVerified?: SortOrder
    phoneVerified?: SortOrder
    avatarUrl?: SortOrder
    githubId?: SortOrder
    role?: SortOrder
    bannedAt?: SortOrder
    banReason?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EntitlementListRelationFilter = {
    every?: EntitlementWhereInput
    some?: EntitlementWhereInput
    none?: EntitlementWhereInput
  }

  export type EntitlementOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PlanCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    currency?: SortOrder
    sortOrder?: SortOrder
    isActive?: SortOrder
    isPopular?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlanAvgOrderByAggregateInput = {
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    sortOrder?: SortOrder
  }

  export type PlanMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    currency?: SortOrder
    sortOrder?: SortOrder
    isActive?: SortOrder
    isPopular?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlanMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    currency?: SortOrder
    sortOrder?: SortOrder
    isActive?: SortOrder
    isPopular?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlanSumOrderByAggregateInput = {
    monthlyPrice?: SortOrder
    yearlyPrice?: SortOrder
    sortOrder?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type PlanScalarRelationFilter = {
    is?: PlanWhereInput
    isNot?: PlanWhereInput
  }

  export type EntitlementPlanIdKeyCompoundUniqueInput = {
    planId: string
    key: string
  }

  export type EntitlementCountOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    key?: SortOrder
    label?: SortOrder
    value?: SortOrder
    unit?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EntitlementMaxOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    key?: SortOrder
    label?: SortOrder
    value?: SortOrder
    unit?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EntitlementMinOrderByAggregateInput = {
    id?: SortOrder
    planId?: SortOrder
    key?: SortOrder
    label?: SortOrder
    value?: SortOrder
    unit?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type PlanNullableScalarRelationFilter = {
    is?: PlanWhereInput | null
    isNot?: PlanWhereInput | null
  }

  export type SubscriptionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingCycle?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    autoRenew?: SortOrder
    provider?: SortOrder
    providerSubId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingCycle?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    autoRenew?: SortOrder
    provider?: SortOrder
    providerSubId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubscriptionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    status?: SortOrder
    billingCycle?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    cancelAtPeriodEnd?: SortOrder
    autoRenew?: SortOrder
    provider?: SortOrder
    providerSubId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type UsageRecordUserIdMetricPeriodCompoundUniqueInput = {
    userId: string
    metric: string
    period: string
  }

  export type UsageRecordCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    metric?: SortOrder
    used?: SortOrder
    limit?: SortOrder
    period?: SortOrder
    resetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UsageRecordAvgOrderByAggregateInput = {
    used?: SortOrder
    limit?: SortOrder
  }

  export type UsageRecordMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    metric?: SortOrder
    used?: SortOrder
    limit?: SortOrder
    period?: SortOrder
    resetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UsageRecordMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    metric?: SortOrder
    used?: SortOrder
    limit?: SortOrder
    period?: SortOrder
    resetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UsageRecordSumOrderByAggregateInput = {
    used?: SortOrder
    limit?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type GenerationJobCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    requestKey?: SortOrder
    kind?: SortOrder
    count?: SortOrder
    status?: SortOrder
    error?: SortOrder
    metadata?: SortOrder
    quotaRefunded?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GenerationJobAvgOrderByAggregateInput = {
    count?: SortOrder
  }

  export type GenerationJobMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    requestKey?: SortOrder
    kind?: SortOrder
    count?: SortOrder
    status?: SortOrder
    error?: SortOrder
    quotaRefunded?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GenerationJobMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    requestKey?: SortOrder
    kind?: SortOrder
    count?: SortOrder
    status?: SortOrder
    error?: SortOrder
    quotaRefunded?: SortOrder
    startedAt?: SortOrder
    finishedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GenerationJobSumOrderByAggregateInput = {
    count?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type PaymentEventListRelationFilter = {
    every?: PaymentEventWhereInput
    some?: PaymentEventWhereInput
    none?: PaymentEventWhereInput
  }

  export type PaymentEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrderCountOrderByAggregateInput = {
    id?: SortOrder
    orderNo?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    provider?: SortOrder
    billingCycle?: SortOrder
    providerOrderNo?: SortOrder
    paidAt?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type OrderMaxOrderByAggregateInput = {
    id?: SortOrder
    orderNo?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    provider?: SortOrder
    billingCycle?: SortOrder
    providerOrderNo?: SortOrder
    paidAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderMinOrderByAggregateInput = {
    id?: SortOrder
    orderNo?: SortOrder
    userId?: SortOrder
    planId?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    status?: SortOrder
    provider?: SortOrder
    billingCycle?: SortOrder
    providerOrderNo?: SortOrder
    paidAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrderSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type OrderScalarRelationFilter = {
    is?: OrderWhereInput
    isNot?: OrderWhereInput
  }

  export type PaymentEventCountOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    provider?: SortOrder
    eventType?: SortOrder
    providerEventId?: SortOrder
    payload?: SortOrder
    createdAt?: SortOrder
  }

  export type PaymentEventMaxOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    provider?: SortOrder
    eventType?: SortOrder
    providerEventId?: SortOrder
    createdAt?: SortOrder
  }

  export type PaymentEventMinOrderByAggregateInput = {
    id?: SortOrder
    orderId?: SortOrder
    provider?: SortOrder
    eventType?: SortOrder
    providerEventId?: SortOrder
    createdAt?: SortOrder
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type AdminAuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    actorId?: SortOrder
    action?: SortOrder
    target?: SortOrder
    targetId?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type AdminAuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    actorId?: SortOrder
    action?: SortOrder
    target?: SortOrder
    targetId?: SortOrder
    createdAt?: SortOrder
  }

  export type AdminAuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    actorId?: SortOrder
    action?: SortOrder
    target?: SortOrder
    targetId?: SortOrder
    createdAt?: SortOrder
  }

  export type ModelConfigProviderModelTypeCompoundUniqueInput = {
    provider: string
    model: string
    type: string
  }

  export type ModelConfigCountOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    displayName?: SortOrder
    type?: SortOrder
    enabled?: SortOrder
    isDefault?: SortOrder
    params?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ModelConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    displayName?: SortOrder
    type?: SortOrder
    enabled?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ModelConfigMinOrderByAggregateInput = {
    id?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    displayName?: SortOrder
    type?: SortOrder
    enabled?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OperationConfigCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    value?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OperationConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OperationConfigMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VerificationCodeTargetMethodCompoundUniqueInput = {
    target: string
    method: string
  }

  export type VerificationCodeCountOrderByAggregateInput = {
    id?: SortOrder
    target?: SortOrder
    method?: SortOrder
    code?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type VerificationCodeMaxOrderByAggregateInput = {
    id?: SortOrder
    target?: SortOrder
    method?: SortOrder
    code?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type VerificationCodeMinOrderByAggregateInput = {
    id?: SortOrder
    target?: SortOrder
    method?: SortOrder
    code?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type CanvasBackupUserIdTypeCompoundUniqueInput = {
    userId: string
    type: string
  }

  export type CanvasBackupCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    data?: SortOrder
    version?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CanvasBackupAvgOrderByAggregateInput = {
    version?: SortOrder
  }

  export type CanvasBackupMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    version?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CanvasBackupMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    version?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CanvasBackupSumOrderByAggregateInput = {
    version?: SortOrder
  }

  export type RateLimitEntryCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    count?: SortOrder
    resetAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RateLimitEntryAvgOrderByAggregateInput = {
    count?: SortOrder
  }

  export type RateLimitEntryMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    count?: SortOrder
    resetAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RateLimitEntryMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    count?: SortOrder
    resetAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RateLimitEntrySumOrderByAggregateInput = {
    count?: SortOrder
  }

  export type SubscriptionCreateNestedManyWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput> | SubscriptionCreateWithoutUserInput[] | SubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput | SubscriptionCreateOrConnectWithoutUserInput[]
    createMany?: SubscriptionCreateManyUserInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type OrderCreateNestedManyWithoutUserInput = {
    create?: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput> | OrderCreateWithoutUserInput[] | OrderUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutUserInput | OrderCreateOrConnectWithoutUserInput[]
    createMany?: OrderCreateManyUserInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type UsageRecordCreateNestedManyWithoutUserInput = {
    create?: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput> | UsageRecordCreateWithoutUserInput[] | UsageRecordUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UsageRecordCreateOrConnectWithoutUserInput | UsageRecordCreateOrConnectWithoutUserInput[]
    createMany?: UsageRecordCreateManyUserInputEnvelope
    connect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
  }

  export type GenerationJobCreateNestedManyWithoutUserInput = {
    create?: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput> | GenerationJobCreateWithoutUserInput[] | GenerationJobUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GenerationJobCreateOrConnectWithoutUserInput | GenerationJobCreateOrConnectWithoutUserInput[]
    createMany?: GenerationJobCreateManyUserInputEnvelope
    connect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
  }

  export type AdminAuditLogCreateNestedManyWithoutActorInput = {
    create?: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput> | AdminAuditLogCreateWithoutActorInput[] | AdminAuditLogUncheckedCreateWithoutActorInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutActorInput | AdminAuditLogCreateOrConnectWithoutActorInput[]
    createMany?: AdminAuditLogCreateManyActorInputEnvelope
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
  }

  export type SubscriptionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput> | SubscriptionCreateWithoutUserInput[] | SubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput | SubscriptionCreateOrConnectWithoutUserInput[]
    createMany?: SubscriptionCreateManyUserInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type OrderUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput> | OrderCreateWithoutUserInput[] | OrderUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutUserInput | OrderCreateOrConnectWithoutUserInput[]
    createMany?: OrderCreateManyUserInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type UsageRecordUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput> | UsageRecordCreateWithoutUserInput[] | UsageRecordUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UsageRecordCreateOrConnectWithoutUserInput | UsageRecordCreateOrConnectWithoutUserInput[]
    createMany?: UsageRecordCreateManyUserInputEnvelope
    connect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
  }

  export type GenerationJobUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput> | GenerationJobCreateWithoutUserInput[] | GenerationJobUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GenerationJobCreateOrConnectWithoutUserInput | GenerationJobCreateOrConnectWithoutUserInput[]
    createMany?: GenerationJobCreateManyUserInputEnvelope
    connect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
  }

  export type AdminAuditLogUncheckedCreateNestedManyWithoutActorInput = {
    create?: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput> | AdminAuditLogCreateWithoutActorInput[] | AdminAuditLogUncheckedCreateWithoutActorInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutActorInput | AdminAuditLogCreateOrConnectWithoutActorInput[]
    createMany?: AdminAuditLogCreateManyActorInputEnvelope
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type SubscriptionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput> | SubscriptionCreateWithoutUserInput[] | SubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput | SubscriptionCreateOrConnectWithoutUserInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutUserInput | SubscriptionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SubscriptionCreateManyUserInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutUserInput | SubscriptionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutUserInput | SubscriptionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type OrderUpdateManyWithoutUserNestedInput = {
    create?: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput> | OrderCreateWithoutUserInput[] | OrderUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutUserInput | OrderCreateOrConnectWithoutUserInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutUserInput | OrderUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OrderCreateManyUserInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutUserInput | OrderUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutUserInput | OrderUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type UsageRecordUpdateManyWithoutUserNestedInput = {
    create?: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput> | UsageRecordCreateWithoutUserInput[] | UsageRecordUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UsageRecordCreateOrConnectWithoutUserInput | UsageRecordCreateOrConnectWithoutUserInput[]
    upsert?: UsageRecordUpsertWithWhereUniqueWithoutUserInput | UsageRecordUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UsageRecordCreateManyUserInputEnvelope
    set?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    disconnect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    delete?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    connect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    update?: UsageRecordUpdateWithWhereUniqueWithoutUserInput | UsageRecordUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UsageRecordUpdateManyWithWhereWithoutUserInput | UsageRecordUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UsageRecordScalarWhereInput | UsageRecordScalarWhereInput[]
  }

  export type GenerationJobUpdateManyWithoutUserNestedInput = {
    create?: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput> | GenerationJobCreateWithoutUserInput[] | GenerationJobUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GenerationJobCreateOrConnectWithoutUserInput | GenerationJobCreateOrConnectWithoutUserInput[]
    upsert?: GenerationJobUpsertWithWhereUniqueWithoutUserInput | GenerationJobUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GenerationJobCreateManyUserInputEnvelope
    set?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    disconnect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    delete?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    connect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    update?: GenerationJobUpdateWithWhereUniqueWithoutUserInput | GenerationJobUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GenerationJobUpdateManyWithWhereWithoutUserInput | GenerationJobUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GenerationJobScalarWhereInput | GenerationJobScalarWhereInput[]
  }

  export type AdminAuditLogUpdateManyWithoutActorNestedInput = {
    create?: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput> | AdminAuditLogCreateWithoutActorInput[] | AdminAuditLogUncheckedCreateWithoutActorInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutActorInput | AdminAuditLogCreateOrConnectWithoutActorInput[]
    upsert?: AdminAuditLogUpsertWithWhereUniqueWithoutActorInput | AdminAuditLogUpsertWithWhereUniqueWithoutActorInput[]
    createMany?: AdminAuditLogCreateManyActorInputEnvelope
    set?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    disconnect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    delete?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    update?: AdminAuditLogUpdateWithWhereUniqueWithoutActorInput | AdminAuditLogUpdateWithWhereUniqueWithoutActorInput[]
    updateMany?: AdminAuditLogUpdateManyWithWhereWithoutActorInput | AdminAuditLogUpdateManyWithWhereWithoutActorInput[]
    deleteMany?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
  }

  export type SubscriptionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput> | SubscriptionCreateWithoutUserInput[] | SubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput | SubscriptionCreateOrConnectWithoutUserInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutUserInput | SubscriptionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SubscriptionCreateManyUserInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutUserInput | SubscriptionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutUserInput | SubscriptionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type OrderUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput> | OrderCreateWithoutUserInput[] | OrderUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutUserInput | OrderCreateOrConnectWithoutUserInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutUserInput | OrderUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OrderCreateManyUserInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutUserInput | OrderUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutUserInput | OrderUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type UsageRecordUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput> | UsageRecordCreateWithoutUserInput[] | UsageRecordUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UsageRecordCreateOrConnectWithoutUserInput | UsageRecordCreateOrConnectWithoutUserInput[]
    upsert?: UsageRecordUpsertWithWhereUniqueWithoutUserInput | UsageRecordUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UsageRecordCreateManyUserInputEnvelope
    set?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    disconnect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    delete?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    connect?: UsageRecordWhereUniqueInput | UsageRecordWhereUniqueInput[]
    update?: UsageRecordUpdateWithWhereUniqueWithoutUserInput | UsageRecordUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UsageRecordUpdateManyWithWhereWithoutUserInput | UsageRecordUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UsageRecordScalarWhereInput | UsageRecordScalarWhereInput[]
  }

  export type GenerationJobUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput> | GenerationJobCreateWithoutUserInput[] | GenerationJobUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GenerationJobCreateOrConnectWithoutUserInput | GenerationJobCreateOrConnectWithoutUserInput[]
    upsert?: GenerationJobUpsertWithWhereUniqueWithoutUserInput | GenerationJobUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GenerationJobCreateManyUserInputEnvelope
    set?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    disconnect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    delete?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    connect?: GenerationJobWhereUniqueInput | GenerationJobWhereUniqueInput[]
    update?: GenerationJobUpdateWithWhereUniqueWithoutUserInput | GenerationJobUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GenerationJobUpdateManyWithWhereWithoutUserInput | GenerationJobUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GenerationJobScalarWhereInput | GenerationJobScalarWhereInput[]
  }

  export type AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput = {
    create?: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput> | AdminAuditLogCreateWithoutActorInput[] | AdminAuditLogUncheckedCreateWithoutActorInput[]
    connectOrCreate?: AdminAuditLogCreateOrConnectWithoutActorInput | AdminAuditLogCreateOrConnectWithoutActorInput[]
    upsert?: AdminAuditLogUpsertWithWhereUniqueWithoutActorInput | AdminAuditLogUpsertWithWhereUniqueWithoutActorInput[]
    createMany?: AdminAuditLogCreateManyActorInputEnvelope
    set?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    disconnect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    delete?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    connect?: AdminAuditLogWhereUniqueInput | AdminAuditLogWhereUniqueInput[]
    update?: AdminAuditLogUpdateWithWhereUniqueWithoutActorInput | AdminAuditLogUpdateWithWhereUniqueWithoutActorInput[]
    updateMany?: AdminAuditLogUpdateManyWithWhereWithoutActorInput | AdminAuditLogUpdateManyWithWhereWithoutActorInput[]
    deleteMany?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
  }

  export type EntitlementCreateNestedManyWithoutPlanInput = {
    create?: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput> | EntitlementCreateWithoutPlanInput[] | EntitlementUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: EntitlementCreateOrConnectWithoutPlanInput | EntitlementCreateOrConnectWithoutPlanInput[]
    createMany?: EntitlementCreateManyPlanInputEnvelope
    connect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
  }

  export type SubscriptionCreateNestedManyWithoutPlanInput = {
    create?: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput> | SubscriptionCreateWithoutPlanInput[] | SubscriptionUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutPlanInput | SubscriptionCreateOrConnectWithoutPlanInput[]
    createMany?: SubscriptionCreateManyPlanInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type OrderCreateNestedManyWithoutPlanInput = {
    create?: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput> | OrderCreateWithoutPlanInput[] | OrderUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutPlanInput | OrderCreateOrConnectWithoutPlanInput[]
    createMany?: OrderCreateManyPlanInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type EntitlementUncheckedCreateNestedManyWithoutPlanInput = {
    create?: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput> | EntitlementCreateWithoutPlanInput[] | EntitlementUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: EntitlementCreateOrConnectWithoutPlanInput | EntitlementCreateOrConnectWithoutPlanInput[]
    createMany?: EntitlementCreateManyPlanInputEnvelope
    connect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
  }

  export type SubscriptionUncheckedCreateNestedManyWithoutPlanInput = {
    create?: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput> | SubscriptionCreateWithoutPlanInput[] | SubscriptionUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutPlanInput | SubscriptionCreateOrConnectWithoutPlanInput[]
    createMany?: SubscriptionCreateManyPlanInputEnvelope
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
  }

  export type OrderUncheckedCreateNestedManyWithoutPlanInput = {
    create?: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput> | OrderCreateWithoutPlanInput[] | OrderUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutPlanInput | OrderCreateOrConnectWithoutPlanInput[]
    createMany?: OrderCreateManyPlanInputEnvelope
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EntitlementUpdateManyWithoutPlanNestedInput = {
    create?: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput> | EntitlementCreateWithoutPlanInput[] | EntitlementUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: EntitlementCreateOrConnectWithoutPlanInput | EntitlementCreateOrConnectWithoutPlanInput[]
    upsert?: EntitlementUpsertWithWhereUniqueWithoutPlanInput | EntitlementUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: EntitlementCreateManyPlanInputEnvelope
    set?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    disconnect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    delete?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    connect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    update?: EntitlementUpdateWithWhereUniqueWithoutPlanInput | EntitlementUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: EntitlementUpdateManyWithWhereWithoutPlanInput | EntitlementUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: EntitlementScalarWhereInput | EntitlementScalarWhereInput[]
  }

  export type SubscriptionUpdateManyWithoutPlanNestedInput = {
    create?: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput> | SubscriptionCreateWithoutPlanInput[] | SubscriptionUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutPlanInput | SubscriptionCreateOrConnectWithoutPlanInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutPlanInput | SubscriptionUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: SubscriptionCreateManyPlanInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutPlanInput | SubscriptionUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutPlanInput | SubscriptionUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type OrderUpdateManyWithoutPlanNestedInput = {
    create?: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput> | OrderCreateWithoutPlanInput[] | OrderUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutPlanInput | OrderCreateOrConnectWithoutPlanInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutPlanInput | OrderUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: OrderCreateManyPlanInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutPlanInput | OrderUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutPlanInput | OrderUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type EntitlementUncheckedUpdateManyWithoutPlanNestedInput = {
    create?: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput> | EntitlementCreateWithoutPlanInput[] | EntitlementUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: EntitlementCreateOrConnectWithoutPlanInput | EntitlementCreateOrConnectWithoutPlanInput[]
    upsert?: EntitlementUpsertWithWhereUniqueWithoutPlanInput | EntitlementUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: EntitlementCreateManyPlanInputEnvelope
    set?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    disconnect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    delete?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    connect?: EntitlementWhereUniqueInput | EntitlementWhereUniqueInput[]
    update?: EntitlementUpdateWithWhereUniqueWithoutPlanInput | EntitlementUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: EntitlementUpdateManyWithWhereWithoutPlanInput | EntitlementUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: EntitlementScalarWhereInput | EntitlementScalarWhereInput[]
  }

  export type SubscriptionUncheckedUpdateManyWithoutPlanNestedInput = {
    create?: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput> | SubscriptionCreateWithoutPlanInput[] | SubscriptionUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: SubscriptionCreateOrConnectWithoutPlanInput | SubscriptionCreateOrConnectWithoutPlanInput[]
    upsert?: SubscriptionUpsertWithWhereUniqueWithoutPlanInput | SubscriptionUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: SubscriptionCreateManyPlanInputEnvelope
    set?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    disconnect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    delete?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    connect?: SubscriptionWhereUniqueInput | SubscriptionWhereUniqueInput[]
    update?: SubscriptionUpdateWithWhereUniqueWithoutPlanInput | SubscriptionUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: SubscriptionUpdateManyWithWhereWithoutPlanInput | SubscriptionUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
  }

  export type OrderUncheckedUpdateManyWithoutPlanNestedInput = {
    create?: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput> | OrderCreateWithoutPlanInput[] | OrderUncheckedCreateWithoutPlanInput[]
    connectOrCreate?: OrderCreateOrConnectWithoutPlanInput | OrderCreateOrConnectWithoutPlanInput[]
    upsert?: OrderUpsertWithWhereUniqueWithoutPlanInput | OrderUpsertWithWhereUniqueWithoutPlanInput[]
    createMany?: OrderCreateManyPlanInputEnvelope
    set?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    disconnect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    delete?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    connect?: OrderWhereUniqueInput | OrderWhereUniqueInput[]
    update?: OrderUpdateWithWhereUniqueWithoutPlanInput | OrderUpdateWithWhereUniqueWithoutPlanInput[]
    updateMany?: OrderUpdateManyWithWhereWithoutPlanInput | OrderUpdateManyWithWhereWithoutPlanInput[]
    deleteMany?: OrderScalarWhereInput | OrderScalarWhereInput[]
  }

  export type PlanCreateNestedOneWithoutEntitlementsInput = {
    create?: XOR<PlanCreateWithoutEntitlementsInput, PlanUncheckedCreateWithoutEntitlementsInput>
    connectOrCreate?: PlanCreateOrConnectWithoutEntitlementsInput
    connect?: PlanWhereUniqueInput
  }

  export type PlanUpdateOneRequiredWithoutEntitlementsNestedInput = {
    create?: XOR<PlanCreateWithoutEntitlementsInput, PlanUncheckedCreateWithoutEntitlementsInput>
    connectOrCreate?: PlanCreateOrConnectWithoutEntitlementsInput
    upsert?: PlanUpsertWithoutEntitlementsInput
    connect?: PlanWhereUniqueInput
    update?: XOR<XOR<PlanUpdateToOneWithWhereWithoutEntitlementsInput, PlanUpdateWithoutEntitlementsInput>, PlanUncheckedUpdateWithoutEntitlementsInput>
  }

  export type UserCreateNestedOneWithoutSubscriptionsInput = {
    create?: XOR<UserCreateWithoutSubscriptionsInput, UserUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionsInput
    connect?: UserWhereUniqueInput
  }

  export type PlanCreateNestedOneWithoutSubscriptionsInput = {
    create?: XOR<PlanCreateWithoutSubscriptionsInput, PlanUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: PlanCreateOrConnectWithoutSubscriptionsInput
    connect?: PlanWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSubscriptionsNestedInput = {
    create?: XOR<UserCreateWithoutSubscriptionsInput, UserUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionsInput
    upsert?: UserUpsertWithoutSubscriptionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSubscriptionsInput, UserUpdateWithoutSubscriptionsInput>, UserUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type PlanUpdateOneWithoutSubscriptionsNestedInput = {
    create?: XOR<PlanCreateWithoutSubscriptionsInput, PlanUncheckedCreateWithoutSubscriptionsInput>
    connectOrCreate?: PlanCreateOrConnectWithoutSubscriptionsInput
    upsert?: PlanUpsertWithoutSubscriptionsInput
    disconnect?: PlanWhereInput | boolean
    delete?: PlanWhereInput | boolean
    connect?: PlanWhereUniqueInput
    update?: XOR<XOR<PlanUpdateToOneWithWhereWithoutSubscriptionsInput, PlanUpdateWithoutSubscriptionsInput>, PlanUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type UserCreateNestedOneWithoutUsageRecordsInput = {
    create?: XOR<UserCreateWithoutUsageRecordsInput, UserUncheckedCreateWithoutUsageRecordsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUsageRecordsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutUsageRecordsNestedInput = {
    create?: XOR<UserCreateWithoutUsageRecordsInput, UserUncheckedCreateWithoutUsageRecordsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUsageRecordsInput
    upsert?: UserUpsertWithoutUsageRecordsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUsageRecordsInput, UserUpdateWithoutUsageRecordsInput>, UserUncheckedUpdateWithoutUsageRecordsInput>
  }

  export type UserCreateNestedOneWithoutGenerationJobsInput = {
    create?: XOR<UserCreateWithoutGenerationJobsInput, UserUncheckedCreateWithoutGenerationJobsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGenerationJobsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutGenerationJobsNestedInput = {
    create?: XOR<UserCreateWithoutGenerationJobsInput, UserUncheckedCreateWithoutGenerationJobsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGenerationJobsInput
    upsert?: UserUpsertWithoutGenerationJobsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGenerationJobsInput, UserUpdateWithoutGenerationJobsInput>, UserUncheckedUpdateWithoutGenerationJobsInput>
  }

  export type UserCreateNestedOneWithoutOrdersInput = {
    create?: XOR<UserCreateWithoutOrdersInput, UserUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: UserCreateOrConnectWithoutOrdersInput
    connect?: UserWhereUniqueInput
  }

  export type PlanCreateNestedOneWithoutOrdersInput = {
    create?: XOR<PlanCreateWithoutOrdersInput, PlanUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: PlanCreateOrConnectWithoutOrdersInput
    connect?: PlanWhereUniqueInput
  }

  export type PaymentEventCreateNestedManyWithoutOrderInput = {
    create?: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput> | PaymentEventCreateWithoutOrderInput[] | PaymentEventUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: PaymentEventCreateOrConnectWithoutOrderInput | PaymentEventCreateOrConnectWithoutOrderInput[]
    createMany?: PaymentEventCreateManyOrderInputEnvelope
    connect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
  }

  export type PaymentEventUncheckedCreateNestedManyWithoutOrderInput = {
    create?: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput> | PaymentEventCreateWithoutOrderInput[] | PaymentEventUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: PaymentEventCreateOrConnectWithoutOrderInput | PaymentEventCreateOrConnectWithoutOrderInput[]
    createMany?: PaymentEventCreateManyOrderInputEnvelope
    connect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutOrdersNestedInput = {
    create?: XOR<UserCreateWithoutOrdersInput, UserUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: UserCreateOrConnectWithoutOrdersInput
    upsert?: UserUpsertWithoutOrdersInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutOrdersInput, UserUpdateWithoutOrdersInput>, UserUncheckedUpdateWithoutOrdersInput>
  }

  export type PlanUpdateOneRequiredWithoutOrdersNestedInput = {
    create?: XOR<PlanCreateWithoutOrdersInput, PlanUncheckedCreateWithoutOrdersInput>
    connectOrCreate?: PlanCreateOrConnectWithoutOrdersInput
    upsert?: PlanUpsertWithoutOrdersInput
    connect?: PlanWhereUniqueInput
    update?: XOR<XOR<PlanUpdateToOneWithWhereWithoutOrdersInput, PlanUpdateWithoutOrdersInput>, PlanUncheckedUpdateWithoutOrdersInput>
  }

  export type PaymentEventUpdateManyWithoutOrderNestedInput = {
    create?: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput> | PaymentEventCreateWithoutOrderInput[] | PaymentEventUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: PaymentEventCreateOrConnectWithoutOrderInput | PaymentEventCreateOrConnectWithoutOrderInput[]
    upsert?: PaymentEventUpsertWithWhereUniqueWithoutOrderInput | PaymentEventUpsertWithWhereUniqueWithoutOrderInput[]
    createMany?: PaymentEventCreateManyOrderInputEnvelope
    set?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    disconnect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    delete?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    connect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    update?: PaymentEventUpdateWithWhereUniqueWithoutOrderInput | PaymentEventUpdateWithWhereUniqueWithoutOrderInput[]
    updateMany?: PaymentEventUpdateManyWithWhereWithoutOrderInput | PaymentEventUpdateManyWithWhereWithoutOrderInput[]
    deleteMany?: PaymentEventScalarWhereInput | PaymentEventScalarWhereInput[]
  }

  export type PaymentEventUncheckedUpdateManyWithoutOrderNestedInput = {
    create?: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput> | PaymentEventCreateWithoutOrderInput[] | PaymentEventUncheckedCreateWithoutOrderInput[]
    connectOrCreate?: PaymentEventCreateOrConnectWithoutOrderInput | PaymentEventCreateOrConnectWithoutOrderInput[]
    upsert?: PaymentEventUpsertWithWhereUniqueWithoutOrderInput | PaymentEventUpsertWithWhereUniqueWithoutOrderInput[]
    createMany?: PaymentEventCreateManyOrderInputEnvelope
    set?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    disconnect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    delete?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    connect?: PaymentEventWhereUniqueInput | PaymentEventWhereUniqueInput[]
    update?: PaymentEventUpdateWithWhereUniqueWithoutOrderInput | PaymentEventUpdateWithWhereUniqueWithoutOrderInput[]
    updateMany?: PaymentEventUpdateManyWithWhereWithoutOrderInput | PaymentEventUpdateManyWithWhereWithoutOrderInput[]
    deleteMany?: PaymentEventScalarWhereInput | PaymentEventScalarWhereInput[]
  }

  export type OrderCreateNestedOneWithoutPaymentEventsInput = {
    create?: XOR<OrderCreateWithoutPaymentEventsInput, OrderUncheckedCreateWithoutPaymentEventsInput>
    connectOrCreate?: OrderCreateOrConnectWithoutPaymentEventsInput
    connect?: OrderWhereUniqueInput
  }

  export type OrderUpdateOneRequiredWithoutPaymentEventsNestedInput = {
    create?: XOR<OrderCreateWithoutPaymentEventsInput, OrderUncheckedCreateWithoutPaymentEventsInput>
    connectOrCreate?: OrderCreateOrConnectWithoutPaymentEventsInput
    upsert?: OrderUpsertWithoutPaymentEventsInput
    connect?: OrderWhereUniqueInput
    update?: XOR<XOR<OrderUpdateToOneWithWhereWithoutPaymentEventsInput, OrderUpdateWithoutPaymentEventsInput>, OrderUncheckedUpdateWithoutPaymentEventsInput>
  }

  export type UserCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutAuditLogsNestedInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    upsert?: UserUpsertWithoutAuditLogsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditLogsInput, UserUpdateWithoutAuditLogsInput>, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SubscriptionCreateWithoutUserInput = {
    id?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    plan?: PlanCreateNestedOneWithoutSubscriptionsInput
  }

  export type SubscriptionUncheckedCreateWithoutUserInput = {
    id?: string
    planId?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateOrConnectWithoutUserInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
  }

  export type SubscriptionCreateManyUserInputEnvelope = {
    data: SubscriptionCreateManyUserInput | SubscriptionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type OrderCreateWithoutUserInput = {
    id?: string
    orderNo: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    plan: PlanCreateNestedOneWithoutOrdersInput
    paymentEvents?: PaymentEventCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateWithoutUserInput = {
    id?: string
    orderNo: string
    planId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    paymentEvents?: PaymentEventUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderCreateOrConnectWithoutUserInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput>
  }

  export type OrderCreateManyUserInputEnvelope = {
    data: OrderCreateManyUserInput | OrderCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UsageRecordCreateWithoutUserInput = {
    id?: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UsageRecordUncheckedCreateWithoutUserInput = {
    id?: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UsageRecordCreateOrConnectWithoutUserInput = {
    where: UsageRecordWhereUniqueInput
    create: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput>
  }

  export type UsageRecordCreateManyUserInputEnvelope = {
    data: UsageRecordCreateManyUserInput | UsageRecordCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type GenerationJobCreateWithoutUserInput = {
    id?: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GenerationJobUncheckedCreateWithoutUserInput = {
    id?: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GenerationJobCreateOrConnectWithoutUserInput = {
    where: GenerationJobWhereUniqueInput
    create: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput>
  }

  export type GenerationJobCreateManyUserInputEnvelope = {
    data: GenerationJobCreateManyUserInput | GenerationJobCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AdminAuditLogCreateWithoutActorInput = {
    id?: string
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AdminAuditLogUncheckedCreateWithoutActorInput = {
    id?: string
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AdminAuditLogCreateOrConnectWithoutActorInput = {
    where: AdminAuditLogWhereUniqueInput
    create: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput>
  }

  export type AdminAuditLogCreateManyActorInputEnvelope = {
    data: AdminAuditLogCreateManyActorInput | AdminAuditLogCreateManyActorInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionUpsertWithWhereUniqueWithoutUserInput = {
    where: SubscriptionWhereUniqueInput
    update: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
  }

  export type SubscriptionUpdateWithWhereUniqueWithoutUserInput = {
    where: SubscriptionWhereUniqueInput
    data: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type SubscriptionUpdateManyWithWhereWithoutUserInput = {
    where: SubscriptionScalarWhereInput
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyWithoutUserInput>
  }

  export type SubscriptionScalarWhereInput = {
    AND?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
    OR?: SubscriptionScalarWhereInput[]
    NOT?: SubscriptionScalarWhereInput | SubscriptionScalarWhereInput[]
    id?: StringFilter<"Subscription"> | string
    userId?: StringFilter<"Subscription"> | string
    planId?: StringFilter<"Subscription"> | string
    status?: StringFilter<"Subscription"> | string
    billingCycle?: StringFilter<"Subscription"> | string
    currentPeriodStart?: DateTimeFilter<"Subscription"> | Date | string
    currentPeriodEnd?: DateTimeNullableFilter<"Subscription"> | Date | string | null
    cancelAtPeriodEnd?: BoolFilter<"Subscription"> | boolean
    autoRenew?: BoolFilter<"Subscription"> | boolean
    provider?: StringFilter<"Subscription"> | string
    providerSubId?: StringNullableFilter<"Subscription"> | string | null
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
  }

  export type OrderUpsertWithWhereUniqueWithoutUserInput = {
    where: OrderWhereUniqueInput
    update: XOR<OrderUpdateWithoutUserInput, OrderUncheckedUpdateWithoutUserInput>
    create: XOR<OrderCreateWithoutUserInput, OrderUncheckedCreateWithoutUserInput>
  }

  export type OrderUpdateWithWhereUniqueWithoutUserInput = {
    where: OrderWhereUniqueInput
    data: XOR<OrderUpdateWithoutUserInput, OrderUncheckedUpdateWithoutUserInput>
  }

  export type OrderUpdateManyWithWhereWithoutUserInput = {
    where: OrderScalarWhereInput
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyWithoutUserInput>
  }

  export type OrderScalarWhereInput = {
    AND?: OrderScalarWhereInput | OrderScalarWhereInput[]
    OR?: OrderScalarWhereInput[]
    NOT?: OrderScalarWhereInput | OrderScalarWhereInput[]
    id?: StringFilter<"Order"> | string
    orderNo?: StringFilter<"Order"> | string
    userId?: StringFilter<"Order"> | string
    planId?: StringFilter<"Order"> | string
    amount?: IntFilter<"Order"> | number
    currency?: StringFilter<"Order"> | string
    status?: StringFilter<"Order"> | string
    provider?: StringFilter<"Order"> | string
    billingCycle?: StringFilter<"Order"> | string
    providerOrderNo?: StringNullableFilter<"Order"> | string | null
    paidAt?: DateTimeNullableFilter<"Order"> | Date | string | null
    metadata?: JsonNullableFilter<"Order">
    createdAt?: DateTimeFilter<"Order"> | Date | string
    updatedAt?: DateTimeFilter<"Order"> | Date | string
  }

  export type UsageRecordUpsertWithWhereUniqueWithoutUserInput = {
    where: UsageRecordWhereUniqueInput
    update: XOR<UsageRecordUpdateWithoutUserInput, UsageRecordUncheckedUpdateWithoutUserInput>
    create: XOR<UsageRecordCreateWithoutUserInput, UsageRecordUncheckedCreateWithoutUserInput>
  }

  export type UsageRecordUpdateWithWhereUniqueWithoutUserInput = {
    where: UsageRecordWhereUniqueInput
    data: XOR<UsageRecordUpdateWithoutUserInput, UsageRecordUncheckedUpdateWithoutUserInput>
  }

  export type UsageRecordUpdateManyWithWhereWithoutUserInput = {
    where: UsageRecordScalarWhereInput
    data: XOR<UsageRecordUpdateManyMutationInput, UsageRecordUncheckedUpdateManyWithoutUserInput>
  }

  export type UsageRecordScalarWhereInput = {
    AND?: UsageRecordScalarWhereInput | UsageRecordScalarWhereInput[]
    OR?: UsageRecordScalarWhereInput[]
    NOT?: UsageRecordScalarWhereInput | UsageRecordScalarWhereInput[]
    id?: StringFilter<"UsageRecord"> | string
    userId?: StringFilter<"UsageRecord"> | string
    metric?: StringFilter<"UsageRecord"> | string
    used?: IntFilter<"UsageRecord"> | number
    limit?: IntNullableFilter<"UsageRecord"> | number | null
    period?: StringFilter<"UsageRecord"> | string
    resetAt?: DateTimeNullableFilter<"UsageRecord"> | Date | string | null
    createdAt?: DateTimeFilter<"UsageRecord"> | Date | string
    updatedAt?: DateTimeFilter<"UsageRecord"> | Date | string
  }

  export type GenerationJobUpsertWithWhereUniqueWithoutUserInput = {
    where: GenerationJobWhereUniqueInput
    update: XOR<GenerationJobUpdateWithoutUserInput, GenerationJobUncheckedUpdateWithoutUserInput>
    create: XOR<GenerationJobCreateWithoutUserInput, GenerationJobUncheckedCreateWithoutUserInput>
  }

  export type GenerationJobUpdateWithWhereUniqueWithoutUserInput = {
    where: GenerationJobWhereUniqueInput
    data: XOR<GenerationJobUpdateWithoutUserInput, GenerationJobUncheckedUpdateWithoutUserInput>
  }

  export type GenerationJobUpdateManyWithWhereWithoutUserInput = {
    where: GenerationJobScalarWhereInput
    data: XOR<GenerationJobUpdateManyMutationInput, GenerationJobUncheckedUpdateManyWithoutUserInput>
  }

  export type GenerationJobScalarWhereInput = {
    AND?: GenerationJobScalarWhereInput | GenerationJobScalarWhereInput[]
    OR?: GenerationJobScalarWhereInput[]
    NOT?: GenerationJobScalarWhereInput | GenerationJobScalarWhereInput[]
    id?: StringFilter<"GenerationJob"> | string
    userId?: StringFilter<"GenerationJob"> | string
    requestKey?: StringFilter<"GenerationJob"> | string
    kind?: StringFilter<"GenerationJob"> | string
    count?: IntFilter<"GenerationJob"> | number
    status?: StringFilter<"GenerationJob"> | string
    error?: StringNullableFilter<"GenerationJob"> | string | null
    metadata?: JsonNullableFilter<"GenerationJob">
    quotaRefunded?: BoolFilter<"GenerationJob"> | boolean
    startedAt?: DateTimeFilter<"GenerationJob"> | Date | string
    finishedAt?: DateTimeNullableFilter<"GenerationJob"> | Date | string | null
    createdAt?: DateTimeFilter<"GenerationJob"> | Date | string
    updatedAt?: DateTimeFilter<"GenerationJob"> | Date | string
  }

  export type AdminAuditLogUpsertWithWhereUniqueWithoutActorInput = {
    where: AdminAuditLogWhereUniqueInput
    update: XOR<AdminAuditLogUpdateWithoutActorInput, AdminAuditLogUncheckedUpdateWithoutActorInput>
    create: XOR<AdminAuditLogCreateWithoutActorInput, AdminAuditLogUncheckedCreateWithoutActorInput>
  }

  export type AdminAuditLogUpdateWithWhereUniqueWithoutActorInput = {
    where: AdminAuditLogWhereUniqueInput
    data: XOR<AdminAuditLogUpdateWithoutActorInput, AdminAuditLogUncheckedUpdateWithoutActorInput>
  }

  export type AdminAuditLogUpdateManyWithWhereWithoutActorInput = {
    where: AdminAuditLogScalarWhereInput
    data: XOR<AdminAuditLogUpdateManyMutationInput, AdminAuditLogUncheckedUpdateManyWithoutActorInput>
  }

  export type AdminAuditLogScalarWhereInput = {
    AND?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
    OR?: AdminAuditLogScalarWhereInput[]
    NOT?: AdminAuditLogScalarWhereInput | AdminAuditLogScalarWhereInput[]
    id?: StringFilter<"AdminAuditLog"> | string
    actorId?: StringNullableFilter<"AdminAuditLog"> | string | null
    action?: StringFilter<"AdminAuditLog"> | string
    target?: StringFilter<"AdminAuditLog"> | string
    targetId?: StringNullableFilter<"AdminAuditLog"> | string | null
    metadata?: JsonNullableFilter<"AdminAuditLog">
    createdAt?: DateTimeFilter<"AdminAuditLog"> | Date | string
  }

  export type EntitlementCreateWithoutPlanInput = {
    id?: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EntitlementUncheckedCreateWithoutPlanInput = {
    id?: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EntitlementCreateOrConnectWithoutPlanInput = {
    where: EntitlementWhereUniqueInput
    create: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput>
  }

  export type EntitlementCreateManyPlanInputEnvelope = {
    data: EntitlementCreateManyPlanInput | EntitlementCreateManyPlanInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionCreateWithoutPlanInput = {
    id?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSubscriptionsInput
  }

  export type SubscriptionUncheckedCreateWithoutPlanInput = {
    id?: string
    userId: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateOrConnectWithoutPlanInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput>
  }

  export type SubscriptionCreateManyPlanInputEnvelope = {
    data: SubscriptionCreateManyPlanInput | SubscriptionCreateManyPlanInput[]
    skipDuplicates?: boolean
  }

  export type OrderCreateWithoutPlanInput = {
    id?: string
    orderNo: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutOrdersInput
    paymentEvents?: PaymentEventCreateNestedManyWithoutOrderInput
  }

  export type OrderUncheckedCreateWithoutPlanInput = {
    id?: string
    orderNo: string
    userId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    paymentEvents?: PaymentEventUncheckedCreateNestedManyWithoutOrderInput
  }

  export type OrderCreateOrConnectWithoutPlanInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput>
  }

  export type OrderCreateManyPlanInputEnvelope = {
    data: OrderCreateManyPlanInput | OrderCreateManyPlanInput[]
    skipDuplicates?: boolean
  }

  export type EntitlementUpsertWithWhereUniqueWithoutPlanInput = {
    where: EntitlementWhereUniqueInput
    update: XOR<EntitlementUpdateWithoutPlanInput, EntitlementUncheckedUpdateWithoutPlanInput>
    create: XOR<EntitlementCreateWithoutPlanInput, EntitlementUncheckedCreateWithoutPlanInput>
  }

  export type EntitlementUpdateWithWhereUniqueWithoutPlanInput = {
    where: EntitlementWhereUniqueInput
    data: XOR<EntitlementUpdateWithoutPlanInput, EntitlementUncheckedUpdateWithoutPlanInput>
  }

  export type EntitlementUpdateManyWithWhereWithoutPlanInput = {
    where: EntitlementScalarWhereInput
    data: XOR<EntitlementUpdateManyMutationInput, EntitlementUncheckedUpdateManyWithoutPlanInput>
  }

  export type EntitlementScalarWhereInput = {
    AND?: EntitlementScalarWhereInput | EntitlementScalarWhereInput[]
    OR?: EntitlementScalarWhereInput[]
    NOT?: EntitlementScalarWhereInput | EntitlementScalarWhereInput[]
    id?: StringFilter<"Entitlement"> | string
    planId?: StringFilter<"Entitlement"> | string
    key?: StringFilter<"Entitlement"> | string
    label?: StringFilter<"Entitlement"> | string
    value?: StringFilter<"Entitlement"> | string
    unit?: StringFilter<"Entitlement"> | string
    description?: StringFilter<"Entitlement"> | string
    createdAt?: DateTimeFilter<"Entitlement"> | Date | string
    updatedAt?: DateTimeFilter<"Entitlement"> | Date | string
  }

  export type SubscriptionUpsertWithWhereUniqueWithoutPlanInput = {
    where: SubscriptionWhereUniqueInput
    update: XOR<SubscriptionUpdateWithoutPlanInput, SubscriptionUncheckedUpdateWithoutPlanInput>
    create: XOR<SubscriptionCreateWithoutPlanInput, SubscriptionUncheckedCreateWithoutPlanInput>
  }

  export type SubscriptionUpdateWithWhereUniqueWithoutPlanInput = {
    where: SubscriptionWhereUniqueInput
    data: XOR<SubscriptionUpdateWithoutPlanInput, SubscriptionUncheckedUpdateWithoutPlanInput>
  }

  export type SubscriptionUpdateManyWithWhereWithoutPlanInput = {
    where: SubscriptionScalarWhereInput
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyWithoutPlanInput>
  }

  export type OrderUpsertWithWhereUniqueWithoutPlanInput = {
    where: OrderWhereUniqueInput
    update: XOR<OrderUpdateWithoutPlanInput, OrderUncheckedUpdateWithoutPlanInput>
    create: XOR<OrderCreateWithoutPlanInput, OrderUncheckedCreateWithoutPlanInput>
  }

  export type OrderUpdateWithWhereUniqueWithoutPlanInput = {
    where: OrderWhereUniqueInput
    data: XOR<OrderUpdateWithoutPlanInput, OrderUncheckedUpdateWithoutPlanInput>
  }

  export type OrderUpdateManyWithWhereWithoutPlanInput = {
    where: OrderScalarWhereInput
    data: XOR<OrderUpdateManyMutationInput, OrderUncheckedUpdateManyWithoutPlanInput>
  }

  export type PlanCreateWithoutEntitlementsInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutPlanInput
    orders?: OrderCreateNestedManyWithoutPlanInput
  }

  export type PlanUncheckedCreateWithoutEntitlementsInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutPlanInput
    orders?: OrderUncheckedCreateNestedManyWithoutPlanInput
  }

  export type PlanCreateOrConnectWithoutEntitlementsInput = {
    where: PlanWhereUniqueInput
    create: XOR<PlanCreateWithoutEntitlementsInput, PlanUncheckedCreateWithoutEntitlementsInput>
  }

  export type PlanUpsertWithoutEntitlementsInput = {
    update: XOR<PlanUpdateWithoutEntitlementsInput, PlanUncheckedUpdateWithoutEntitlementsInput>
    create: XOR<PlanCreateWithoutEntitlementsInput, PlanUncheckedCreateWithoutEntitlementsInput>
    where?: PlanWhereInput
  }

  export type PlanUpdateToOneWithWhereWithoutEntitlementsInput = {
    where?: PlanWhereInput
    data: XOR<PlanUpdateWithoutEntitlementsInput, PlanUncheckedUpdateWithoutEntitlementsInput>
  }

  export type PlanUpdateWithoutEntitlementsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutPlanNestedInput
    orders?: OrderUpdateManyWithoutPlanNestedInput
  }

  export type PlanUncheckedUpdateWithoutEntitlementsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutPlanNestedInput
    orders?: OrderUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type UserCreateWithoutSubscriptionsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    orders?: OrderCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogCreateNestedManyWithoutActorInput
  }

  export type UserUncheckedCreateWithoutSubscriptionsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    orders?: OrderUncheckedCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordUncheckedCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutActorInput
  }

  export type UserCreateOrConnectWithoutSubscriptionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSubscriptionsInput, UserUncheckedCreateWithoutSubscriptionsInput>
  }

  export type PlanCreateWithoutSubscriptionsInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementCreateNestedManyWithoutPlanInput
    orders?: OrderCreateNestedManyWithoutPlanInput
  }

  export type PlanUncheckedCreateWithoutSubscriptionsInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementUncheckedCreateNestedManyWithoutPlanInput
    orders?: OrderUncheckedCreateNestedManyWithoutPlanInput
  }

  export type PlanCreateOrConnectWithoutSubscriptionsInput = {
    where: PlanWhereUniqueInput
    create: XOR<PlanCreateWithoutSubscriptionsInput, PlanUncheckedCreateWithoutSubscriptionsInput>
  }

  export type UserUpsertWithoutSubscriptionsInput = {
    update: XOR<UserUpdateWithoutSubscriptionsInput, UserUncheckedUpdateWithoutSubscriptionsInput>
    create: XOR<UserCreateWithoutSubscriptionsInput, UserUncheckedCreateWithoutSubscriptionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSubscriptionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSubscriptionsInput, UserUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type UserUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    orders?: OrderUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUpdateManyWithoutActorNestedInput
  }

  export type UserUncheckedUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    orders?: OrderUncheckedUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUncheckedUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput
  }

  export type PlanUpsertWithoutSubscriptionsInput = {
    update: XOR<PlanUpdateWithoutSubscriptionsInput, PlanUncheckedUpdateWithoutSubscriptionsInput>
    create: XOR<PlanCreateWithoutSubscriptionsInput, PlanUncheckedCreateWithoutSubscriptionsInput>
    where?: PlanWhereInput
  }

  export type PlanUpdateToOneWithWhereWithoutSubscriptionsInput = {
    where?: PlanWhereInput
    data: XOR<PlanUpdateWithoutSubscriptionsInput, PlanUncheckedUpdateWithoutSubscriptionsInput>
  }

  export type PlanUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUpdateManyWithoutPlanNestedInput
    orders?: OrderUpdateManyWithoutPlanNestedInput
  }

  export type PlanUncheckedUpdateWithoutSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUncheckedUpdateManyWithoutPlanNestedInput
    orders?: OrderUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type UserCreateWithoutUsageRecordsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutUserInput
    orders?: OrderCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogCreateNestedManyWithoutActorInput
  }

  export type UserUncheckedCreateWithoutUsageRecordsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutUserInput
    orders?: OrderUncheckedCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutActorInput
  }

  export type UserCreateOrConnectWithoutUsageRecordsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUsageRecordsInput, UserUncheckedCreateWithoutUsageRecordsInput>
  }

  export type UserUpsertWithoutUsageRecordsInput = {
    update: XOR<UserUpdateWithoutUsageRecordsInput, UserUncheckedUpdateWithoutUsageRecordsInput>
    create: XOR<UserCreateWithoutUsageRecordsInput, UserUncheckedCreateWithoutUsageRecordsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUsageRecordsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUsageRecordsInput, UserUncheckedUpdateWithoutUsageRecordsInput>
  }

  export type UserUpdateWithoutUsageRecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutUserNestedInput
    orders?: OrderUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUpdateManyWithoutActorNestedInput
  }

  export type UserUncheckedUpdateWithoutUsageRecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutUserNestedInput
    orders?: OrderUncheckedUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput
  }

  export type UserCreateWithoutGenerationJobsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutUserInput
    orders?: OrderCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogCreateNestedManyWithoutActorInput
  }

  export type UserUncheckedCreateWithoutGenerationJobsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutUserInput
    orders?: OrderUncheckedCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutActorInput
  }

  export type UserCreateOrConnectWithoutGenerationJobsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGenerationJobsInput, UserUncheckedCreateWithoutGenerationJobsInput>
  }

  export type UserUpsertWithoutGenerationJobsInput = {
    update: XOR<UserUpdateWithoutGenerationJobsInput, UserUncheckedUpdateWithoutGenerationJobsInput>
    create: XOR<UserCreateWithoutGenerationJobsInput, UserUncheckedCreateWithoutGenerationJobsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGenerationJobsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGenerationJobsInput, UserUncheckedUpdateWithoutGenerationJobsInput>
  }

  export type UserUpdateWithoutGenerationJobsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutUserNestedInput
    orders?: OrderUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUpdateManyWithoutActorNestedInput
  }

  export type UserUncheckedUpdateWithoutGenerationJobsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutUserNestedInput
    orders?: OrderUncheckedUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput
  }

  export type UserCreateWithoutOrdersInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogCreateNestedManyWithoutActorInput
  }

  export type UserUncheckedCreateWithoutOrdersInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordUncheckedCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AdminAuditLogUncheckedCreateNestedManyWithoutActorInput
  }

  export type UserCreateOrConnectWithoutOrdersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutOrdersInput, UserUncheckedCreateWithoutOrdersInput>
  }

  export type PlanCreateWithoutOrdersInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementCreateNestedManyWithoutPlanInput
    subscriptions?: SubscriptionCreateNestedManyWithoutPlanInput
  }

  export type PlanUncheckedCreateWithoutOrdersInput = {
    id: string
    name: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number
    currency?: string
    sortOrder?: number
    isActive?: boolean
    isPopular?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    entitlements?: EntitlementUncheckedCreateNestedManyWithoutPlanInput
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutPlanInput
  }

  export type PlanCreateOrConnectWithoutOrdersInput = {
    where: PlanWhereUniqueInput
    create: XOR<PlanCreateWithoutOrdersInput, PlanUncheckedCreateWithoutOrdersInput>
  }

  export type PaymentEventCreateWithoutOrderInput = {
    id?: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PaymentEventUncheckedCreateWithoutOrderInput = {
    id?: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PaymentEventCreateOrConnectWithoutOrderInput = {
    where: PaymentEventWhereUniqueInput
    create: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput>
  }

  export type PaymentEventCreateManyOrderInputEnvelope = {
    data: PaymentEventCreateManyOrderInput | PaymentEventCreateManyOrderInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutOrdersInput = {
    update: XOR<UserUpdateWithoutOrdersInput, UserUncheckedUpdateWithoutOrdersInput>
    create: XOR<UserCreateWithoutOrdersInput, UserUncheckedCreateWithoutOrdersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutOrdersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutOrdersInput, UserUncheckedUpdateWithoutOrdersInput>
  }

  export type UserUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUpdateManyWithoutActorNestedInput
  }

  export type UserUncheckedUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUncheckedUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AdminAuditLogUncheckedUpdateManyWithoutActorNestedInput
  }

  export type PlanUpsertWithoutOrdersInput = {
    update: XOR<PlanUpdateWithoutOrdersInput, PlanUncheckedUpdateWithoutOrdersInput>
    create: XOR<PlanCreateWithoutOrdersInput, PlanUncheckedCreateWithoutOrdersInput>
    where?: PlanWhereInput
  }

  export type PlanUpdateToOneWithWhereWithoutOrdersInput = {
    where?: PlanWhereInput
    data: XOR<PlanUpdateWithoutOrdersInput, PlanUncheckedUpdateWithoutOrdersInput>
  }

  export type PlanUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUpdateManyWithoutPlanNestedInput
    subscriptions?: SubscriptionUpdateManyWithoutPlanNestedInput
  }

  export type PlanUncheckedUpdateWithoutOrdersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    monthlyPrice?: IntFieldUpdateOperationsInput | number
    yearlyPrice?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isPopular?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    entitlements?: EntitlementUncheckedUpdateManyWithoutPlanNestedInput
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutPlanNestedInput
  }

  export type PaymentEventUpsertWithWhereUniqueWithoutOrderInput = {
    where: PaymentEventWhereUniqueInput
    update: XOR<PaymentEventUpdateWithoutOrderInput, PaymentEventUncheckedUpdateWithoutOrderInput>
    create: XOR<PaymentEventCreateWithoutOrderInput, PaymentEventUncheckedCreateWithoutOrderInput>
  }

  export type PaymentEventUpdateWithWhereUniqueWithoutOrderInput = {
    where: PaymentEventWhereUniqueInput
    data: XOR<PaymentEventUpdateWithoutOrderInput, PaymentEventUncheckedUpdateWithoutOrderInput>
  }

  export type PaymentEventUpdateManyWithWhereWithoutOrderInput = {
    where: PaymentEventScalarWhereInput
    data: XOR<PaymentEventUpdateManyMutationInput, PaymentEventUncheckedUpdateManyWithoutOrderInput>
  }

  export type PaymentEventScalarWhereInput = {
    AND?: PaymentEventScalarWhereInput | PaymentEventScalarWhereInput[]
    OR?: PaymentEventScalarWhereInput[]
    NOT?: PaymentEventScalarWhereInput | PaymentEventScalarWhereInput[]
    id?: StringFilter<"PaymentEvent"> | string
    orderId?: StringFilter<"PaymentEvent"> | string
    provider?: StringFilter<"PaymentEvent"> | string
    eventType?: StringFilter<"PaymentEvent"> | string
    providerEventId?: StringNullableFilter<"PaymentEvent"> | string | null
    payload?: JsonNullableFilter<"PaymentEvent">
    createdAt?: DateTimeFilter<"PaymentEvent"> | Date | string
  }

  export type OrderCreateWithoutPaymentEventsInput = {
    id?: string
    orderNo: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutOrdersInput
    plan: PlanCreateNestedOneWithoutOrdersInput
  }

  export type OrderUncheckedCreateWithoutPaymentEventsInput = {
    id?: string
    orderNo: string
    userId: string
    planId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderCreateOrConnectWithoutPaymentEventsInput = {
    where: OrderWhereUniqueInput
    create: XOR<OrderCreateWithoutPaymentEventsInput, OrderUncheckedCreateWithoutPaymentEventsInput>
  }

  export type OrderUpsertWithoutPaymentEventsInput = {
    update: XOR<OrderUpdateWithoutPaymentEventsInput, OrderUncheckedUpdateWithoutPaymentEventsInput>
    create: XOR<OrderCreateWithoutPaymentEventsInput, OrderUncheckedCreateWithoutPaymentEventsInput>
    where?: OrderWhereInput
  }

  export type OrderUpdateToOneWithWhereWithoutPaymentEventsInput = {
    where?: OrderWhereInput
    data: XOR<OrderUpdateWithoutPaymentEventsInput, OrderUncheckedUpdateWithoutPaymentEventsInput>
  }

  export type OrderUpdateWithoutPaymentEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutOrdersNestedInput
    plan?: PlanUpdateOneRequiredWithoutOrdersNestedInput
  }

  export type OrderUncheckedUpdateWithoutPaymentEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionCreateNestedManyWithoutUserInput
    orders?: OrderCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    name?: string
    password?: string | null
    phone?: string | null
    emailVerified?: Date | string | null
    phoneVerified?: Date | string | null
    avatarUrl?: string | null
    githubId?: string | null
    role?: string
    bannedAt?: Date | string | null
    banReason?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    subscriptions?: SubscriptionUncheckedCreateNestedManyWithoutUserInput
    orders?: OrderUncheckedCreateNestedManyWithoutUserInput
    usageRecords?: UsageRecordUncheckedCreateNestedManyWithoutUserInput
    generationJobs?: GenerationJobUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAuditLogsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
  }

  export type UserUpsertWithoutAuditLogsInput = {
    update: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type UserUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUpdateManyWithoutUserNestedInput
    orders?: OrderUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    phoneVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    githubId?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    bannedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    banReason?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    subscriptions?: SubscriptionUncheckedUpdateManyWithoutUserNestedInput
    orders?: OrderUncheckedUpdateManyWithoutUserNestedInput
    usageRecords?: UsageRecordUncheckedUpdateManyWithoutUserNestedInput
    generationJobs?: GenerationJobUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SubscriptionCreateManyUserInput = {
    id?: string
    planId?: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderCreateManyUserInput = {
    id?: string
    orderNo: string
    planId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UsageRecordCreateManyUserInput = {
    id?: string
    metric: string
    used?: number
    limit?: number | null
    period?: string
    resetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GenerationJobCreateManyUserInput = {
    id?: string
    requestKey: string
    kind: string
    count?: number
    status?: string
    error?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: boolean
    startedAt?: Date | string
    finishedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AdminAuditLogCreateManyActorInput = {
    id?: string
    action: string
    target: string
    targetId?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type SubscriptionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    plan?: PlanUpdateOneWithoutSubscriptionsNestedInput
  }

  export type SubscriptionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    plan?: PlanUpdateOneRequiredWithoutOrdersNestedInput
    paymentEvents?: PaymentEventUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paymentEvents?: PaymentEventUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsageRecordUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    metric?: StringFieldUpdateOperationsInput | string
    used?: IntFieldUpdateOperationsInput | number
    limit?: NullableIntFieldUpdateOperationsInput | number | null
    period?: StringFieldUpdateOperationsInput | string
    resetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GenerationJobUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    requestKey?: StringFieldUpdateOperationsInput | string
    kind?: StringFieldUpdateOperationsInput | string
    count?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    error?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    quotaRefunded?: BoolFieldUpdateOperationsInput | boolean
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    finishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUpdateWithoutActorInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateWithoutActorInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AdminAuditLogUncheckedUpdateManyWithoutActorInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    target?: StringFieldUpdateOperationsInput | string
    targetId?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementCreateManyPlanInput = {
    id?: string
    key: string
    label: string
    value: string
    unit?: string
    description?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateManyPlanInput = {
    id?: string
    userId: string
    status?: string
    billingCycle?: string
    currentPeriodStart?: Date | string
    currentPeriodEnd?: Date | string | null
    cancelAtPeriodEnd?: boolean
    autoRenew?: boolean
    provider?: string
    providerSubId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrderCreateManyPlanInput = {
    id?: string
    orderNo: string
    userId: string
    amount: number
    currency?: string
    status?: string
    provider?: string
    billingCycle?: string
    providerOrderNo?: string | null
    paidAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EntitlementUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementUncheckedUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EntitlementUncheckedUpdateManyWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSubscriptionsNestedInput
  }

  export type SubscriptionUncheckedUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: DateTimeFieldUpdateOperationsInput | Date | string
    currentPeriodEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cancelAtPeriodEnd?: BoolFieldUpdateOperationsInput | boolean
    autoRenew?: BoolFieldUpdateOperationsInput | boolean
    provider?: StringFieldUpdateOperationsInput | string
    providerSubId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrderUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutOrdersNestedInput
    paymentEvents?: PaymentEventUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    paymentEvents?: PaymentEventUncheckedUpdateManyWithoutOrderNestedInput
  }

  export type OrderUncheckedUpdateManyWithoutPlanInput = {
    id?: StringFieldUpdateOperationsInput | string
    orderNo?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    amount?: IntFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    billingCycle?: StringFieldUpdateOperationsInput | string
    providerOrderNo?: NullableStringFieldUpdateOperationsInput | string | null
    paidAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventCreateManyOrderInput = {
    id?: string
    provider: string
    eventType: string
    providerEventId?: string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type PaymentEventUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventUncheckedUpdateWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PaymentEventUncheckedUpdateManyWithoutOrderInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    providerEventId?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}