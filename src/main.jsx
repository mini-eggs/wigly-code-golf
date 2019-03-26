// @jsx h
import "@babel/polyfill"
import {h,render,state,effect} from "./wigly"

let TIME = 500;

let Cond = ({children: [test,success,failure]}) => 
	test() ? success() : failure ();

let Timer = ({key,children}) => {
	let [time,set] = state(0);
	effect(() => {setTimeout(() => set(time + 1), TIME * 2)}, [time]);
	return <div>{children} {time}</div>;};

let App = () => {
	let [display,set] = state(false);
	effect(() => {setTimeout(() => set(!display), TIME);}, [display]);
	return display ?
		<div>
			<h1>hi</h1>
			<Timer>Time:</Timer>
		</div>
		: 
		<div>
			<Timer>Time:</Timer>
			<h1>hi</h1>
		</div>;
};

render(<App/>, document.body);
