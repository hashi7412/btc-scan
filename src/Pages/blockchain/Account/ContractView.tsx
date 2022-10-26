import React from 'react'
import { Link } from "react-router-dom"
import Collapse from '../../../components/Collapse'
import Icon from "../../../components/Icon"
import useStore, { prettyPrint, config, encodeCall, fetchJson, decodeCallData } from '../../../useStore'
import { ethers } from 'ethers'
import { useWallet } from "use-wallet";

type ViewType = 'code' | 'read' | 'write'
interface ContractViewProps {
	data: ContractDetailType
}

interface AbiArgument {
	name: string
	type: string
	value?: string
}

interface SimpleAbiEntry {
	name: string
	inputs: AbiArgument[]
	outputs: AbiArgument[]
	value?: number | string
	err?: boolean
}

interface ContractViewStatus {
	view: ViewType
	reads: SimpleAbiEntry[]
	writes: SimpleAbiEntry[]
}

// const DataType = [
// 	'address', 'string', 'bool', 
// 	'bytes', 'byte1', 'byte2', 'byte3', 'byte4', 'byte5', 'byte6', 'byte7', 'byte8', 'byte9', 'byte10', 'byte11', 'byte12', 'byte13', 'byte14', 'byte15', 'byte16', 'byte17', 'byte18', 'byte19', 'byte20', 'byte21', 'byte22', 'byte23', 'byte24', 'byte25', 'byte26', 'byte27', 'byte28', 'byte29', 'byte30', 'byte31', 'byte32',
// 	'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256',
// 	'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256',

// ]
// const ModifierType = ['view', 'pure', 'payable']

const ContractView = ({ data }: ContractViewProps) => {

	const { showLoading, walletInfo } = useStore()
	const wallet = useWallet();

	const [status, setStatus] = React.useState<ContractViewStatus>({
		view: 'code',
		reads: [],
		writes: []
	})

	const provider = new ethers.providers.JsonRpcProvider(config.rpc);
	const contract = new ethers.Contract(data.address, data.abi, provider);

	const onContractView = (view: ViewType) => {
		setStatus({ ...status, view })
	}

	const prettify = () => {
		const elemCode = document.querySelector<HTMLPreElement>('#code')
		if (elemCode) {
			elemCode.innerHTML = data.sourceCode || ''
			prettyPrint(elemCode)
		}
		const elemAbi = document.querySelector<HTMLPreElement>('#abi')
		if (elemAbi) {
			elemAbi.innerHTML = JSON.stringify(data.abi, null, '  ')
			prettyPrint(elemAbi)
		}
	}

	const detectFunctions = async () => {
		if (data.abi.length > 0 && (status.reads.length + status.writes.length === 0)) {
			const reads = [] as SimpleAbiEntry[]
			const writes = [] as SimpleAbiEntry[]
			for (let abi of data.abi) {
				if (abi.type === "function") {
					const name = abi.name
					const inputs = abi.inputs.map(i => ({ name: i.name, type: i.internalType }))
					const outputs = abi.outputs.map(i => ({ name: i.name, type: i.internalType }))

					if (abi.stateMutability === 'view' || abi.stateMutability === 'pure') {
						reads.push({ name, inputs, outputs })
					} if (abi.stateMutability === 'nonpayable') {
						writes.push({ name, inputs, outputs })
					} else if (abi.stateMutability === 'payable') {
						writes.push({ name, inputs, outputs, value: 0 })
					}
				}
			}
			reads.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
			writes.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
			await readContract(reads)
			setStatus({ ...status, reads, writes })
		}
	}

	const readContract = async (reads: SimpleAbiEntry[]) => {
		const params = [] as RpcRequestType[]
		const iface = new ethers.utils.Interface(data.abi)
		for (let k = 0; k < reads.length; k++) {
			const i = reads[k]
			if (i.inputs.length === 0) params.push(encodeCall(iface, data.address, i.name, [], k))
		}
		if (params.length) {
			showLoading(true)
			try {

				const rows = await fetchJson(config.rpc, params)
				if (rows && Array.isArray(rows) && rows.length === params.length) {
					for (let i of rows) {
						const name = reads[i.id].name
						const value = String(decodeCallData(iface, name, i.result))
						reads[i.id].value = value
					}
				}
			} catch (error) {
				console.log(error)
			}
			showLoading(false)
		}

	}
	const onChangeView = (view: ViewType) => {
		if (status.view === 'code') {
			prettify()
		} else {
			detectFunctions()
		}
	}

	const onChangeArgument = (k: number, n: number, func: string, name: string, type: string, value: string, flag: boolean) => {
		if (flag) {
			let reads = [...status.reads];
			reads[k].inputs[n].value = value;
			setStatus({ ...status, reads });
		} else {
			let writes = [...status.writes];
			writes[k].inputs[n].value = value;
			setStatus({ ...status, writes });
		}
	}

	const readFuncWithoutPara = async (k: number) => {
		showLoading(true);
		try {
			if (status.reads[k].inputs.length !== 0) {
				showLoading(false);
				return;
			}

			if (status.reads[k].outputs[0].value !== undefined) {
				showLoading(false);
				return;
			}

			let reads = status.reads;
			reads[k].err = false;
			const outinputs = await contract[status.reads[k].name]();
			reads[k].outputs[0].value = outinputs;
			setStatus({ ...status, reads });

		} catch (err: any) {
			console.log(err.message);

			let reads = status.reads;
			reads[k].err = true;
			setStatus({ ...status, reads });
		}
		showLoading(false);
	}

	const readFuncWithPara = async (k: number) => {
		showLoading(true);
		try {
			const func = status.reads[k];

			const inputs = [] as any[];
			for (let i of func.inputs) {
				let inputValue: any;

				if (i.value !== undefined) {
					inputValue = i.value;
				}

				inputs.push(inputValue);
			}

			const outinputs = await contract[status.reads[k].name](...inputs);

			let reads = status.reads;
			if (reads[k].outputs.length === 1) {
				reads[k].outputs[0].value = outinputs;
			} else {
				let n = 0;
				for (let i of reads[k].outputs) {
					i.value = outinputs[n++];
				}
			}

			reads[k].err = false;

			setStatus({ ...status, reads });
		} catch (err: any) {
			console.log(err.message);

			let reads = status.reads;
			reads[k].err = true;
			console.log(reads);
			setStatus({ ...status, reads });
		}
		showLoading(false);
	}

	const writeFunction = async (k: number) => {
		try {
			const func = status.writes[k];

			if (wallet.status !== "connected") return;
			const provider = new ethers.providers.Web3Provider(wallet.ethereum);
			const signer = provider.getSigner();

			const inputs = [] as any[];
			for (let i of func.inputs) {
				let inputValue: any;

				if (i.value !== undefined) {
					inputValue = i.value;
				}

				inputs.push(inputValue);
			}

			const contract = new ethers.Contract(data.address, data.abi, signer);
			const tx = await contract[func.name](...inputs);
			await tx.wait();
			console.log(tx);

			let writes = status.writes;
			writes[k].value = tx.hash;
			console.log(writes);
			writes[k].err = false;
			setStatus({ ...status, writes });

			// } else if (wallet.connect()) {
			// }
		} catch (err) {
			console.log(err);

			let writes = status.writes;
			writes[k].err = true;
			console.log(writes);
			setStatus({ ...status, writes });
		}
	}

	React.useEffect(() => onChangeView(status.view), [status.view])

	return (
		<>
			<div className='mb-3 d-middle gap'>
				<button className={`btn btn-${status.view === 'code' ? 'primary' : 'info'}`} onClick={() => onContractView('code')}>Code</button>
				<button className={`btn btn-${status.view === 'read' ? 'primary' : 'info'}`} onClick={() => onContractView('read')}>Read Contract</button>
				<button className={`btn btn-${status.view === 'write' ? 'primary' : 'info'}`} onClick={() => onContractView('write')}>Write Contract</button>
			</div>
			{status.view === 'code' && (
				<>
					<div className='d-middle gap mb-3'>
						<Icon icon="FilledCheck" fill="var(--success)" />
						<b>Contract Source Code Verified</b>
						<span className='gray'>(Exact Match)</span>
					</div>
					<div className='grid-col lh-2 mb-3'>
						<div>
							<div className="col6">
								<div className="grid-col">
									<div>
										<div className='col4'>
											Contract Name :
										</div>
										<div className='col8'>
											<b>{data.name}</b>
										</div>
									</div>
									<div>
										<div className='col4'>
											Compiler Version :
										</div>
										<div className='col8'>
											<b>{data.solc}</b>
										</div>
									</div>
								</div>
							</div>
							<div className="col6">
								<div className="grid-col">
									<div>
										<div className='col4'>
											Optimization Enabled :
										</div>
										<div className='col8'>
											<b>{data.optimized ? 'Yes' : 'No'}</b> with <b>{data.runs}</b> runs
										</div>
									</div>
									<div>
										<div className='col4'>
											Other Settings :
										</div>
										<div className='col8'>
											<b>{data.evmVersion}</b> evmVersion, <b>{data.license}</b> <Link to="/contract-license-types">license</Link>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className='d-middle gap mb-1'>
						<Icon icon="File" />
						<b>Contract Source Code</b>
						<span className='gray'>(Solidity)</span>
					</div>
					<div className='input input-block mb-3 scroll' style={{ maxHeight: 300, overflowY: 'auto', backgroundColor: 'var(--bg-card)' }}>
						<pre id="code" className="prettyprint mono" style={{ border: 'none' }} />
					</div>
					<div className='d-middle gap mb-1'>
						<Icon icon="File" />
						<b>Contract ABI</b>
					</div>
					<div className='input input-block mb-3 scroll' style={{ maxHeight: 300, overflowY: 'auto', backgroundColor: 'var(--bg-card)' }}>
						<pre id="abi" className="prettyprint mono" style={{ border: 'none' }} />
					</div>
					<div className='d-middle gap mb-1'>
						<Icon icon="File" />
						<b>Contract deployed code</b>
					</div>
					<div className='input input-block mono mb-3 scroll' style={{ maxHeight: 200, overflowY: 'auto', wordBreak: 'break-all', backgroundColor: 'var(--bg-card)' }}>
						{data.object}
					</div>
					<div className='d-middle gap mb-1'>
						<Icon icon="File" />
						<b>Deployed ByteCode Sourcemap</b>
					</div>
					<div className='input input-block mono mb-3 scroll' style={{ maxHeight: 100, overflowY: 'auto', wordBreak: 'break-all', backgroundColor: 'var(--bg-card)' }}>
						{data.sourceMap}
					</div>
					<div className='d-middle gap mb-1'>
						<Icon icon="File" />
						<b>Swarm Source</b>
					</div>
					<div className='input input-block mono' style={{ wordBreak: 'break-all' }}>
						{data.swarm}
					</div>
				</>
			)}
			{status.view === 'read' && (
				<>
					{status.reads.map((i, k) => (
						<Collapse
							key={k}
							header={(
								<div className='d-middle gap'>
									{i.inputs.length === 0 ? <Icon icon="Info" className='gray' /> : <Icon icon="Question" className='gray' />}
									<span>{`${k + 1}. ${i.name}`}</span>
									{i.outputs[0].value !== undefined && (
										<div className='gray'>
											<span>: </span>
											<span>{i.outputs.map((item, key) => <span key={key}>{key !== 0 && ", "}{String(item.value)}</span>)}</span>
										</div>
									)}
								</div>
							)}
							onOpen={() => readFuncWithoutPara(k)}
						>
							<div className="panbel-content">
								{i.inputs.map((m, n) => (
									<div key={n} className="mb-1">
										<label className='lh-3'>{m.name} ({m.type})
											<input type="text" className='input input-block' value={m.value || ""} onChange={e => onChangeArgument(k, n, i.name, m.name, m.type, e.target.value, true)} />
										</label>
									</div>
								))}
							</div>
							{i.inputs.length !== 0 && (
								<div className='mb-1'>
									<button className='btn btn-info' onClick={() => readFuncWithPara(k)}>Query</button>
								</div>
							)}
							<div>
								{i.outputs.map((m, n) => (
									<p key={n}>
										{m.value !== undefined ? String(m.value) : ""} {/* {m.name}*/} <i className='gray'>({m.type})</i>
									</p>
								))}
							</div>
							{i.err && (
								<p className="danger mt"> <b>!</b> Transaction error</p>
							)}
						</Collapse>
					))}
				</>
			)}
			{status.view === 'write' && (
				<>
					<div className="mb-1 pr pl">
						<button style={{ textDecoration: "underline", color: "var(--color-link)", fontSize: "1.1em" }} onClick={() => { if (wallet?.status === "connected") wallet?.reset(); else wallet?.connect() }}>{wallet?.status !== "connected" ? "Connect Wallet" : "Disconnect"}</button>
					</div>
					{status.writes.map((i, k) => (
						<Collapse key={k} header={<div className='d-middle gap'>{<Icon icon="PlayCircle" className='gray' />}{k}. {i.name} </div>}>
							<div className="panel-content mb-1">
								{/* {i.value !== undefined && (
									<label className='lh-3'>Transfer Value ({config.symbol})
										<input type="text" className='input input-block' value={i.value || ""} onChange={e => onChangeArgument(k, 0, i.name, '', '', e.target.value, false)} />
									</label>
								)} */}
								{i.inputs.map((m, n) => (
									<div key={n} className="mb-1">
										<label className='lh-3'>{m.name} ({m.type})
											<input type="text" className='input input-block' value={m.value || ""} onChange={e => onChangeArgument(k, n, i.name, m.name, m.type, e.target.value, false)} />
										</label>
									</div>
								))}
							</div>
							<div className='mb-1'>
								<button className='btn btn-primary' onClick={() => writeFunction(k)}>Send Transaction</button>
								{status.writes[k].value && (
									<a className='btn btn-primary ml' href={`${config.mainscan}tx/${status.writes[k].value}`}>View Transaction</a>
								)}
							</div>
							<div>
								{i.outputs.map((m, n) => (
									<span key={n} className="mb-1">
										{m.name} <i>({m.type})</i>
									</span>
								))}
							</div>
							{i.err && (
								<p className="danger mt"> <b>!</b> Transaction error</p>
							)}
						</Collapse>
					))}
				</>
			)}
		</>
	)
}

export default ContractView
