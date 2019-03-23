import {vdom,patch} from "./superfine"

let CURR;
let UPDATE;
let STATES = {};
let CURR_PATH = "";
let UPDATE_DEBOUNCE = 5;

function diff(a,b) {
    if(a.length !== b.length) return true;
    for(let e = 0; e < a.length; e++) if(a[e] !== b[e]) return true;
}

export let h = (spec,props,...children) => ({spec,props,children:[].concat.apply([],children)})

async function make(component) {
    if(typeof component === "number" || typeof component === "string") {
        return component
    }

    if(typeof component.spec !== "function") {
        return vdom(
            component.spec,
            component.props,
            await Promise.all(
                component.children.map(function(child) {
                    return make(child)
                })
            )
        )
    }

    let key = (component.props||{}).key||0;
    let path = `${CURR_PATH}${component.spec.name}${key}`
    let base = {effects:[],state:[],path};
    let potential = STATES[path]||{};
    let state = {...base,...potential,effectsCount:0,stateCount:0}; 
    STATES[path] = CURR = state;

    function run() {
        for(let key in state.effects) {
            let {func,deps,lastDeps,cb} = state.effects[key];
            state.effects[key].lastDeps = deps;
            if(typeof lastDeps === "undefined" || diff(deps,lastDeps)) {
                if(cb) cb(state.el)
                state.effects[key].cb = func(state.el);
            }
        }
    }

    let tmp = CURR_PATH;
    CURR_PATH = path;
    
    let item = component.spec({...component.props,children: component.children});

    if(item.then) {
        component.spec = (await item).default
        item = component.spec({...component.props,children: component.children});
    }

    CURR_PATH = tmp;

    item.props = item.props||{};

    item.props.oncreate = function onCreate(el) {
        state.el = el;
        setTimeout(run);
    }

    item.props.onupdate = function onupdate(el) {
        state.el = el;
        setTimeout(run);
    }

    item.props.ondestroy = function onDestroy(el) {
        delete STATES[path]
        setTimeout(run);
    }
    
    return vdom(
        item.spec,
        item.props,
        await Promise.all(
            item.children.map(function(child) {
                return make(child)
            })
        )
    )
}

export function render(item, node) {
    return new Promise(resolve => {
        let latest; 

        let render = async function() {
            let vdom = await make(item);
            let next = patch(latest, vdom, node);
            if(typeof latest === "undefined") {
                resolve(next);                
            }
            latest = next;
        }

        let instance;
        UPDATE = function() {
            clearTimeout(instance);
            instance = setTimeout(render, UPDATE_DEBOUNCE);
        }
        
        render();
    })
}


export function state(init) {
    let tmp = CURR;
    let key = CURR.stateCount++;
    let potentialVal = CURR.state[key];
    return [
        typeof potentialVal === "undefined"
            ? typeof init === "function" ? init() : init
            : potentialVal,
        function set(next) {
            STATES[tmp.path].state[key] = next;
            UPDATE();
        }
    ]
}

export function effect(func, deps) {
    if(deps && !Array.isArray(deps)) deps = [deps]
    let key = CURR.effectsCount++;
    CURR.effects[key] = {...(CURR.effects[key]||{}),func,deps}
}
