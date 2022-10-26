import React from "react";
import Icon from "./Icon"

interface CollapseStatus {
	isOpen:			boolean
}

interface CollapseProps {
	header:			any
	children:		any
	isOpen?:		boolean
	onOpen?:		any
}

const Collapse = ({ header, children, isOpen, onOpen }: CollapseProps) => {
	const [status, setStatus] = React.useState<CollapseStatus>({
		isOpen:		isOpen ? true : false
	})

	const open = () => {
		setStatus({isOpen: !status.isOpen})
		if (onOpen && !status.isOpen) onOpen();
	}

	return (
		<div className="panel m-b-2">
			<div className="panel-header flex justify-content-between" onClick={open}>
				{header}
				{status.isOpen ? (<Icon icon="ArrowDown" />) : (<Icon icon="ArrowRight" />)}
			</div>
			{status.isOpen && (<div className="content">{children}</div>)}
		</div>
	)
}

export default Collapse;