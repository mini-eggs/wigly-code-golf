import {h,render,state,effect} from "./wigly"

let Async = () => import("./async")

window.React = {
    createElement: h
}

let Counter = ({key}) => {
    let [count,setCount] = state(0);
    function handleClick() {setCount(count+1)}
    effect(()=>console.log("should run every time " + key))
    return <div><span>{count}</span><button onclick={handleClick}>inc</button></div>
}

function App(){
    let [msg, set] = state("here we go")
    effect((el)=>{console.log("effect", el)}, [])
    effect(()=>{console.log("effect2");return ()=>console.log("effect cb")}, [msg])
    return  (
            <main>
                <Async/>
                <input autofocus={true} oninput={function(event) {
                    set(event.target.value);
                }} />
                <div>{msg}</div>
                {Array.from({length:3}).map((_,key)=> {
                    return <Counter key={key} />
                })}
            </main>
            )
}

render(<App/>, document.body);
