# js-observables
A completely custom implementation of ES7 (or ES8) Observables. With some sugar.

Based on a proposal [ES Observables](https://github.com/tc39/proposal-observable).

## Install

```sh
npm install js-observables
```

## Import

Node:

```js
var {Observable, Observer} = require("js-observables");
Observable.of(1, 2, 3).subscribe(x => console.log(x));
```

Browser:

```html
<script src="js-observables/observables.js"></script>
<script>
    Observable.of(1, 2, 3).subscribe(x => console.log(x));
</script>
```

ES6:

```js
import {Observable, Observer} from "js-observable/observables.js";
Observable.of(1, 2, 3).subscribe(x => console.log(x));
```

## API

### new Observable ( subscribe )

```js
let observable = new Observable(observer => {
    // Emit a single value after 1 second
    let timer = setTimeout( () => {
        observer.next("hello");
        observer.complete();
    }, 1000);

    // On unsubscription, cancel the timer
    return () => clearTimeout(timer);
});
```

Creates a new Observable object using the specified subscriber function.  The subscriber function is called whenever the `subscribe` method of the observable object is invoked.  The subscriber function is passed an *observer* object which has the following methods:

- `next(value)` Sends the next value in the sequence.
- `error(exception)` Optional. Terminates the sequence with an exception.
- `complete()` Optional. Terminates the sequence successfully.

The subscriber function can optionally return either a cleanup function or a Subscription object.  If it returns a cleanup function, that function will be called when the subscription has closed.  If it returns a Subscription object, then the Subscription's `unsubscribe` method will be invoked when the Observer 'complete' method is called. `unsubscribe` can also be called directly to remove the Observer from the stream.

### Observable.of ( Iterable | ...items )

```js
// Logs 1, 2, 3
Observable.of(1, 2, 3).subscribe(x => {
    console.log(x);
});
// Logs 1, 2, 3
Observable.of([1, 2, 3]).subscribe(x => {
    console.log(x);
});
```
Returns an observable which will emit each supplied argument.

If you want this to emit one (Iterable) argument and not expand the Iterable, just wrap it in an array:
```js
//If you want to log [1,2,3] instead
Observable.of([[1, 2, 3]]).subscribe(x => {
    console.log(x);
});
```

### Observable.from ( Iterable | Observable )

```js
let list = [1, 2, 3]; 
//or
let list = {
  data : [1, 2, 3],
  [Symbol.iterator] : function(){
    return this.data[Symbol.iterator]();
  }
}

// Iterate over an iterable object. Equivalent to Observable.of(list)
Observable.from(list).subscribe(x => {
    console.log(x);
});
```

```js
// Convert something "observable" to an Observable instance
Observable.from(otherObservable).subscribe(x => {
    console.log(x);
});
```

Converts `value` to an Observable.

- If `value` is any implementation of an Observable which has a `subscribe` method (and thus must have already been given a subscription function), then it is 'wrapped' by an instance of Observable as defined by this library.
- Otherwise if it's an Iterable, it is converted to an Observable which synchronously iterates over the values.

### observable.subscribe ( Observer | functions ) Very flexible

```js
let subscription = observable.subscribe({
    next(x) { console.log(x) },
    error(err) { console.log(`Finished with error: ${ err }`) },
    complete() { console.log("Finished") }
})
let subscription2 = observable.subscribe({
    next(x) { console.log(x) }
})
let subscription3 = observable.subscribe(new Observer(
    x => console.log(x),
    err => console.log(`Finished with error: ${ err }`),
    () => console.log("Finished")
));
let subscription3 = observable.subscribe(new Observer(
    x => console.log(x)
));
let subscription3 = observable.subscribe(
    x => console.log(x),
    err => console.log(`Finished with error: ${ err }`),
    () => console.log("Finished")
);
let subscription3 = observable.subscribe( x => console.log(x) );
```

Subscribes to the observable.  The `observer` argument, if an object, may have the following methods:

- `start(subscription)` Optional. Receives the subscription object during initialization.
- `next(value)` Receives the next value of the sequence.
- `error(exception)` Optional. Receives the terminating error of the sequence.
- `complete()` Options. Called when the stream has completed successfully.

If the arguments are functions, the only required function is "next", the first argument. Function arguments will be internally convered into an Observer object.

The subscription object returned by this call can be used to remove the observer from the stream.

```js
// Stop receiving data from the stream
subscription.unsubscribe();
```
However this will NOT trigger the `complete` callback.