inclined-plane
==============

Yet another cheap and simple dependency injection library for TypeScript.

## Installation

Just like you'd expect:

```bash
npm install --save inclined-plane
```

## Usage

Define a perfectly normal interface.
You probably want to export it.

```typescript
export interface Logger {
  debug(message: string): void;
}
```

Create the `InjectableType` version **with the same name**:

```typescript
import {injectableType} from 'inclined-plane';

export interface Logger {
  debug(message: string): void;
}

export const Logger = injectableType<Logger>('Logger');
```

Yes, the syntax there is a little redundant because we need both compile- and run-time type information.

The type identifier can now be used to produce decorators:

| Decorator | Target | Example | Intent |
| --------- | ------ | ------- | ------ |
| `.implementation` | Class | <code>@Logger.implementation<br>class LoggerImpl implements Logger {</code> | The decorated class is an implementation of the type. |
| `.accessor` | Method | <code>class LoggerBuilder {<br>@Logger.accessor<br>buildLogger(): Logger {</code> | The decorated instance method can be called to get instances of the type. |
| `.supplier` | Method | <code>class LoggerBuilder {<br>@Logger.supplier<br>static buildLogger(): Logger {</code> | The decorated static method can be called to get instances of the type. |
| `.required` | Param | <code>constructor(<br>@Logger.required private readonly logger: Logger<br>) {}</code> | A value of that type for the parameter is required. |
| `.optional` | Param | (same as above) | A value of that type should be provided, or undefined if not available. |
| `.inject` | Property | <code>class Whatever {<br>@Logger.inject private readonly logger?: Logger;</code> | A value of that type should be injected into that property. |

### Implementations: `.implementation`, `.supplier`, and `.accessor`

Given a normal service/bean/component which you **don't** need to export, identify it by decorating it:

```typescript
import {Logger} from './path/to/Logger';

@Logger.implementation
class ConsoleLogger implements Logger {
  debug(message: string) {
    console.log(message);
  }
}
```

Or decorate an instance method:

```typescript
class LoggerBuilder {
  @Logger.accessor
  public buildLogger(): Logger {
    return new ConsoleLogger();
  } 
}
```

Or decorate a static method:

```typescript
class LoggerBuilder {
  @Logger.supplier
  public static buildLogger(): Logger {
    return new ConsoleLogger();
  }
}
```

It can now be automagically instantiated and injected.
You can get a managed instance from the `InjectableType` instance or from the `buildInstance` function for classes that aren't decorated as providers:

```typescript
import {buildInstance} from 'inclined-plane';
import {Logger} from './path/to/Logger';
import {WidgetService} from './path/to/WidgetService';

const logger = Logger.getInstance();  // will be a ConsoleLogger
const widgetService = buildInstance(WidgetService);
```

If you have multiple providers for a given type, you can ask for all of them with `getInstances()`:

```typescript
const loggers = Logger.getInstances();
```

Note that this will return an empty array if no providers have been loaded/imported.

In your main/index, you'll want to ensure that you `import` all your injectable services/beans/components.
Because they are not directly referenced, they won't be seen unless their files are imported!

```typescript
import './path/to/ConsoleLogger';
```

You don't need to do anything more—just import the file.
Generally, this is easiest to do by defining a file like `services.ts` or `implementations.ts` that lists all injectable imports, then include that one file from your main/index.

### Parameters: `.required` and `.optional`

Constructor parameters can be decorated for injection:

```typescript
import {DatabaseAdapter} from './path/to/DatabaseAdapter';
import {Logger} from './path/to/Logger';

export class WidgetService {
  constructor(
    @DatabaseAdapter.require private readonly db: DatabaseAdapter,
    @Logger.optional private readonly logger: Logger,
  ) {}
}
```

### Dependency Cycles and Properties: `.inject`

Sometimes your type system will end up complex enough to have cycles:

```typescript
interface Left {
  right: Right | undefined;
}
interface Right {
  left: Left | undefined;
}

const Left = injectableType<Left>('Left');
const Right = injectableType<Right>('Right');

@Left.implementation
class LeftImpl implements Left {
  constructor(@Right.required private readonly right?: Right) {}
}

@Right.implementation
class RightImpl implements Right {
  constructor(@Left.required private readonly left?: Left) {}
}

```

When attempting to build an instance you'll see a message like:

> Dependency cycle detected while trying to build ...

You can break these cycles by moving injected items from constructor parameters to properties with the `.inject` decorator:

```typescript
class LeftImpl {
  @Right.inject private readonly right: Right | undefined;
}
class RightImpl {
  @Left.inject private readonly left: Left | undefined;
}
```

## Use `postConstruct` for delayed initialization

Properties values injected via `.inject` are not available in the constructor:

```typescript
class LeftImpl {
  @Right.inject private readonly right: Right | undefined;
  
  constructor() {
    console.log(this.right);  // undefined
  }
}
```

Instead, you can define a `postConstruct()` method (see the `ManagedInstance` interface) to be called when all managed values have been injected:

```typescript
import {ManagedInstance} from 'inclined-plane';

class LeftImpl implements ManagedInstance {
  @Right.inject private readonly right: Right | undefined;
  
  protected postConstruct() {
    console.log(this.right);  // not undefined
  }
}
```

Generally, you'll want to make this `protected` so it's not visible to other types, but you can still call it from subclasses for testing purposes.

Note that `.inject` has the same semantics as `.optional` and **not** `.required`: it will silently allow an `undefined` value if no providers can be found for the type.
Add a guard condition in `postConstruct()` to detect `undefined` if necessary.

## Questions

 * **Can I inject implementations based on type parameters?**
 
   Nope.
   You're trying to do something like this, right?
   
   ```typescript
   interface Enclosure<T> { /* ... */ }
   interface Animal { /* ... */ }

   const Enclosure = injectableType<Enclosure<any>>('Enclosure');

   class ZooBuilding {
     constructor(
       @Enclosure.require private readonly animalEnclosure: Enclosure<Animal>,
     ) {}
   }
   ```
   
   There are no plans to support this any time soon, as the complete lack of runtime type info makes this painful if not impossible.

## Release Notes

* v0.5.0 2019-03-25

  * Added `.accessor` for instance methods.

* v0.4.0 2019-03-25

  * **Breaking**: Renamed `.provider` to `.implementation`
  * Fixed: Supplier method names are no longer empty
  * New: Introduced `InstanceResolver` to allow custom logic for tests 

* v0.3.0 2019-03-16

  * Support `.supplier` for static methods.

* v0.2.2 2019-03-15

  * Clean up .npmignore (no code changes)

* v0.2.1 2019-03-15

  * Cover the case where super classes need values injected. 

* v0.2.0 2019-03-15

  * Support `@Type.inject` for late property injection.
    It would be nice to be able to reuse the existing decorators, but see [TypeScript issue 10777](https://github.com/Microsoft/TypeScript/issues/10777).
  * Add detection of dependency cycles.
  * Documentation for `postConstruct()`.
  * A bunch of JSDoc for curious people.

* v0.1.0 2019-03-14

  * Initial release.

## License

Copyright 2019 [Rick Osborne](https://rickosborne.org)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
You may obtain a copy of the License at: [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
