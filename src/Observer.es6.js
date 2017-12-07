(function(r,f){if(typeof define=='function'&&define.amd){define([], f)}else if(typeof exports=='object'){module.exports = f()}else{var x = f();r.JsObserver = x.Observer;r.JsObservable = x.Observable;r.JsSubscription = x.Subscription}}(this,function()
{

    /**
     * @returns {Console}
     * @private
     */
    function _console(){
        if(typeof window != "undefined" && window.console) return window.console;
        if(typeof self != "undefined" && self.console) return self.console;
        if(this.console) return this.console;
        if(typeof console != "undefined") return console;

        let con = {};
        con.error = con.warn = con.log = ()=>{};
        return con;
    }

    class Observer {
        constructor(next, error, complete){
            if(!(next instanceof Function)) throw "Invalid arguments. The 'next' function cannot be null.";
            if(error && !(error instanceof Function)){
                _console.error("Invalid error function provided to Observer creation", this, error);
                error = undefined;
            }
            if(complete && !(complete instanceof Function)){
                _console.error("Invalid complete function provided to Observer creation", this, ercompleteror);
                complete = undefined;
            }

            this[Symbol.for("Observer.next")] = next;
            this[Symbol.for("Observer.error")] = error;
            this[Symbol.for("Observer.complete")] = complete;

            this._isComplete = false;

            //bind this, because it's much more useful this way
            this.start = this.start.bind(this);
            this.next = this.next.bind(this);
            this.error = this.error.bind(this);
            this.complete = this.complete.bind(this);
        }

        /**
         * Is this Observer closed. The big question here, is do we allow non-subscribed Observers to be closed.
         * Which basically means, do we allow Observers without subscriptions.
         * I think it's ok. Subscription is just a cleanup. If you don't have cleanup, its fine.
         * And technically you can't be closed without a subscription.
         * @returns {boolean}
         */
        get closed (){
            return !!this[Symbol.for("Observer.subscription")] && this[Symbol.for("Observer.subscription")].closed
                || this._isComplete;
        }

        /**
         * Receives the subscription object when `subscribe` is called
         * @param subscription {Subscription}
         */
        start(subscription){
            if(this[Symbol.for("Observer.subscription")] && !this[Symbol.for("Observer.subscription")].closed){
                _console().error("Invalid state. Observer is already subscribed", this, this[Symbol.for("Observer.subscription")], subscription);
                throw "Invalid state. Observer is already subscribed";
            }
            if(!(subscription instanceof Subscription) || subscription.closed){
                _console().error("Invalid subscription.", this, subscription);
            }
            else{
                this[Symbol.for("Observer.subscription")] = subscription;
                this._isComplete = false;
            }
        }

        /** @param value {*} */
        next(value){
            if(this.closed)
                return;

            return this[Symbol.for("Observer.next")].call(this, value);
        }

        /**  @param errorValue {Object} */
        error(errorValue){
            let myerror = this[Symbol.for("Observer.error")];
            if(this.closed || !(myerror instanceof Function))
                return;

            return myerror.call(this, errorValue);
        }

        complete(){
            if(this.closed) return;

            let mycomplete = this[Symbol.for("Observer.complete")];
            if( mycomplete instanceof Function ) {
                var result = mycomplete.call(this);
            }

            let sym = Symbol.for("Observer.subscription");

            this[sym] && this[sym].unsubscribe();
            this[sym] = null;
            this._isComplete = true;

            return result;
        }

        static to (onNext, onError, onComplete ){
            return new Observer(onNext, onError, onComplete);
        }

        /**
         * @param instance {Object}
         * @returns {boolean}
         * @static
         */
        static [Symbol.hasInstance](instance) {
            return !!instance && instance.next instanceof Function;
        }
    }

    class Observable {
        /**
         * @param subscriber {function(Observer):(Function|Subscription)}
         */
        constructor(subscriber){
            if(subscriber instanceof Function){
                this[Symbol.for("Observable.subscriber")] = subscriber;
            }
            else{
                _console().warn("No Subscription Function was passed into the Observable. Therefore this Observable will do nothing.", this, subscriber);
                this[Symbol.for("Observable.subscriber")] = function(){};
            }
        }

        /**
         *
         * @param observerOrNext {function(*)|Observer}
         * @param onError {function(Object)=}
         * @param onComplete {function()=}
         * @returns {Subscription}
         */
        subscribe(observerOrNext, onError, onComplete) {
            if(!observerOrNext)
                return _console().error("Observer subscription attempted, but the arguments are empty", this, observerOrNext);

            if(observerOrNext instanceof Function){
                observerOrNext = new Observer(observerOrNext, onError, onComplete);
            }
            if(!(observerOrNext instanceof Observer))
                return _console().error("Observer subscription attempted, but the argument was not an Observer.", this, observerOrNext);

            /** @type {Observer}*/
            let observer = observerOrNext;

            /** Can be cleanup function or an actual Subscription
             * @type {Function|Subscription}*/
            let cleanup = this[Symbol.for("Observable.subscriber")](observer);
            /** @type {Subscription}*/
            let sub = cleanup instanceof Subscription ? cleanup : new Subscription(cleanup);

            if(observer.start instanceof Function) observer.start(sub);

            return sub;
        }

        /**
         * Accepts an argument list or an array, and creates an Observable
         * which emits those values synchronously when subscribed to
         * @param first {Array|*}
         * @param items {Array=}
         * @returns {Observable}
         */
        static of(first, ...items){
            if( items.length != 0 || typeof first[Symbol.iterator] == "undefined" ){
                first = items.unshift(first) && items;
            }
            var iterator = first[Symbol.iterator]();
            let myClass = this.prototype instanceof Observable ? this : Observable;

            return new myClass( (observer) => {
                for (let entry of iterator) {
                    observer.next(entry);
                }
                (observer.complete instanceof Function) && observer.complete();
            });
        }

        // Converts an observable or iterable to an Observable
        static from(observable){
            if(observable instanceof Observable){
                return new Observable((observer) => {
                    return observable.subscribe(observer);
                });
            }
            else if( observable && typeof observable[Symbol.iterator] != "undefined" ){
                return Observable.of( observable );
            }
            else{
                _console().error("Type error. Incorrect argument type. Arguement must be an Observable or Iterable.", observable);
            }

        }
        /**
         * @param instance {Object}
         * @returns {boolean}
         * @static
         */
        static [Symbol.hasInstance](instance) {
            return !!instance && instance.subscribe instanceof Function;
        }
    }

    class Subscription extends Function{

        /**
         * @param fun {Function=}
         */
        constructor(fun){
            if(!(fun instanceof Function)) fun = null;

            Subscription.map = Subscription.map || new WeakMap();
            Subscription.keys = Subscription.keys || {size:0};
            let myid = '_' + Subscription.keys.size;

            //To do this, since the function below only has access to the global scope,
            //we have to have some sort of string-based access to this.unsubscribe.
            //So, we have the string key for the key map, which gives us the object key for the weak map
            //which then gives us this object. The reason for the weak map is so this can be garbage collected.
            //That's important because this has reference to "fun", which can contain all kinds of stuff in it's scope.
            super("return Subscription.map.get(Subscription.keys['"+myid+"']).unsubscribe();");

            Subscription.map.set(Subscription.keys[myid] = {}, this);
            Subscription.keys.size++;

            this[Symbol.for("Subscription.id")] = myid;
            this[Symbol.for("Subscription.cleanup")] = fun;
            this[Symbol.for("Subscription.closed")] = false;
        }

        unsubscribe() {
            if(this.closed) return;
            this[Symbol.for("Subscription.closed")] = true;

            let resp = this[Symbol.for("Subscription.cleanup")] && this[Symbol.for("Subscription.cleanup")]();

            //remove/null all references
            Subscription.map.delete(Subscription.keys[ this[Symbol.for("Subscription.id")] ]);
            Subscription.keys[ this[Symbol.for("Subscription.id")] ] = this[Symbol.for("Subscription.cleanup")] = null;

            return resp;
        }

        get closed(){
            return this[Symbol.for("Subscription.closed")];
        }

        /**
         * Close the subscription if not already closed.
         * Closed subscriptions don't have keys in the keystore nor values in the map
         * @param id {String}
         */
        static close(id){
            if(Subscription.keys[id]){
                /** @type {Subscription} */
                let me = Subscription.map.get(Subscription.keys[id]);
                me && me.unsubscribe();
            }
        }

        /**
         * @param instance {Object}
         * @returns {boolean}
         * @static
         */
        static [Symbol.hasInstance](instance) {
            return !!instance && instance.unsubscribe instanceof Function;
        }
    }

return{Observer:Observer,Observable:Observable,Subscription:Subscription}}));