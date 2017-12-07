var {Observer, Observable, Subscription} = require("../src/Observer.es6");

var code = 0;
function assert(truth, desc, ...items){
    if(!truth){
        console.error(desc,truth,items);
        code = 1;
    }
}
function assertThrow(funxn, desc, ...items){
    try{
        funxn();
        console.error(desc, funxn, items);
        code = 1;
    }catch (e){}
}

assert(Observer, "Observer not imported");
assert(Observable, "Observable not imported");
assert(Subscription, "Subscription not imported");

//instantiation
assert(new Observer(()=>{}), "Observer instance failed");
assertThrow(()=>{new Observer()}, "Failed to throw on missing next function");
assert(new Observer(()=>{},()=>{},()=>{}), "Observer instance failed");
assertThrow(()=>{new Observer(()=>{},{},{})}, "Failed to throw on bad complete/error function");

assert(new Observable(), "Observable instance failed");
assert((new Observable())[Symbol.for("Observable.subscriber")], "Observable failed to add noop subscriber");

assert(new Subscription(),"Failed to instantiate Subscription");
assert((new Subscription(()=>{}))[Symbol.for("Subscription.cleanup")], "Failed to instantiate Subscription with cleanup function");
assert((new Subscription())[Symbol.for("Subscription.cleanup")] == null, "Failed to ignore bad cleanup function");
assert((new Subscription({}))[Symbol.for("Subscription.cleanup")] == null, "Failed to ignore bad cleanup function");