import React from 'react';

import { BrowserRouter, Switch, Route } from 'react-router-dom';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { UseWalletProvider } from 'use-wallet'
import useStore, { config } from './useStore';
import mapping, { authMappting } from './RouterMapping'
import Layout from './Layout';
import './app.scss'
import { IconViewer } from './components/Icon';
import Docs from './Pages/docs';

// const getTokenSvgInfo = async () => {
// 	try {
// 		let res = await fetch("https://raw.githubusercontent.com/Neon-Blockchain/token-icons/main/tokens.json")
// 		let resJson = await res.json()
// 		return resJson
// 	} catch (err) {
// 		return err
// 	}
// }

function App() {
	const {account} = useStore()

	React.useEffect(() => {
		// fetchJson("https://raw.githubusercontent.com/Neon-Blockchain/token-icons/main/tokens.json").then(response=>{
		// 	if (response) {
		// 		console.log(response)
		// 		// update({tokenIcons: response})
		// 	}
		// })
	}, [])

	const chainId = config.chainId
	const rpcUrl = config.rpc

	// React.useEffect(()=>{
	// 	if (cookie===undefined) setCookie()
	// }, [cookie]) 

	return (

		<UseWalletProvider
			chainId={100}
		>
			<BrowserRouter>
				<Switch>
					<Layout>
						<Route exact path="/icon-viewer" component={IconViewer} />
						{Object.keys(mapping).map((url, k) => (<Route exact key={k} path={url} component={mapping[url]} />))}
						{account===null && Object.keys(authMappting).map((url, k) => (<Route exact key={k} path={url} component={authMappting[url]} />))}
						<Route path="/docs/:lang/:category?/:page?" component={Docs} />
					</Layout>
				</Switch>
				<ToastContainer />
			</BrowserRouter>
		</UseWalletProvider>
	);
}

export default App;
