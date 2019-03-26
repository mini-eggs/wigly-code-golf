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

let h = (spec,props,...children) => ({spec,props,children:[].concat.apply([],children)})

let make = async component => {
    if(typeof component === "number" || typeof component === "string") {
        return component
    }

    if(typeof component.spec !== "function") {
        return vdom(
            component.spec,
            component.props,
	    await Promise.all(component.children.map(make))
        )
    }

    let key = (component.props||{}).key||0;
    let path = `${CURR_PATH}${component.spec.name}${key}`
    let base = {effects:[],state:[],path};
    let potential = STATES[path]||{};
    let state = {...base,...potential,effectsCount:0,stateCount:0}; 
    STATES[path] = CURR = state;

    let run = skip => {
        for(let key in state.effects) {
            let {func,deps,lastDeps,cb} = state.effects[key];
            state.effects[key].lastDeps = deps;
            if(typeof lastDeps === "undefined" || diff(deps,lastDeps)) {
                if(cb && cb.call) cb(state.el)
		if(!skip) state.effects[key].cb = func(state.el);
            }
        }
    }

    let tmp = CURR_PATH;
    CURR_PATH = path;
    
    let item = component.spec({...component.props,children: component.children});
    if(item.then) item = (await item).default({...component.props,children: component.children}); // async support

    CURR_PATH = tmp;

    // fix props
    item.props = item.props||{};
    if(!item.props.key) item.props.key = 0;

    item.props.oncreate = el => {
	    state.el = el;
	    setTimeout(run);
    };

    item.props.onupdate = el => {
	    state.el = el;
	    setTimeout(run);
    };

    item.props.ondestroy = el => {
	    delete STATES[path];
	    setTimeout(run, void 0, true);
    };

    return vdom(
        item.spec,
        item.props,
        await Promise.all(item.children.map(make))
    )
}

let render = (item,node) =>
	new Promise(r => {
		let latest;
		let render = async () => {
			let vdom = await make(item);
			let next = patch(latest,vdom,node);
			if(typeof latest === "undefined") r(next);
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
	let key = tmp.stateCount++;
	let potentialVal = tmp.state[key];
	return [
		typeof potentialVal === "undefined"
			? typeof init === "function" ? init() : init
			: potentialVal,
		next => STATES[tmp.path].state[key] = next,UPDATE()
	];
};

let effect = (func,deps) => {
	if(deps && !Array.isArray(deps)) deps = [deps]
	let key = CURR.effectsCount++;
	CURR.effects[key] = {...(CURR.effects[key]||{}),func,deps}
};

export {h,render,state,effect};
