/**
 * @returns {Console}
 * @private
 */
function _console(){
    if(typeof window != "undefined" && window.console) return window.console;
    if(typeof self != "undefined" && self.console) return self.console;
    if(this.console) return this.console;
    if(typeof console != "undefined") return console;
}
function SimpleMapPolyfill(iterable){
    let me = new Array(iterable);
    for(var i = 0; i < me.length; i++){
        this.set(me[i][0], me[i][1]);
    }
    this.keys = {};
    this.size = 0;
    this.id = "_$$mid" + SimpleMapPolyfill.count++;
}
SimpleMapPolyfill.count = 0;
SimpleMapPolyfill.prototype.get = function(key){
    if(key instanceof Object){
        key = key[this.id];
    }
    return this.keys[key+""];
};
SimpleMapPolyfill.prototype.set = function(key , value){
    if(key instanceof Object){
        key = key[this.id] = '_' + Math.random().toString(36).substr(2, 9);
    }
    if(!this.has(key) && value !== undefined) this.size++;
    this.keys[key+""] = value;
};
SimpleMapPolyfill.prototype.has = function(key){
    if(key instanceof Object){
        key = key[this.id];
    }
    return this.keys.hasOwnProperty(key+"");
};
SimpleMapPolyfill.prototype.delete = function(key){
    if(key instanceof Object){
        key = key[this.id];
    }
    let result = this.has(key);
    delete this.keys[key+""];
    if(result) this.size--;
    return result;
};
SimpleMapPolyfill.prototype.clear = function(){
    this.keys = {};
    this.size = 0;
};
/**
 *
 * @param next {function(*)} callback on new stream value
 * @param error {function(Object)} callback on stream error
 * @param complete {function()} callback on completion of stream
 * @constructor
 */
function Observer (next, error, complete){
    this.next = next;
    this.error = error;
    this.complete = complete;
}
Observer.to = Observer;

class Observable {
    constructor(subscriber){
        if(typeof subscriber == "function"){
            this.subscriber = subscriber;
        }else{
            _console().warn("No Subscription Function was passed into the Observable. Therefore this Observable will do nothing.", this, subscriber);
            this.subscriber = function(){};
        }
        this.map = typeof WeakMap != "undefined" ? new WeakMap() : new SimpleMapPolyfill();
    }

    // Subscribes to the sequence with an observer
    subscribe(observer : Observer) : Subscription {
        if(!observer) return _console().error("Observer subscription attempted, but the Observer did not exist", this, observer);
        if(!(typeof observer.next == "function")) return _console().error("Observer subscription attempted, but the argument was not an Observer.", this, observer);

        this.map.set(observer, observer);
        let sub = this.subscriber(observer);
        return sub && sub.unsubscribe ? sub : new Subscription(sub);
    }

    // Subscribes to the sequence with callbacks
    subscribe(onNext, onError, onComplete) : Subscription{

    }

    // Converts items to an Observable
    static of(...items) : Observable{

    }

    // Converts an observable or iterable to an Observable
    static from(observable) : Observable{

    }
}
class Subscription extends Function{

    constructor(fun){
        if(!fun) return;

        var hasCallee = false;
        try{ hasCallee = !!arguments.callee;}catch(e){}

        if(hasCallee){
            //legacy
            if(fun instanceof Function){
                super("return arguments.callee.unsubscribe();");
            }
        } else {
            if(!Subscription.map && typeof WeakMap != "undefined"){
                Subscription.map = new WeakMap();
            }else if (!Subscription.map){
                Subscription.map = new SimpleMapPolyfill();
                _console().warn("No WeakMaps in this environment. All Subscriptions must be CLOSED to prevent memory leaks.");
            }

            Subscription.keys = Subscription.keys || {size:0};
            this._id = '_' + Subscription.keys.size;
            super("return Subscription.map.get(Subscription.keys['"+this._id+"']).unsubscribe();");

            Subscription.map.set(Subscription.keys[this._id] = {}, this);
            Subscription.keys.size++;
        }

        this._fun = fun;
    }

    unsubscribe() {
        if(this.closed) return;
        this._closed = true;

        let resp = this._fun && this._fun();

        //remove/null all references
        Subscription.map.delete(Subscription.keys[ this._id ]);
        Subscription.keys[ this._id ] = this._fun = null;

        return resp;
    }

    get closed(){
        return this._closed;
    }

}

function SubscriberFunction(observer:Observer) : cleanupFunction|Subscription;


//PATH
//declare the SubscriberFunction, which accepts Observers and 'subscribes' them to the data stream, meaning it sets up
//their listeners.
//Pass that into the Observable, which is the listener handler. As Observers are subscribed to the handler, they
//are given to the SubscriberFunction, and the subscriber Function result converted into a Subscription and returned
//back from the subscribe.