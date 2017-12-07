(function(r,f){if(typeof define=='function'&&define.amd){define([], f)}else if(typeof exports=='object'){module.exports = f()}else{var x = f();r.JsObserver = x.Observer;r.JsObservable = x.Observable;r.JsSubscription = x.Subscription}}(this,function()
{

    /**
     * @returns {Console}
     * @private
     */
    function _console() {
        if (typeof window != "undefined" && window.console)
            return window.console;
        if (typeof self != "undefined" && self.console)
            return self.console;
        if (this.console)
            return this.console;
        if (typeof console != "undefined")
            return console;

        var con = {};
        con.error = con.warn = con.log = function () {};
        return con;
    }

    //Only works on IE9, Chrome 5, FF 4 and above
    if(!Object.create || !Object.defineProperty || !Array.isArray){
        _console().error("Your Javascript version is too old. Upgrade your browser, geezer.");
        throw "Javascript version not supported.";
    }

    {//SimpleMapPolyFill

        /** Map<Object|String, Object>
         * @constructor
         */
        function SimpleMapPolyfill() {
            this.keys = {};
            this.size = 0;
            this.id = "_$$mid" + SimpleMapPolyfill.count++;
        }
        SimpleMapPolyfill.count = 0;
        SimpleMapPolyfill.prototype.get = function (key) {
            if (key instanceof Object) {
                key = key[this.id];
            }
            return this.keys[key + ""];
        };
        SimpleMapPolyfill.prototype.set = function (key, value) {
            if (key instanceof Object) {
                key = key[this.id] = '_' + Math.random().toString(36).substr(2, 9);
            }
            if (!this.has(key) && value !== undefined)
                this.size++;
            this.keys[key + ""] = value;
        };
        SimpleMapPolyfill.prototype.has = function (key) {
            if (key instanceof Object) {
                key = key[this.id];
            }
            return this.keys.hasOwnProperty(key + "");
        };
        SimpleMapPolyfill.prototype.delete = function (key) {
            if (key instanceof Object) {
                key = key[this.id];
            }
            var result = this.has(key);
            delete this.keys[key + ""];
            if (result)
                this.size--;
            return result;
        };
        SimpleMapPolyfill.prototype.clear = function () {
            this.keys = {};
            this.size = 0;
        };
    }//SimpleMapPolyfill

    //Symbol Polyfill for static methods
    if(typeof Symbol == "undefined"){
        Symbol = function Symbol(desc){
            if(this instanceof Symbol)
                throw "Can't instantiate Symbol";
            if(desc) desc = desc + "";
            return {
                _desc : desc,
                toString : Symbol._toString
            };
        };
        Symbol._keymap = {};
        Symbol._toString = function(){
            return "Symbol("+(this._desc||"")+")";
        };
        Symbol.for = function(id){
            if(!Symbol._keymap[id]){
                Symbol._keymap[id] = Symbol(id);
                Symbol._keymap[id]._id = id;
            }
            return Symbol._keymap[id];
        };
        Symbol.keyFor = function (symbol){
            return symbol && symbol._id;
        };
    }

    {//Observer
        /**
         *
         * @param next {function(*)} callback on new stream value
         * @param error {function(Object)} callback on stream error
         * @param complete {function()} callback on completion of stream
         * @constructor
         */
        function Observer(next, error, complete) {
            if (!(next instanceof Function)) throw "Invalid arguments. The 'next' function cannot be null.";

            if(!(this instanceof Observer)){
                return new Observer(next,error,complete);
            }

            if (error && !(error instanceof Function)) {
                _console.error("Invalid error function provided to Observer creation", this, error);
                error = undefined;
            }
            if (complete && !(complete instanceof Function)) {
                _console.error("Invalid complete function provided to Observer creation", this, complete);
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

            Object.defineProperty(this, 'closed', {
                enumerable: true,
                configurable: false,
                set: function(){},
                get: Observer.prototype.isClosed
            });
        }

        /**
         * Is this Observer closed. The big question here, is do we allow non-subscribed Observers to be closed.
         * Which basically means, do we allow Observers without subscriptions.
         * I think it's ok. Subscription is just a cleanup. If you don't have cleanup, its fine.
         * And technically you can't be closed without a subscription.
         * @returns {boolean}
         */
        Observer.prototype.isClosed = function Observer_isClosed() {
            return !!this[Symbol.for("Observer.subscription")] && this[Symbol.for("Observer.subscription")].closed
                || this._isComplete;
        };
        /**
         * Receives the subscription object when `subscribe` is called
         * @param subscription {Subscription}
         */
        Observer.prototype.start = function Observer_start(subscription) {
            if (this[Symbol.for("Observer.subscription")] && !this[Symbol.for("Observer.subscription")].closed) {
                _console().error("Invalid state. Observer is already subscribed", this, this[Symbol.for("Observer.subscription")], subscription);
                throw "Invalid state. Observer is already subscribed";
            }
            if (!subscription || !(subscription.unsubscribe instanceof Function) || subscription.closed) {
                _console().error("Invalid subscription.", this, subscription);
            } else {
                this[Symbol.for("Observer.subscription")] = subscription;
                this._isComplete = false;
            }
        };

        /** @param value {*} */
        Observer.prototype.next = function Observer_next(value) {
            if (this.isClosed()) return;

            return this[Symbol.for("Observer.next")].call(this, value);
        };

        /**  @param errorValue {Object} */
        Observer.prototype.error = function Observer_error(errorValue) {
            var myerror = this[Symbol.for("Observer.error")];
            if (this.isClosed() || !(myerror instanceof Function)) return;

            return myerror.call(this, errorValue);
        };

        Observer.prototype.complete = function Observer_complete() {
            if (this.isClosed) return;

            var mycomplete = this[Symbol.for("Observer.complete")];
            if (mycomplete instanceof Function) {
                var result = mycomplete.call(this);
            }

            var sym = Symbol.for("Observer.subscription");

            this[sym] && this[sym].unsubscribe();
            this[sym] = null;
            this._isComplete = true;

            return result;
        };
        Observer.to = Observer;

        if(Symbol.hasInstance){
            Observer[Symbol.hasInstance] = function(instance){
                return !!instance && instance.next instanceof Function;
            }
        }else{
            Observer["@@hasInstance"] = function(instance){
                return !!instance && instance.next instanceof Function;
            }
        }
    }//Observer

    {//Observable
        /**
         * @param subscriber {function(Observer):(Function|Subscription)}
         * @constructor
         */
        function Observable (subscriber){

            if(!(this instanceof Observable)){
                return new Observable(subscriber);
            }

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
        Observable.prototype.subscribe = function observable_subscribe(observerOrNext, onError, onComplete) {
            if(!observerOrNext)
                return _console().error("Observer subscription attempted, but the arguments are empty", this, observerOrNext);

            if(observerOrNext instanceof Function){
                observerOrNext = new Observer(observerOrNext, onError, onComplete);
            }
            if(!observerOrNext || !(observerOrNext.next instanceof Function))
                return _console().error("Observer subscription attempted, but the argument was not an Observer.", this, observerOrNext);

            /** @type {Observer}*/
            var observer = observerOrNext;

            /** Can be cleanup function or an actual Subscription
             * @type {Function|Subscription}*/
            var cleanup = this[Symbol.for("Observable.subscriber")](observer);
            /** @type {Subscription}*/
            var sub = cleanup && cleanup.unsubscribe instanceof Function ? cleanup : Subscription(cleanup);

            if(observer.start instanceof Function) observer.start(sub);

            return sub;
        };

        /**
         * Accepts an argument list or an array, and creates an Observable
         * which emits those values synchronously when subscribed to
         * @param first {Array|*}
         * @returns {Observable}
         */
        Observable.of = function observable_of(first){
            var items = [];
            items.push.apply(items, arguments);

            if( items.length > 1 || !(first = asArray(first))  ){
                first = items;
            }
            var myClass = this.prototype && this.prototype.subscribe instanceof Function ? this : Observable;

            return new myClass( function (observer) {
                for (var i=0; i<first.length; i++) {
                    observer.next(first[i]);
                }
                (observer.complete instanceof Function) && observer.complete();
            });
        };

            // Converts an observable or iterable to an Observable
        Observable.from = function observable_from(observable){
            var array;
            if(observable && observable.subscribe instanceof Function){
                return new Observable(function(observer){
                    return observable.subscribe(observer);
                });
            }
            else if( array = asArray(observable) ){
                return Observable.of( array );
            }
            else{
                _console().error("Type error. Incorrect argument type. Arguement must be an Observable or Iterable.", observable);
            }

        };

        var ob_hasinst = function observable_instance(instance) {
            return !!instance && instance.subscribe instanceof Function;
        };
        if(Symbol.hasInstance){
            Observable[Symbol.hasInstance] = ob_hasinst;
        }
        else {
            Observable["@@hasInstance"] = ob_hasinst;
        }

    }//Observable

    {//Subscription
        function Subscription(fun){
            if(!(fun instanceof Function)) fun = null;
            if(this instanceof Subscription){
                throw "Oops. Can't instantiate Subscriptions in ES5. Use 'Subscription()' instead."
            }

            Subscription.keys = Subscription.keys || {size:0};
            var result;

            if(Subscription.mode == "callee"){
                //This should basically be everyone in ES5, except random environment in safe-mode
                //No reference to the Subscription is kept
                result = new Function("return arguments.callee.unsubscribe();");
            }
            else if(Subscription.mode == "weakmap"){
                var myid = '_' + Subscription.keys.size;
                Subscription.map = Subscription.map || new WeakMap();

                //To do this, since the function below only has access to the global scope,
                //we have to have some sort of string-based access to this.unsubscribe.
                //So, we have the string key for the key map, which gives us the object key for the weak map
                //which then gives us this object. The reason for the weak map is so this can be garbage collected.
                //That's important because this has reference to "fun", which can contain all kinds of stuff in it's scope.
                result = new Function("return Subscription.map.get(Subscription.keys['"+myid+"']).unsubscribe();");

                Subscription.map.set(Subscription.keys[myid] = {}, this);
                Subscription.keys.size++;

                result[Symbol.for("Subscription.id")] = myid;
            }
            else{
                //Direct call-to-unsubscribe is disabled.
                result = Object.create(Subscription.prototype);
            }

            result[Symbol.for("Subscription.cleanup")] = fun;
            result[Symbol.for("Subscription.closed")] = false;

            Object.defineProperty(result, 'closed', {
                enumerable: true,
                configurable: false,
                get: Subscription.prototype.isClosed,
                set: function(){}
            });
        }

        /**
         * Has unsubscribe been called yet?
         * @returns {boolean}
         */
        Subscription.prototype.isClosed = function subscription_isClosed(){
            return this[Symbol.for("Subscription.closed")];
        };

        Subscription.prototype.unsubscribe = function subscription_unsubscribe(){
            if(this.isClosed()) return;
            this[Symbol.for("Subscription.closed")] = true;

            var resp = this[Symbol.for("Subscription.cleanup")] && this[Symbol.for("Subscription.cleanup")]();

            //remove/null all references
            Subscription.map.delete(Subscription.keys[ this[Symbol.for("Subscription.id")] ]);
            Subscription.keys[ this[Symbol.for("Subscription.id")] ] = this[Symbol.for("Subscription.cleanup")] = null;

            return resp;
        };

        /**
         * Close the subscription if not already closed.
         * Closed subscriptions don't have keys in the keystore nor values in the map
         * @param id {String}
         */
        Subscription.close = function subscription_close(id){
            if(Subscription.mode != "weakmap"){
                _console.warn("A reference to the Subscription instance is not kept unless in weakmap mode. A Subscription can only be closed from a direct reference.");
            }
            //Do it just in case the mode has changed.
            if(Subscription.keys[id]){
                /** @type {Subscription} */
                var me = Subscription.map.get(Subscription.keys[id]);
                me && me.unsubscribe();
            }
        };

        Subscription.mode = "disable";
        if(typeof WeakMap !== "undefined") Subscription.mode = "weakmap";
        (function(){
            try{ Subscription.canCallee = arguments.callee && "callee";}catch(e){}
        })();

        var sub_hasinst = function subscription_instance(instance) {
            return !!instance && instance.unsubscribe instanceof Function;
        };
        if(Symbol.hasInstance){
            Subscription[Symbol.hasInstance] = sub_hasinst;
        }
        else {
            Subscription["@@hasInstance"] = sub_hasinst;
        }
    }//Subscription

    /**
     * Attempt to transform this thing into an array
     * @param thing
     * @returns {*}
     */
    function asArray(thing){
        if(!thing)
            return false;
        if(Array.isArray(thing))
            return thing;
        if(Array.from){
            var array = Array.from(thing);
            if(array.length)
                return array;
        }

        //manual
        var i, result = [];
        if(Symbol.iterator && thing[Symbol.iterator] || thing["@@iterator"]) {
            var it = (thing["@@iterator"] || thing[Symbol.iterator])();
            if(it){
                for(i=it.next(); !i.done; i=it.next()){
                    result.push(i.value);
                }
            }
        }
        else{
            if(thing.length){
                for(i = 0; i < thing.length;i++){
                    result.push(thing[i]);
                }
            }
            else if(thing.size && thing.get instanceof Function){
                for(i = 0; i<thing.size;i++){
                    result.push(thing.get(i));
                }
            }
            if(result.length===0)
                result = null;
        }
        return result;
    }


    return{Observer:Observer,Observable:Observable,Subscription:Subscription}}));