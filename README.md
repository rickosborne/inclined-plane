inclined-plane
==============

Yet another cheap and simple dependency injection library for TypeScript.

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

Given a normal service/bean/component which you **don't** need to export, identify it by decorating it:

```typescript
import {Logger} from './path/to/Logger';

@Logger.provider
class ConsoleLogger implements Logger {
  debug(message: string) {
    console.log(message);
  }
}
```

It can now be automagically instantiated and injected via constructor parameters:

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

You can get a managed instance from the `InjectableType` instance or from the `buildInstance` function for unmanaged types:

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

In your main/index, you'll want to ensure that you `import` all your injected services/beans/components.
Because they are not directly referenced, they won't be seen unless their files are imported!

```typescript
import './path/to/ConsoleLogger';
```

You don't need to do anything more—just import the file.
Generally, this is easiest to do by defining a file like `services.ts` or `implementations.ts` that lists all injectable imports, then include that one file from your main/index.

## Questions

 * **Can I inject implementations based on type parameters?**
 
   Nope.
   You're trying to do something like this, right?
   
   ```typescript
   interface Enclosure<T> { /* ... */ }
   interface Animal { /* ... */ }

   const Enclosure = injectableType<Enclosure<any>>('Enclosure');

   class Widget {
     constructor(
       @Enclosure.require private readonly animalEnclosure: Enclosure<Animal>,
     ) {}
   }
   ```
   
   There are no plans to support this any time soon, as the complete lack of runtime type info makes this painful if not impossible.

## License

Copyright 2019 [Rick Osborne](https://rickosborne.org)

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
You may obtain a copy of the License at: [Apache 2.0 License](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
