import {vdom,patch} from "./superfine"

let CURR;
let UPDATE;
let STATES = {};
let CURR_PATH = "";
let UPDATE_DEBOUNCE = 5;

let diff = (a,b) => {
    if(a.length !== b.length) return true;
    for(let e = 0; e < a.length; e++) if(a[e] !== b[e]) return true;
}

let h = (a,b,...c) => ({a,b,c:[].concat.apply([],c)})

let make = async component => {
    // leaf
    if(typeof component === "number" || typeof component === "string") {
        return component
    }

    // basic
    if(!component.a.call) {
	return vdom(component.a,component.b,await Promise.all(component.c.map(make)));
    }

    // state book keeping
    let key = (component.b||{}).key||0;
    let path = `${CURR_PATH}${component.a.name}${key}`
    let base = {effects:[],state:[],path};
    let potential = STATES[path]||{};
    let state = {...base,...potential,count:0,count:0}; 
    STATES[path] = CURR = state;

    let run = skip => {
        for(let key in state.effects) {
            let {func,deps,lastDeps,cb} = state.effects[key];
            state.effects[key].lastDeps = deps;
	    if(lastDeps === void 0 || diff(deps,lastDeps)) {
                if(cb && cb.call) cb(state.el)
		if(!skip) state.effects[key].cb = func(state.el);
            }
        }
    }

    let tmp = CURR_PATH;
    CURR_PATH = path;
    
    // call user function
    let p = {...component.b,children:component.c};
    let item = component.a(p);
    if(item.then) item = (await item).default(p); // async support

    CURR_PATH = tmp;

    // fix props
    item.b = item.b||{};
    if(!item.b.key) item.b.key = 0;

    // superfine lifecycles
    // this is where we care about calling
    // effects
    item.b.oncreate = el => {
	    state.el = el;
	    setTimeout(run);
    };
    item.b.onupdate = el => {
	    state.el = el;
	    setTimeout(run);
    };
    item.b.ondestroy = el => {
	    delete STATES[path];
	    setTimeout(run, void 0, true);
    };

    return vdom(item.a,item.b,await Promise.all(item.c.map(make)))
}

let render = (item,node) =>
	new Promise(r => {
		let latest;
		let render = async () => {
			let vdom = await make(item);
			let next = patch(latest,vdom,node);
			if(!latest) r(next);
			latest = next;
		}

		let instance;
		UPDATE = () => {
			clearTimeout(instance);
			instance = setTimeout(render,UPDATE_DEBOUNCE);
		}

		render();
	});

let state = init => {
	let tmp = CURR;
	let key = tmp.count++;
	let val = tmp.state[key];
	return [
		val === void 0
			? init.call ? init() : init
			: val,
		next => STATES[tmp.path].state[key] = next,UPDATE()
	];
};

let effect = (func,deps) => {
	if(deps && !Array.isArray(deps)) deps = [deps]
	let key = CURR.count++;
	CURR.effects[key] = {...(CURR.effects[key]||{}),func,deps}
};

export {h,render,state,effect};
